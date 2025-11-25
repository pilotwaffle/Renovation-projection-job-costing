'use client'

import React, { useState, useCallback, useRef } from 'react'
import { PhotoUploadOptions, PhotoUploadResult, PhotoType } from '@/lib/types/photo'
import { photoService } from '@/lib/services/photoService'
import { Camera, Upload, X, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'

interface PhotoUploaderProps {
  scope_item_id: string
  onUploadComplete?: (results: PhotoUploadResult[]) => void
  onError?: (error: Error) => void
  maxFiles?: number
  maxSize?: number // in bytes
  acceptedTypes?: string[]
  allowMultiple?: boolean
  autoUpload?: boolean
  className?: string
}

export default function PhotoUploader({
  scope_item_id,
  onUploadComplete,
  onError,
  maxFiles = 10,
  maxSize = 10 * 1024 * 1024, // 10MB
  acceptedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  allowMultiple = true,
  autoUpload = true,
  className = ''
}: PhotoUploaderProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
  const [uploadStatus, setUploadStatus] = useState<Record<string, 'pending' | 'uploading' | 'completed' | 'error'>>({})
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadResults, setUploadResults] = useState<PhotoUploadResult[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return

    const newFiles = Array.from(files)
      .filter(file => {
        // Check file type
        if (!acceptedTypes.includes(file.type)) {
          console.warn(`File ${file.name} has invalid type: ${file.type}`)
          return false
        }

        // Check file size
        if (file.size > maxSize) {
          console.warn(`File ${file.name} is too large: ${file.size} bytes`)
          return false
        }

        return true
      })
      .slice(0, maxFiles - selectedFiles.length)

    setSelectedFiles(prev => [...prev, ...newFiles])

    // Initialize upload status
    const initialStatus: Record<string, any> = {}
    const initialProgress: Record<string, number> = {}

    newFiles.forEach(file => {
      const key = `${file.name}_${file.size}_${file.lastModified}`
      initialStatus[key] = 'pending'
      initialProgress[key] = 0
    })

    setUploadStatus(prev => ({ ...prev, ...initialStatus }))
    setUploadProgress(prev => ({ ...prev, ...initialProgress }))

    // Auto upload if enabled
    if (autoUpload) {
      setTimeout(() => handleUpload(newFiles), 100)
    }
  }, [selectedFiles.length, maxFiles, maxSize, acceptedTypes, autoUpload])

  const handleUpload = useCallback(async (files?: File[]) => {
    const filesToUpload = files || selectedFiles
    if (filesToUpload.length === 0) return

    setIsUploading(true)
    const results: PhotoUploadResult[] = []

    try {
      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i]
        const key = `${file.name}_${file.size}_${file.lastModified}`

        setUploadStatus(prev => ({ ...prev, [key]: 'uploading' }))

        try {
          const result = await photoService.uploadPhoto({
            file,
            scope_item_id,
            photo_type: 'progress',
            onProgress: (progress) => {
              setUploadProgress(prev => ({ ...prev, [key]: progress }))
            }
          })

          setUploadStatus(prev => ({ ...prev, [key]: result.success ? 'completed' : 'error' }))
          results.push(result)
        } catch (error) {
          setUploadStatus(prev => ({ ...prev, [key]: 'error' }))
          results.push({
            success: false,
            photo: null as any,
            error: error instanceof Error ? error.message : 'Upload failed'
          })
        }
      }

      setUploadResults(results)
      onUploadComplete?.(results)

      // Clear successful uploads
      setTimeout(() => {
        setSelectedFiles(prev =>
          prev.filter(file => {
            const key = `${file.name}_${file.size}_${file.lastModified}`
            return uploadStatus[key] !== 'completed'
          })
        )
      }, 2000)

    } catch (error) {
      console.error('Upload error:', error)
      onError?.(error instanceof Error ? error : new Error('Upload failed'))
    } finally {
      setIsUploading(false)
    }
  }, [selectedFiles, scope_item_id, onUploadComplete, onError, uploadStatus])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFileSelect(e.dataTransfer.files)
  }, [handleFileSelect])

  const removeFile = useCallback((index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }, [])

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileKey = (file: File) => `${file.name}_${file.size}_${file.lastModified}`

  return (
    <div className={`w-full ${className}`}>
      {/* Drop Zone */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        } ${selectedFiles.length > 0 ? 'mb-4' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={allowMultiple}
          accept={acceptedTypes.join(',')}
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />

        <div className="flex flex-col items-center space-y-3">
          <Camera className="w-12 h-12 text-gray-400" />
          <div>
            <p className="text-lg font-medium text-gray-700">
              Drop photos here or click to browse
            </p>
            <p className="text-sm text-gray-500">
              {allowMultiple ? `Up to ${maxFiles} photos` : 'Single photo'} • Max {formatFileSize(maxSize)}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Supported formats: {acceptedTypes.map(type => type.split('/')[1]).join(', ')}
            </p>
          </div>
          <button
            type="button"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <Upload className="w-5 h-5 inline-block mr-2" />
            Choose Photos
          </button>
        </div>
      </div>

      {/* File List */}
      {selectedFiles.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              Selected Photos ({selectedFiles.length})
            </h3>
            {!autoUpload && (
              <button
                onClick={() => handleUpload()}
                disabled={isUploading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 inline-block mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  'Upload Photos'
                )}
              </button>
            )}
          </div>

          <div className="space-y-2">
            {selectedFiles.map((file, index) => {
              const key = getFileKey(file)
              const status = uploadStatus[key]
              const progress = uploadProgress[key] || 0

              return (
                <div
                  key={key}
                  className={`flex items-center p-3 bg-white border rounded-lg ${
                    status === 'error' ? 'border-red-200 bg-red-50' :
                    status === 'completed' ? 'border-green-200 bg-green-50' :
                    'border-gray-200'
                  }`}
                >
                  {/* Status Icon */}
                  <div className="flex-shrink-0 mr-3">
                    {status === 'uploading' && (
                      <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                    )}
                    {status === 'completed' && (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    )}
                    {status === 'error' && (
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    )}
                    {status === 'pending' && (
                      <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                    )}
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {file.name}
                      </p>
                      <span className="text-xs text-gray-500 ml-2">
                        {formatFileSize(file.size)}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    {status === 'uploading' && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                          <span>Uploading...</span>
                          <span>{progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div
                            className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Error Message */}
                    {status === 'error' && (
                      <p className="text-xs text-red-600 mt-1">
                        Upload failed. Please try again.
                      </p>
                    )}
                  </div>

                  {/* Remove Button */}
                  {!isUploading && (
                    <button
                      onClick={() => removeFile(index)}
                      className="flex-shrink-0 ml-3 p-1 text-gray-400 hover:text-red-600 focus:outline-none"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Upload Results Summary */}
      {uploadResults.length > 0 && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            <span className="font-medium">{uploadResults.filter(r => r.success).length}</span> of{' '}
            <span className="font-medium">{uploadResults.length}</span> photos uploaded successfully.
          </p>
          {uploadResults.some(r => !r.success) && (
            <p className="text-sm text-red-600 mt-1">
              Some uploads failed. Please check the error messages above.
            </p>
          )}
        </div>
      )}
    </div>
  )
}