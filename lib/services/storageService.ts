import { createClient } from '@/lib/supabase/client'
import { FileValidationOptions, FileValidationResult, PhotoError } from '@/lib/types/photo'

export class StorageService {
  private supabase = createClient()
  private readonly BUCKET_NAME = 'scope-item-photos'
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
  private readonly ALLOWED_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif'
  ]

  /**
   * Upload a file to Supabase Storage
   */
  async uploadFile(
    path: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<{ data: { path: string } | null; error: PhotoError | null }> {
    try {
      // Validate file before upload
      const validation = this.validateFile(file)
      if (!validation.isValid) {
        return {
          data: null,
          error: {
            name: 'ValidationError',
            message: validation.error || 'File validation failed',
            code: 'VALIDATION_ERROR'
          }
        }
      }

      const { data, error } = await this.supabase.storage
        .from(this.BUCKET_NAME)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
          onUploadProgress: (progress) => {
            if (onProgress) {
              const percentage = (progress.loadedBytes / progress.totalBytes) * 100
              onProgress(Math.round(percentage))
            }
          }
        })

      if (error) {
        const photoError: PhotoError = {
          name: 'UploadError',
          message: error.message,
          code: 'UPLOAD_FAILED',
          details: error
        }
        return { data: null, error: photoError }
      }

      return { data, error: null }
    } catch (error) {
      const photoError: PhotoError = {
        name: 'StorageError',
        message: error instanceof Error ? error.message : 'Unknown storage error',
        code: 'STORAGE_ERROR',
        details: error
      }
      return { data: null, error: photoError }
    }
  }

  /**
   * Generate a signed URL for file access
   */
  async getSignedUrl(path: string, expiresIn: number = 3600): Promise<{ url: string | null; error: PhotoError | null }> {
    try {
      const { data, error } = await this.supabase.storage
        .from(this.BUCKET_NAME)
        .createSignedUrl(path, expiresIn)

      if (error) {
        const photoError: PhotoError = {
          name: 'SignedUrlError',
          message: error.message,
          code: 'STORAGE_ERROR',
          details: error
        }
        return { url: null, error: photoError }
      }

      return { url: data.signedUrl, error: null }
    } catch (error) {
      const photoError: PhotoError = {
        name: 'StorageError',
        message: error instanceof Error ? error.message : 'Failed to generate signed URL',
        code: 'STORAGE_ERROR',
        details: error
      }
      return { url: null, error: photoError }
    }
  }

  /**
   * Get public URL (if bucket is public)
   */
  async getPublicUrl(path: string): Promise<{ url: string | null; error: PhotoError | null }> {
    try {
      const { data } = this.supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(path)

      return { url: data.publicUrl, error: null }
    } catch (error) {
      const photoError: PhotoError = {
        name: 'StorageError',
        message: error instanceof Error ? error.message : 'Failed to get public URL',
        code: 'STORAGE_ERROR',
        details: error
      }
      return { url: null, error: photoError }
    }
  }

  /**
   * Delete a file from storage
   */
  async deleteFile(path: string): Promise<{ success: boolean; error: PhotoError | null }> {
    try {
      const { error } = await this.supabase.storage
        .from(this.BUCKET_NAME)
        .remove([path])

      if (error) {
        const photoError: PhotoError = {
          name: 'DeleteError',
          message: error.message,
          code: 'STORAGE_ERROR',
          details: error
        }
        return { success: false, error: photoError }
      }

      return { success: true, error: null }
    } catch (error) {
      const photoError: PhotoError = {
        name: 'StorageError',
        message: error instanceof Error ? error.message : 'Failed to delete file',
        code: 'STORAGE_ERROR',
        details: error
      }
      return { success: false, error: photoError }
    }
  }

  /**
   * List files in a directory
   */
  async listFiles(path?: string): Promise<{ files: any[] | null; error: PhotoError | null }> {
    try {
      const { data, error } = await this.supabase.storage
        .from(this.BUCKET_NAME)
        .list(path)

      if (error) {
        const photoError: PhotoError = {
          name: 'ListError',
          message: error.message,
          code: 'STORAGE_ERROR',
          details: error
        }
        return { files: null, error: photoError }
      }

      return { files: data, error: null }
    } catch (error) {
      const photoError: PhotoError = {
        name: 'StorageError',
        message: error instanceof Error ? error.message : 'Failed to list files',
        code: 'STORAGE_ERROR',
        details: error
      }
      return { files: null, error: photoError }
    }
  }

  /**
   * Check if file exists
   */
  async fileExists(path: string): Promise<{ exists: boolean; error: PhotoError | null }> {
    try {
      const { data, error } = await this.supabase.storage
        .from(this.BUCKET_NAME)
        .list(path.split('/').slice(0, -1).join('/'))

      if (error) {
        const photoError: PhotoError = {
          name: 'CheckError',
          message: error.message,
          code: 'STORAGE_ERROR',
          details: error
        }
        return { exists: false, error: photoError }
      }

      const fileName = path.split('/').pop()
      const exists = data?.some(file => file.name === fileName) || false

      return { exists, error: null }
    } catch (error) {
      const photoError: PhotoError = {
        name: 'StorageError',
        message: error instanceof Error ? error.message : 'Failed to check file existence',
        code: 'STORAGE_ERROR',
        details: error
      }
      return { exists: false, error: photoError }
    }
  }

  /**
   * Generate unique file path
   */
  generateFilePath(userId: string, jobId: string, scopeItemId: string, fileName: string): string {
    const timestamp = Date.now()
    const fileExtension = fileName.split('.').pop()
    const baseName = fileName.split('.').slice(0, -1).join('.')

    // Clean the filename to remove special characters
    const cleanBaseName = baseName.replace(/[^a-zA-Z0-9-_]/g, '_')

    return `${userId}/${jobId}/${scopeItemId}/${timestamp}_${cleanBaseName}.${fileExtension}`
  }

  /**
   * Get file info from path
   */
  getFileInfo(path: string) {
    const parts = path.split('/')
    return {
      userId: parts[0],
      jobId: parts[1],
      scopeItemId: parts[2],
      fileName: parts.slice(3).join('/'),
      timestamp: parts[3]?.split('_')[0]
    }
  }

  /**
   * Validate file before upload
   */
  validateFile(file: File, options?: FileValidationOptions): FileValidationResult {
    const warnings: string[] = []

    // Use provided options or defaults
    const maxSize = options?.maxSize || this.MAX_FILE_SIZE
    const allowedTypes = options?.allowedTypes || this.ALLOWED_TYPES
    const minWidth = options?.minWidth
    const minHeight = options?.minHeight
    const maxWidth = options?.maxWidth
    const maxHeight = options?.maxHeight

    // Check file size
    if (file.size > maxSize) {
      return {
        isValid: false,
        error: `File size ${(file.size / 1024 / 1024).toFixed(1)}MB exceeds maximum allowed size of ${(maxSize / 1024 / 1024).toFixed(1)}MB`
      }
    }

    // Check file type
    if (!allowedTypes.includes(file.type)) {
      return {
        isValid: false,
        error: `File type ${file.type} is not allowed. Allowed types: ${allowedTypes.join(', ')}`
      }
    }

    // Add warnings for large files
    if (file.size > 5 * 1024 * 1024) { // 5MB
      warnings.push('Large file detected. Consider compressing the image for faster upload.')
    }

    return {
      isValid: true,
      warnings: warnings.length > 0 ? warnings : undefined
    }
  }

  /**
   * Get file extension from MIME type
   */
  getExtensionFromMimeType(mimeType: string): string {
    const extensions: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/heic': '.heic',
      'image/heif': '.heif'
    }
    return extensions[mimeType] || '.jpg'
  }

  /**
   * Get MIME type from file extension
   */
  getMimeTypeFromExtension(extension: string): string {
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.heic': 'image/heic',
      '.heif': 'image/heif'
    }
    return mimeTypes[extension.toLowerCase()] || 'image/jpeg'
  }

  /**
   * Clean up orphaned files
   */
  async cleanupOrphanedFiles(validPaths: string[]): Promise<{ deleted: number; error: PhotoError | null }> {
    try {
      const { files: allFiles, error } = await this.listFiles()

      if (error || !allFiles) {
        return { deleted: 0, error }
      }

      const filePaths = allFiles.map(file => file.id || file.name)
      const orphanedPaths = filePaths.filter(path => !validPaths.includes(path))

      if (orphanedPaths.length === 0) {
        return { deleted: 0, error: null }
      }

      const { error: deleteError } = await this.supabase.storage
        .from(this.BUCKET_NAME)
        .remove(orphanedPaths)

      if (deleteError) {
        const photoError: PhotoError = {
          name: 'CleanupError',
          message: deleteError.message,
          code: 'STORAGE_ERROR',
          details: deleteError
        }
        return { deleted: 0, error: photoError }
      }

      return { deleted: orphanedPaths.length, error: null }
    } catch (error) {
      const photoError: PhotoError = {
        name: 'StorageError',
        message: error instanceof Error ? error.message : 'Failed to cleanup orphaned files',
        code: 'STORAGE_ERROR',
        details: error
      }
      return { deleted: 0, error: photoError }
    }
  }

  /**
   * Get storage usage statistics
   */
  async getStorageStats(): Promise<{
    totalFiles: number
    totalSize: number
    averageSize: number
    error: PhotoError | null
  }> {
    try {
      const { data, error } = await this.supabase.rpc('photo_storage_stats')

      if (error) {
        const photoError: PhotoError = {
          name: 'StatsError',
          message: error.message,
          code: 'STORAGE_ERROR',
          details: error
        }
        return { totalFiles: 0, totalSize: 0, averageSize: 0, error: photoError }
      }

      const stats = data[0]
      return {
        totalFiles: stats.total_files || 0,
        totalSize: stats.total_size_mb * 1024 * 1024, // Convert MB to bytes
        averageSize: stats.avg_size_kb * 1024, // Convert KB to bytes
        error: null
      }
    } catch (error) {
      const photoError: PhotoError = {
        name: 'StorageError',
        message: error instanceof Error ? error.message : 'Failed to get storage stats',
        code: 'STORAGE_ERROR',
        details: error
      }
      return { totalFiles: 0, totalSize: 0, averageSize: 0, error: photoError }
    }
  }
}

// Singleton instance
export const storageService = new StorageService()