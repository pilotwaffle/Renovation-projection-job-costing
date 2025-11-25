import { createClient } from '@/lib/supabase/client'
import { storageService } from './storageService'
import ImageUtils from './imageUtils'
import {
  ScopeItemPhoto,
  PhotoAnnotation,
  PhotoUploadOptions,
  PhotoUploadResult,
  PhotoError,
  PhotoStats,
  SetPrimaryPhotoParams,
  PairBeforeAfterParams,
  GetScopeItemPhotosParams,
  GetJobPhotoStatsParams,
  PhotoType,
  AnnotationType
} from '@/lib/types/photo'

export class PhotoService {
  private supabase = createClient()

  /**
   * Upload photo with metadata
   */
  async uploadPhoto(options: PhotoUploadOptions): Promise<PhotoUploadResult> {
    const {
      file,
      scope_item_id,
      title,
      description,
      photo_type = 'progress',
      is_public = false,
      onProgress
    } = options

    try {
      // Validate and get image metadata
      const imageValidation = await ImageUtils.validateImageFile(file)
      if (!imageValidation.isValid) {
        return {
          success: false,
          error: imageValidation.error || 'Invalid image file'
        }
      }

      // Process image (optimize and generate thumbnail)
      const processedImage = await ImageUtils.processImage(file, {
        maxWidth: 1920,
        maxHeight: 1080,
        quality: 0.85,
        generateThumbnails: true,
        thumbnailSize: 300
      })

      // Generate file hash for deduplication
      const fileHash = await ImageUtils.generateFileHash(file)

      // Extract dominant color
      const dominantColor = await ImageUtils.extractDominantColor(file)

      // Get EXIF data (including GPS coordinates)
      const exifData = await ImageUtils.getExifData(file)

      // Get user info and job info for path generation
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) {
        throw new Error('User not authenticated')
      }

      // Get job ID from scope item
      const { data: scopeItem, error: scopeError } = await this.supabase
        .from('scope_items')
        .select('budget_versions(job_id)')
        .eq('id', scope_item_id)
        .single()

      if (scopeError || !scopeItem) {
        throw new Error('Scope item not found')
      }

      const jobId = scopeItem.budget_versions?.job_id

      // Generate storage path
      const filePath = storageService.generateFilePath(
        user.id,
        jobId,
        scope_item_id,
        file.name
      )

      // Upload to storage with progress tracking
      const { data: uploadData, error: uploadError } = await storageService.uploadFile(
        filePath,
        processedImage.optimized || processedImage.original,
        onProgress
      )

      if (uploadError || !uploadData) {
        throw uploadError || new Error('Upload failed')
      }

      // Create database record
      const photoData = {
        scope_item_id,
        user_id: user.id,
        file_name: file.name,
        file_path: filePath,
        file_size: processedImage.optimized?.size || file.size,
        mime_type: processedImage.metadata.mimeType,
        file_hash: fileHash,
        title,
        description,
        photo_type,
        is_public,
        width: processedImage.metadata.width,
        height: processedImage.metadata.height,
        aspect_ratio: processedImage.metadata.aspectRatio,
        dominant_color: dominantColor,
        latitude: exifData.location?.latitude,
        longitude: exifData.location?.longitude,
        taken_at: exifData.takenAt?.toISOString()
      }

      const { data: photo, error: photoError } = await this.supabase
        .from('scope_item_photos')
        .insert(photoData)
        .select()
        .single()

      if (photoError || !photo) {
        // Clean up uploaded file if database insert fails
        await storageService.deleteFile(filePath)
        throw photoError || new Error('Failed to create photo record')
      }

      return {
        success: true,
        photo
      }
    } catch (error) {
      const photoError: PhotoError = {
        name: 'UploadError',
        message: error instanceof Error ? error.message : 'Photo upload failed',
        code: 'UPLOAD_FAILED',
        details: error
      }
      return {
        success: false,
        error: photoError.message
      }
    }
  }

  /**
   * Upload multiple photos
   */
  async uploadMultiplePhotos(
    options: PhotoUploadOptions[],
    onProgress?: (fileIndex: number, fileProgress: number) => void
  ): Promise<PhotoUploadResult[]> {
    const results: PhotoUploadResult[] = []

    for (let i = 0; i < options.length; i++) {
      const option = options[i]

      const result = await this.uploadPhoto({
        ...option,
        onProgress: (progress) => {
          if (onProgress) {
            onProgress(i, progress)
          }
        }
      })

      results.push(result)
    }

    return results
  }

  /**
   * Get photos for a scope item
   */
  async getScopeItemPhotos(scopeItemId: string): Promise<ScopeItemPhoto[]> {
    try {
      const { data, error } = await this.supabase
        .rpc('get_scope_item_photos', { p_scope_item_id: scopeItemId })

      if (error) throw error

      const photos = data || []

      // Add signed URLs for each photo
      const photosWithUrls = await Promise.all(
        photos.map(async (photo: ScopeItemPhoto) => {
          const { url } = await storageService.getSignedUrl(photo.file_path, 3600)
          return {
            ...photo,
            signed_url: url
          }
        })
      )

      return photosWithUrls
    } catch (error) {
      throw new Error(`Failed to get photos: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get photo by ID
   */
  async getPhoto(photoId: string): Promise<ScopeItemPhoto | null> {
    try {
      const { data, error } = await this.supabase
        .from('scope_item_photos')
        .select('*')
        .eq('id', photoId)
        .single()

      if (error) return null

      // Add signed URL
      const { url } = await storageService.getSignedUrl(data.file_path, 3600)

      return {
        ...data,
        signed_url: url
      }
    } catch (error) {
      return null
    }
  }

  /**
   * Update photo metadata
   */
  async updatePhoto(
    photoId: string,
    updates: Partial<ScopeItemPhoto>
  ): Promise<ScopeItemPhoto | null> {
    try {
      const { data, error } = await this.supabase
        .from('scope_item_photos')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', photoId)
        .select()
        .single()

      if (error) throw error

      return data
    } catch (error) {
      throw new Error(`Failed to update photo: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Delete photo
   */
  async deletePhoto(photoId: string): Promise<boolean> {
    try {
      // Get photo info first
      const photo = await this.getPhoto(photoId)
      if (!photo) return false

      // Delete from storage
      const { error: storageError } = await storageService.deleteFile(photo.file_path)
      if (storageError) {
        console.error('Failed to delete file from storage:', storageError)
      }

      // Delete from database (will cascade delete annotations)
      const { error: dbError } = await this.supabase
        .from('scope_item_photos')
        .delete()
        .eq('id', photoId)

      if (dbError) throw dbError

      return true
    } catch (error) {
      throw new Error(`Failed to delete photo: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Set photo as primary
   */
  async setPrimaryPhoto(photoId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase.rpc('set_primary_photo', { p_photo_id: photoId })
      if (error) throw error
      return true
    } catch (error) {
      throw new Error(`Failed to set primary photo: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Pair before/after photos
   */
  async pairBeforeAfterPhotos(
    beforePhotoId: string,
    afterPhotoId: string
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase.rpc('pair_before_after_photos', {
        p_before_photo_id: beforePhotoId,
        p_after_photo_id: afterPhotoId
      })
      if (error) throw error
      return true
    } catch (error) {
      throw new Error(`Failed to pair photos: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get photo statistics for a job
   */
  async getJobPhotoStats(jobId: string): Promise<PhotoStats> {
    try {
      const { data, error } = await this.supabase.rpc('get_job_photo_stats', { p_job_id: jobId })

      if (error) throw error

      const stats = data[0]
      return {
        total_photos: stats.total_photos || 0,
        before_photos: stats.before_photos || 0,
        after_photos: stats.after_photos || 0,
        progress_photos: stats.progress_photos || 0,
        completion_photos: stats.completion_photos || 0,
        issue_photos: stats.issue_photos || 0,
        reference_photos: stats.reference_photos || 0,
        primary_photos: stats.primary_photos || 0,
        public_photos: stats.public_photos || 0,
        before_after_pairs: stats.before_after_pairs || 0,
        total_file_size: stats.total_file_size || 0,
        average_file_size: stats.average_file_size || 0
      }
    } catch (error) {
      throw new Error(`Failed to get photo stats: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get photo annotations
   */
  async getPhotoAnnotations(photoId: string): Promise<PhotoAnnotation[]> {
    try {
      const { data, error } = await this.supabase
        .from('photo_annotations')
        .select('*')
        .eq('photo_id', photoId)
        .order('created_at', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      throw new Error(`Failed to get annotations: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Add photo annotation
   */
  async addAnnotation(annotation: Omit<PhotoAnnotation, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<PhotoAnnotation | null> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { data, error } = await this.supabase
        .from('photo_annotations')
        .insert({
          ...annotation,
          user_id: user.id
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      throw new Error(`Failed to add annotation: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Update photo annotation
   */
  async updateAnnotation(
    annotationId: string,
    updates: Partial<PhotoAnnotation>
  ): Promise<PhotoAnnotation | null> {
    try {
      const { data, error } = await this.supabase
        .from('photo_annotations')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', annotationId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      throw new Error(`Failed to update annotation: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Delete photo annotation
   */
  async deleteAnnotation(annotationId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('photo_annotations')
        .delete()
        .eq('id', annotationId)

      if (error) throw error
      return true
    } catch (error) {
      throw new Error(`Failed to delete annotation: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Search photos
   */
  async searchPhotos(query: string, filters?: {
    photo_type?: PhotoType[]
    is_public?: boolean
    date_range?: { start: Date; end: Date }
  }): Promise<ScopeItemPhoto[]> {
    try {
      let dbQuery = this.supabase
        .from('scope_item_photos')
        .select('*')
        .or(`title.ilike.%${query}%,description.ilike.%${query}%,file_name.ilike.%${query}%`)

      if (filters?.photo_type?.length) {
        dbQuery = dbQuery.in('photo_type', filters.photo_type)
      }

      if (filters?.is_public !== undefined) {
        dbQuery = dbQuery.eq('is_public', filters.is_public)
      }

      if (filters?.date_range) {
        dbQuery = dbQuery
          .gte('created_at', filters.date_range.start.toISOString())
          .lte('created_at', filters.date_range.end.toISOString())
      }

      const { data, error } = await dbQuery.order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      throw new Error(`Failed to search photos: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get download URL for photo
   */
  async getDownloadUrl(photoId: string): Promise<string | null> {
    try {
      const photo = await this.getPhoto(photoId)
      if (!photo) return null

      const { url } = await storageService.getSignedUrl(photo.file_path, 3600)
      return url
    } catch (error) {
      return null
    }
  }

  /**
   * Get thumbnail URL for photo
   */
  async getThumbnailUrl(photoId: string): Promise<string | null> {
    try {
      const photo = await this.getPhoto(photoId)
      if (!photo) return null

      // For now, use the same URL with size transformation
      // In Supabase, you can add image transformations to the URL
      const { url } = await storageService.getSignedUrl(photo.file_path, 3600)
      return url ? `${url}?width=300&height=300` : null
    } catch (error) {
      return null
    }
  }

  /**
   * Batch delete photos
   */
  async batchDeletePhotos(photoIds: string[]): Promise<{ success: number; failed: string[] }> {
    const results = { success: 0, failed: [] as string[] }

    for (const photoId of photoIds) {
      try {
        const success = await this.deletePhoto(photoId)
        if (success) {
          results.success++
        } else {
          results.failed.push(photoId)
        }
      } catch (error) {
        results.failed.push(photoId)
      }
    }

    return results
  }

  /**
   * Get photo types summary
   */
  async getPhotoTypesSummary(scopeItemId: string): Promise<Record<PhotoType, number>> {
    try {
      const photos = await this.getScopeItemPhotos(scopeItemId)

      const summary = photos.reduce((acc, photo) => {
        acc[photo.photo_type] = (acc[photo.photo_type] || 0) + 1
        return acc
      }, {} as Record<PhotoType, number>)

      // Ensure all types are included
      const allTypes: PhotoType[] = ['progress', 'before', 'after', 'completion', 'issue', 'reference']
      allTypes.forEach(type => {
        if (!(type in summary)) {
          summary[type] = 0
        }
      })

      return summary
    } catch (error) {
      throw new Error(`Failed to get photo types summary: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

// Singleton instance
export const photoService = new PhotoService()