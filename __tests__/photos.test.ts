import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { photoService } from '@/lib/services/photoService'
import { storageService } from '@/lib/services/storageService'
import ImageUtils from '@/lib/services/imageUtils'
import { ScopeItemPhoto, PhotoType, AnnotationType } from '@/lib/types/photo'

// Mock Supabase client
const mockSupabase = vi.hoisted(() => {
  const mock: Record<string, any> = {}
  const chainMethods = [
    'from', 'select', 'eq', 'insert', 'update', 'delete',
    'order', 'limit', 'in', 'gte', 'lte', 'or'
  ]
  for (const method of chainMethods) {
    mock[method] = vi.fn(() => mock)
  }
  mock.single = vi.fn()
  mock.rpc = vi.fn()
  mock.storage = {
    from: vi.fn(() => ({
      upload: vi.fn(),
      createSignedUrl: vi.fn(),
      getPublicUrl: vi.fn(),
      remove: vi.fn(),
      list: vi.fn()
    }))
  }
  mock.auth = {
    getUser: vi.fn()
  }
  return mock
})

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabase
}))

// Mock DOM APIs for image processing
Object.defineProperty(window, 'createImageBitmap', {
  writable: true,
  value: vi.fn(() => Promise.resolve({
    width: 800,
    height: 600,
    close: vi.fn()
  }))
})

Object.defineProperty(global, 'document', {
  writable: true,
  value: {
    createElement: vi.fn(() => ({
      width: 800,
      height: 600,
      getContext: vi.fn(() => ({
        drawImage: vi.fn(),
        getImageData: vi.fn(() => ({
          data: new Uint8ClampedArray(800 * 600 * 4)
        }))
      })),
      toBlob: vi.fn((callback) => {
        callback(new Blob(['test'], { type: 'image/jpeg' }))
      }),
      toDataURL: vi.fn(() => 'data:image/webp;base64,test')
    }))
  }
})

Object.defineProperty(global, 'Image', {
  writable: true,
  value: class {
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    naturalWidth = 800
    naturalHeight = 600
    // Fire onload asynchronously when src is assigned, like a real image
    set src(_value: string) {
      setTimeout(() => this.onload?.(), 0)
    }
  }
})

Object.defineProperty(global, 'URL', {
  writable: true,
  value: {
    createObjectURL: vi.fn(() => 'blob:test'),
    revokeObjectURL: vi.fn()
  }
})

Object.defineProperty(global, 'crypto', {
  writable: true,
  value: {
    subtle: {
      digest: vi.fn(() => Promise.resolve(new ArrayBuffer(32)))
    }
  }
})

describe('Photo Services', () => {
  const mockPhoto: ScopeItemPhoto = {
    id: 'photo123',
    scope_item_id: 'item123',
    user_id: 'user123',
    file_name: 'test.jpg',
    file_path: 'user123/job456/item789/test.jpg',
    file_size: 1000000,
    mime_type: 'image/jpeg',
    file_hash: 'hash123',
    photo_type: 'progress' as PhotoType,
    is_before_after_pair: false,
    width: 800,
    height: 600,
    aspect_ratio: 1.33,
    dominant_color: '#FF0000',
    is_primary: false,
    is_public: false,
    sort_order: 0,
    uploaded_at: '2024-01-01T00:00:00Z',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }

  const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })

  beforeEach(() => {
    vi.clearAllMocks()

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user123' } }
    })

    // Default: chained .single() resolves the scope item lookup that
    // uploadPhoto performs. Individual tests queue overrides with
    // mockResolvedValueOnce where a different row is expected.
    mockSupabase.single.mockResolvedValue({
      data: { budget_versions: { job_id: 'job456' } },
      error: null
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('StorageService', () => {
    it('should validate file correctly', () => {
      const validFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const result = storageService.validateFile(validFile)
      expect(result.isValid).toBe(true)
    })

    it('should reject invalid file type', () => {
      const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' })
      const result = storageService.validateFile(invalidFile)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('File type text/plain is not allowed')
    })

    it('should reject oversized file', () => {
      const oversizedFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' })
      const result = storageService.validateFile(oversizedFile)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('exceeds maximum allowed size')
    })

    it('should generate correct file path', () => {
      const path = storageService.generateFilePath('user123', 'job456', 'item789', 'photo.jpg')
      expect(path).toMatch(/^user123\/job456\/item789\/\d+_photo\.jpg$/)
    })

    it('should extract file info from path', () => {
      const path = 'user123/job456/item789/1234567890_photo.jpg'
      const info = storageService.getFileInfo(path)
      expect(info).toEqual({
        userId: 'user123',
        jobId: 'job456',
        scopeItemId: 'item789',
        fileName: '1234567890_photo.jpg',
        timestamp: '1234567890'
      })
    })
  })

  describe('ImageUtils', () => {
    it('should calculate dimensions maintaining aspect ratio', () => {
      const result = ImageUtils.calculateDimensions(1600, 1200, 800, 600)
      expect(result).toEqual({ width: 800, height: 600 })
    })

    it('should handle portrait images', () => {
      const result = ImageUtils.calculateDimensions(600, 800, 800, 600)
      expect(result).toEqual({ width: 450, height: 600 })
    })

    it('should not upscale small images', () => {
      const result = ImageUtils.calculateDimensions(200, 150, 800, 600)
      expect(result).toEqual({ width: 200, height: 150 })
    })

    it('should validate image file successfully', async () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const result = await ImageUtils.validateImageFile(file)
      expect(result.isValid).toBe(true)
    })

    it('should reject non-image files', async () => {
      const file = new File(['test'], 'test.txt', { type: 'text/plain' })
      const result = await ImageUtils.validateImageFile(file)
      expect(result.isValid).toBe(false)
    })

    it('should format file size correctly', () => {
      expect(ImageUtils.formatFileSize(0)).toBe('0 Bytes')
      expect(ImageUtils.formatFileSize(1024)).toBe('1 KB')
      expect(ImageUtils.formatFileSize(1024 * 1024)).toBe('1 MB')
      expect(ImageUtils.formatFileSize(1536)).toBe('1.5 KB')
    })

    it('should generate file hash', async () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const hash = await ImageUtils.generateFileHash(file)
      expect(hash).toBeDefined()
      expect(typeof hash).toBe('string')
    })
  })

  describe('PhotoService', () => {
    it('should upload photo successfully', async () => {
      vi.spyOn(storageService, 'uploadFile').mockResolvedValue({
        data: { path: 'test/path' },
        error: null
      })

      // First .single(): scope item lookup, second: inserted photo row
      mockSupabase.single
        .mockResolvedValueOnce({
          data: { budget_versions: { job_id: 'job456' } },
          error: null
        })
        .mockResolvedValueOnce({ data: mockPhoto, error: null })

      const result = await photoService.uploadPhoto({
        file: mockFile,
        scope_item_id: 'item123'
      })

      expect(result.success).toBe(true)
      expect(result.photo).toEqual(mockPhoto)
    })

    it('should handle upload failure', async () => {
      vi.spyOn(storageService, 'uploadFile').mockResolvedValue({
        data: null,
        error: { name: 'UploadError', message: 'Upload failed', code: 'UPLOAD_FAILED' }
      })

      const result = await photoService.uploadPhoto({
        file: mockFile,
        scope_item_id: 'item123'
      })

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should get scope item photos', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: [mockPhoto],
        error: null
      })

      vi.spyOn(storageService, 'getSignedUrl').mockResolvedValue({
        url: 'https://example.com/photo.jpg',
        error: null
      })

      const photos = await photoService.getScopeItemPhotos('item123')
      expect(photos).toEqual([
        { ...mockPhoto, signed_url: 'https://example.com/photo.jpg' }
      ])
      expect(photos[0].signed_url).toBe('https://example.com/photo.jpg')
    })

    it('should set primary photo', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: null
      })

      const result = await photoService.setPrimaryPhoto('photo123')
      expect(result).toBe(true)
      expect(mockSupabase.rpc).toHaveBeenCalledWith('set_primary_photo', {
        p_photo_id: 'photo123'
      })
    })

    it('should pair before/after photos', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: null
      })

      const result = await photoService.pairBeforeAfterPhotos('photo1', 'photo2')
      expect(result).toBe(true)
      expect(mockSupabase.rpc).toHaveBeenCalledWith('pair_before_after_photos', {
        p_before_photo_id: 'photo1',
        p_after_photo_id: 'photo2'
      })
    })

    it('should delete photo', async () => {
      // getPhoto() lookup resolves the photo row
      mockSupabase.single.mockResolvedValueOnce({
        data: mockPhoto,
        error: null
      })

      vi.spyOn(storageService, 'getSignedUrl').mockResolvedValue({
        url: 'https://example.com/photo.jpg',
        error: null
      })

      const deleteFileSpy = vi.spyOn(storageService, 'deleteFile').mockResolvedValue({
        success: true,
        error: null
      })

      const result = await photoService.deletePhoto('photo123')
      expect(result).toBe(true)
      expect(deleteFileSpy).toHaveBeenCalledWith(mockPhoto.file_path)
      expect(mockSupabase.delete).toHaveBeenCalled()
    })

    it('should update photo metadata', async () => {
      const updates = { title: 'New Title' }
      const updatedPhoto = { ...mockPhoto, ...updates }

      mockSupabase.single.mockResolvedValueOnce({
        data: updatedPhoto,
        error: null
      })

      const result = await photoService.updatePhoto('photo123', updates)
      expect(result).toEqual(updatedPhoto)
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'New Title' })
      )
    })

    it('should get job photo stats', async () => {
      const mockStats = {
        total_photos: 10,
        before_photos: 2,
        after_photos: 2,
        progress_photos: 6,
        completion_photos: 0,
        issue_photos: 0,
        reference_photos: 0,
        primary_photos: 1,
        public_photos: 3,
        before_after_pairs: 2,
        total_file_size: 10000000,
        average_file_size: 1000000
      }

      mockSupabase.rpc.mockResolvedValue({
        data: [mockStats],
        error: null
      })

      const stats = await photoService.getJobPhotoStats('job123')
      expect(stats).toEqual(mockStats)
    })
  })

  describe('Photo Types and Interfaces', () => {
    it('should have correct photo types', () => {
      const photoTypes: PhotoType[] = ['progress', 'before', 'after', 'completion', 'issue', 'reference']
      expect(photoTypes).toHaveLength(6)
    })

    it('should have correct annotation types', () => {
      const annotationTypes: AnnotationType[] = ['arrow', 'circle', 'rectangle', 'text', 'measurement', 'pin']
      expect(annotationTypes).toHaveLength(6)
    })

    it('should validate photo interface structure', () => {
      const photo: ScopeItemPhoto = {
        id: 'test',
        scope_item_id: 'test',
        user_id: 'test',
        file_name: 'test.jpg',
        file_path: 'test/path',
        file_size: 1000,
        mime_type: 'image/jpeg',
        file_hash: 'hash',
        photo_type: 'progress',
        is_before_after_pair: false,
        is_primary: false,
        is_public: false,
        sort_order: 0,
        uploaded_at: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      expect(photo.id).toBe('test')
      expect(photo.photo_type).toBe('progress')
      expect(photo.is_primary).toBe(false)
    })
  })

  describe('Error Handling', () => {
    it('should handle storage service errors', async () => {
      vi.spyOn(storageService, 'uploadFile').mockRejectedValue(new Error('Storage error'))

      const result = await photoService.uploadPhoto({
        file: mockFile,
        scope_item_id: 'item123'
      })

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should handle database errors', async () => {
      vi.spyOn(storageService, 'uploadFile').mockResolvedValue({
        data: { path: 'test' },
        error: null
      })

      // uploadPhoto cleans up the stored file when the insert fails
      const deleteFileSpy = vi.spyOn(storageService, 'deleteFile').mockResolvedValue({
        success: true,
        error: null
      })

      // First .single(): scope item lookup, second: failed insert
      mockSupabase.single
        .mockResolvedValueOnce({
          data: { budget_versions: { job_id: 'job456' } },
          error: null
        })
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'Database error' }
        })

      const result = await photoService.uploadPhoto({
        file: mockFile,
        scope_item_id: 'item123'
      })

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(deleteFileSpy).toHaveBeenCalled()
    })
  })

  describe('Integration Tests', () => {
    it('should handle complete photo upload workflow', async () => {
      // Mock successful file validation
      vi.spyOn(ImageUtils, 'validateImageFile').mockResolvedValue({
        isValid: true,
        metadata: {
          width: 800,
          height: 600,
          aspectRatio: 1.33,
          mimeType: 'image/jpeg',
          hasAlpha: false
        }
      })

      // Mock successful image processing
      vi.spyOn(ImageUtils, 'processImage').mockResolvedValue({
        original: mockFile,
        optimized: mockFile,
        thumbnail: mockFile,
        metadata: {
          width: 800,
          height: 600,
          aspectRatio: 1.33,
          fileSize: 500000,
          mimeType: 'image/jpeg',
          hasAlpha: false
        }
      })

      // Mock successful storage upload
      vi.spyOn(storageService, 'uploadFile').mockResolvedValue({
        data: { path: 'user/job/item/photo.jpg' },
        error: null
      })

      // First .single(): scope item lookup, second: inserted photo row
      mockSupabase.single
        .mockResolvedValueOnce({
          data: { budget_versions: { job_id: 'job456' } },
          error: null
        })
        .mockResolvedValueOnce({
          data: { ...mockPhoto, title: 'Test Photo' },
          error: null
        })

      const result = await photoService.uploadPhoto({
        file: mockFile,
        scope_item_id: 'item123',
        title: 'Test Photo'
      })

      expect(result.success).toBe(true)
      expect(result.photo?.title).toBe('Test Photo')
    })

    it('should handle batch photo operations', async () => {
      // Every getPhoto() lookup inside deletePhoto resolves a photo row
      mockSupabase.single.mockResolvedValue({
        data: mockPhoto,
        error: null
      })

      vi.spyOn(storageService, 'getSignedUrl').mockResolvedValue({
        url: 'https://example.com/photo.jpg',
        error: null
      })

      const deleteFileSpy = vi.spyOn(storageService, 'deleteFile').mockResolvedValue({
        success: true,
        error: null
      })

      const results = await photoService.batchDeletePhotos(['photo123', 'photo2'])
      expect(results.success).toBe(2)
      expect(results.failed).toHaveLength(0)
      expect(deleteFileSpy).toHaveBeenCalledTimes(2)
    })
  })
})
