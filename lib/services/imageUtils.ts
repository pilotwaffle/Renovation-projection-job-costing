import {
  ImageOptimizationOptions,
  ProcessedImageResult,
  ImageMetadata,
  PhotoError
} from '@/lib/types/photo'

export class ImageUtils {
  /**
   * Process and optimize an image file
   */
  static async processImage(
    file: File,
    options: ImageOptimizationOptions = {}
  ): Promise<ProcessedImageResult> {
    const {
      maxWidth = 1920,
      maxHeight = 1080,
      quality = 0.85,
      format = 'webp',
      enableWebP = true,
      generateThumbnails = true,
      thumbnailSize = 300
    } = options

    try {
      // Get image metadata first
      const metadata = await this.getImageMetadata(file)

      // Create image bitmap for processing
      const bitmap = await createImageBitmap(file)

      // Calculate new dimensions
      const { width: newWidth, height: newHeight } = this.calculateDimensions(
        bitmap.width,
        bitmap.height,
        maxWidth,
        maxHeight
      )

      // Create canvas for main image
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!

      canvas.width = newWidth
      canvas.height = newHeight

      // Draw image
      ctx.drawImage(bitmap, 0, 0, newWidth, newHeight)

      // Get original file as blob
      const originalBlob = file

      // Generate optimized version
      let optimizedBlob: Blob | undefined
      const outputFormat = enableWebP && this.supportsWebP() ? 'webp' : format

      try {
        optimizedBlob = await this.canvasToBlob(canvas, outputFormat, quality)
      } catch (error) {
        // Fallback to original format if optimization fails
        optimizedBlob = await this.canvasToBlob(canvas, 'image/jpeg', quality)
      }

      // Generate thumbnail if requested
      let thumbnailBlob: Blob | undefined
      if (generateThumbnails) {
        const { width: thumbWidth, height: thumbHeight } = this.calculateDimensions(
          newWidth,
          newHeight,
          thumbnailSize,
          thumbnailSize
        )

        const thumbCanvas = document.createElement('canvas')
        const thumbCtx = thumbCanvas.getContext('2d')!

        thumbCanvas.width = thumbWidth
        thumbCanvas.height = thumbHeight

        thumbCtx.drawImage(canvas, 0, 0, thumbWidth, thumbHeight)

        thumbnailBlob = await this.canvasToBlob(thumbCanvas, 'image/jpeg', 0.7)
      }

      // Cleanup bitmap
      bitmap.close()

      return {
        original: originalBlob,
        optimized: optimizedBlob,
        thumbnail: thumbnailBlob,
        metadata: {
          ...metadata,
          width: newWidth,
          height: newHeight,
          aspectRatio: newWidth / newHeight,
          fileSize: optimizedBlob?.size || originalBlob.size,
          mimeType: `image/${outputFormat}`,
          hasAlpha: outputFormat === 'png' || outputFormat === 'webp'
        }
      }
    } catch (error) {
      const photoError: PhotoError = {
        name: 'ImageProcessingError',
        message: error instanceof Error ? error.message : 'Failed to process image',
        code: 'OPTIMIZATION_ERROR',
        details: error
      }
      throw photoError
    }
  }

  /**
   * Get image metadata from file
   */
  static async getImageMetadata(file: File): Promise<Omit<ImageMetadata, 'fileSize'>> {
    return new Promise((resolve, reject) => {
      const img = new Image()

      img.onload = () => {
        URL.revokeObjectURL(img.src)
        resolve({
          width: img.naturalWidth,
          height: img.naturalHeight,
          aspectRatio: img.naturalWidth / img.naturalHeight,
          mimeType: file.type,
          hasAlpha: file.type === 'image/png' || file.type === 'image/webp',
          dominantColor: undefined // Would need canvas processing to extract
        })
      }

      img.onerror = () => {
        URL.revokeObjectURL(img.src)
        reject(new Error('Failed to load image for metadata extraction'))
      }

      img.src = URL.createObjectURL(file)
    })
  }

  /**
   * Calculate new dimensions maintaining aspect ratio
   */
  static calculateDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number
  ): { width: number; height: number } {
    const aspectRatio = originalWidth / originalHeight

    let width = originalWidth
    let height = originalHeight

    // Scale down if too wide
    if (width > maxWidth) {
      width = maxWidth
      height = width / aspectRatio
    }

    // Scale down if too tall
    if (height > maxHeight) {
      height = maxHeight
      width = height * aspectRatio
    }

    // Ensure minimum dimensions
    width = Math.max(width, 1)
    height = Math.max(height, 1)

    return { width: Math.round(width), height: Math.round(height) }
  }

  /**
   * Convert canvas to blob
   */
  static canvasToBlob(canvas: HTMLCanvasElement, format: string, quality: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Failed to convert canvas to blob'))
          }
        },
        format,
        quality
      )
    })
  }

  /**
   * Check if WebP is supported
   */
  static supportsWebP(): boolean {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0
  }

  /**
   * Generate file hash for deduplication
   */
  static async generateFileHash(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = async () => {
        try {
          const buffer = reader.result as ArrayBuffer
          const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
          const hashArray = Array.from(new Uint8Array(hashBuffer))
          const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
          resolve(hashHex)
        } catch (error) {
          reject(error)
        }
      }

      reader.onerror = () => reject(reader.error)
      reader.readAsArrayBuffer(file)
    })
  }

  /**
   * Extract dominant color from image
   */
  static async extractDominantColor(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!

      img.onload = () => {
        try {
          // Sample from center of image
          const sampleSize = 50
          const sampleX = Math.max(0, (img.naturalWidth - sampleSize) / 2)
          const sampleY = Math.max(0, (img.naturalHeight - sampleSize) / 2)

          canvas.width = sampleSize
          canvas.height = sampleSize

          ctx.drawImage(img, sampleX, sampleY, sampleSize, sampleSize, 0, 0, sampleSize, sampleSize)

          const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize)
          const pixels = imageData.data

          let r = 0, g = 0, b = 0
          let count = 0

          // Sample pixels, skipping transparent ones
          for (let i = 0; i < pixels.length; i += 4 * 10) { // Sample every 10th pixel
            if (pixels[i + 3] > 0) { // Skip transparent pixels
              r += pixels[i]
              g += pixels[i + 1]
              b += pixels[i + 2]
              count++
            }
          }

          if (count === 0) {
            resolve('#808080') // Default gray if no opaque pixels
            return
          }

          r = Math.round(r / count)
          g = Math.round(g / count)
          b = Math.round(b / count)

          const hex = '#' + [r, g, b].map(x => {
            const hex = x.toString(16)
            return hex.length === 1 ? '0' + hex : hex
          }).join('')

          resolve(hex)
        } catch (error) {
          reject(error)
        } finally {
          URL.revokeObjectURL(img.src)
        }
      }

      img.onerror = () => {
        URL.revokeObjectURL(img.src)
        reject(new Error('Failed to extract dominant color'))
      }

      img.src = URL.createObjectURL(file)
    })
  }

  /**
   * Compress image to target file size
   */
  static async compressToSize(
    file: File,
    targetSizeBytes: number,
    maxAttempts: number = 5
  ): Promise<Blob> {
    const originalSize = file.size
    if (originalSize <= targetSizeBytes) {
      return file
    }

    const compressionRatio = targetSizeBytes / originalSize
    let quality = Math.min(0.9, Math.max(0.1, compressionRatio))

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const processed = await this.processImage(file, {
          quality,
          format: 'jpeg',
          enableWebP: false
        })

        const compressedBlob = processed.optimized || processed.original

        if (compressedBlob.size <= targetSizeBytes || attempt === maxAttempts - 1) {
          return compressedBlob
        }

        // Adjust quality for next attempt
        const sizeRatio = compressedBlob.size / targetSizeBytes
        quality = Math.max(0.1, quality / sizeRatio)
      } catch (error) {
        if (attempt === maxAttempts - 1) {
          throw error
        }
      }
    }

    throw new Error('Failed to compress image to target size')
  }

  /**
   * Validate image file
   */
  static async validateImageFile(file: File): Promise<{
    isValid: boolean
    error?: string
    metadata?: ImageMetadata
  }> {
    // Check file type
    if (!file.type.startsWith('image/')) {
      return {
        isValid: false,
        error: 'File is not an image'
      }
    }

    try {
      const metadata = await this.getImageMetadata(file)

      // Check minimum dimensions
      if (metadata.width < 1 || metadata.height < 1) {
        return {
          isValid: false,
          error: 'Image has invalid dimensions'
        }
      }

      // Check aspect ratio (avoid extreme ratios)
      if (metadata.aspectRatio < 0.1 || metadata.aspectRatio > 10) {
        return {
          isValid: false,
          error: 'Image aspect ratio is too extreme'
        }
      }

      return {
        isValid: true,
        metadata
      }
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Failed to validate image'
      }
    }
  }

  /**
   * Create thumbnail from file
   */
  static async createThumbnail(
    file: File,
    size: number = 300,
    quality: number = 0.7
  ): Promise<Blob> {
    const processed = await this.processImage(file, {
      maxWidth: size,
      maxHeight: size,
      generateThumbnails: false,
      format: 'jpeg',
      enableWebP: false,
      quality
    })

    return processed.optimized || processed.original
  }

  /**
   * Get EXIF data from image (simplified version)
   */
  static async getExifData(file: File): Promise<{
    takenAt?: Date
    location?: { latitude: number; longitude: number }
    device?: string
  }> {
    // This is a simplified implementation
    // In a real app, you'd use a library like exif-js
    return new Promise((resolve) => {
      // For now, return empty object
      // Would need to implement proper EXIF parsing
      resolve({})
    })
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'

    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  /**
   * Get image orientation from EXIF
   */
  static getImageOrientation(file: File): Promise<number> {
    // Simplified implementation - would need proper EXIF parsing
    return Promise.resolve(1)
  }
}

export default ImageUtils