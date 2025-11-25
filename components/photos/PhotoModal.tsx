'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import {
  ScopeItemPhoto,
  PhotoModalProps,
  PhotoAnnotation,
  AnnotationType
} from '@/lib/types/photo'
import { photoService } from '@/lib/services/photoService'
import {
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Trash2,
  Edit3,
  Star,
  StarOff,
  Maximize2,
  Minimize2,
  Info,
  Calendar,
  Camera,
  MapPin,
  FileText
} from 'lucide-react'

export default function PhotoModal({
  photo,
  photos,
  currentIndex,
  isOpen,
  onClose,
  onPrevious,
  onNext,
  allowAnnotations = true,
  showMetadata = true
}: PhotoModalProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedPhoto, setEditedPhoto] = useState<ScopeItemPhoto | null>(null)
  const [annotations, setAnnotations] = useState<PhotoAnnotation[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const currentPhoto = photo || photos[currentIndex]

  useEffect(() => {
    if (currentPhoto) {
      setEditedPhoto(currentPhoto)
      if (allowAnnotations) {
        loadAnnotations(currentPhoto.id)
      }
    }
  }, [currentPhoto, allowAnnotations])

  const loadAnnotations = async (photoId: string) => {
    try {
      const photoAnnotations = await photoService.getPhotoAnnotations(photoId)
      setAnnotations(photoAnnotations)
    } catch (error) {
      console.error('Failed to load annotations:', error)
    }
  }

  const handleDownload = useCallback(async () => {
    if (!currentPhoto) return

    try {
      const url = await photoService.getDownloadUrl(currentPhoto.id)
      if (url) {
        const link = document.createElement('a')
        link.href = url
        link.download = currentPhoto.file_name
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    } catch (error) {
      console.error('Failed to download photo:', error)
    }
  }, [currentPhoto])

  const handleSetPrimary = useCallback(async () => {
    if (!currentPhoto) return

    setIsLoading(true)
    try {
      await photoService.setPrimaryPhoto(currentPhoto.id)
      setEditedPhoto(prev => prev ? { ...prev, is_primary: !prev.is_primary } : null)
    } catch (error) {
      console.error('Failed to set primary photo:', error)
    } finally {
      setIsLoading(false)
    }
  }, [currentPhoto])

  const handleSaveEdit = useCallback(async () => {
    if (!editedPhoto) return

    setIsLoading(true)
    try {
      const updatedPhoto = await photoService.updatePhoto(editedPhoto.id, {
        title: editedPhoto.title,
        description: editedPhoto.description,
        is_public: editedPhoto.is_public
      })

      if (updatedPhoto) {
        setEditedPhoto(updatedPhoto)
        setIsEditing(false)
      }
    } catch (error) {
      console.error('Failed to update photo:', error)
    } finally {
      setIsLoading(false)
    }
  }, [editedPhoto])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return

    switch (e.key) {
      case 'Escape':
        onClose()
        break
      case 'ArrowLeft':
        onPrevious?.()
        break
      case 'ArrowRight':
        onNext?.()
        break
      case 'f':
        setIsFullscreen(prev => !prev)
        break
      case 'i':
        setShowInfo(prev => !prev)
        break
    }
  }, [isOpen, onClose, onPrevious, onNext])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
  }

  if (!isOpen || !currentPhoto) return null

  const hasPrevious = currentIndex > 0
  const hasNext = currentIndex < photos.length - 1

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center">
      {/* Main Content */}
      <div className={`relative w-full h-full flex flex-col ${isFullscreen ? '' : 'max-w-7xl max-h-screen'}`}>
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/50 to-transparent p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={onClose}
                className="p-2 text-white hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="text-white">
                <h2 className="text-lg font-semibold">
                  {editedPhoto?.title || editedPhoto?.file_name}
                </h2>
                <p className="text-sm opacity-80">
                  {currentIndex + 1} of {photos.length}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* Navigation */}
              {hasPrevious && (
                <button
                  onClick={onPrevious}
                  className="p-2 text-white hover:bg-white/10 rounded-full transition-colors"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}
              {hasNext && (
                <button
                  onClick={onNext}
                  className="p-2 text-white hover:bg-white/10 rounded-full transition-colors"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              )}

              <div className="w-px h-6 bg-white/30 mx-2" />

              {/* Actions */}
              <button
                onClick={() => setShowInfo(!showInfo)}
                className="p-2 text-white hover:bg-white/10 rounded-full transition-colors"
                title="Toggle info (I)"
              >
                <Info className="w-6 h-6" />
              </button>

              <button
                onClick={handleDownload}
                className="p-2 text-white hover:bg-white/10 rounded-full transition-colors"
                title="Download"
              >
                <Download className="w-6 h-6" />
              </button>

              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 text-white hover:bg-white/10 rounded-full transition-colors"
                title="Fullscreen (F)"
              >
                {isFullscreen ? (
                  <Minimize2 className="w-6 h-6" />
                ) : (
                  <Maximize2 className="w-6 h-6" />
                )}
              </button>

              {showMetadata && (
                <>
                  <button
                    onClick={handleSetPrimary}
                    disabled={isLoading}
                    className="p-2 text-white hover:bg-white/10 rounded-full transition-colors disabled:opacity-50"
                    title="Set as primary"
                  >
                    {editedPhoto?.is_primary ? (
                      <StarOff className="w-6 h-6" />
                    ) : (
                      <Star className="w-6 h-6" />
                    )}
                  </button>

                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="p-2 text-white hover:bg-white/10 rounded-full transition-colors"
                    title="Edit details"
                  >
                    <Edit3 className="w-6 h-6" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Photo Display */}
        <div className="flex-1 flex items-center justify-center relative">
          {currentPhoto.signed_url ? (
            <div className="relative max-w-full max-h-full">
              <Image
                src={currentPhoto.signed_url}
                alt={editedPhoto?.title || editedPhoto?.file_name}
                width={currentPhoto.width || 1920}
                height={currentPhoto.height || 1080}
                className="max-w-full max-h-full object-contain"
                priority
                quality={100}
              />

              {/* Annotations Overlay */}
              {allowAnnotations && annotations.length > 0 && (
                <div className="absolute inset-0 pointer-events-none">
                  {annotations.map((annotation) => (
                    <div
                      key={annotation.id}
                      className="absolute"
                      style={{
                        left: `${(annotation.coordinates.x / (currentPhoto.width || 1)) * 100}%`,
                        top: `${(annotation.coordinates.y / (currentPhoto.height || 1)) * 100}%`
                      }}
                    >
                      {/* Render annotation based on type */}
                      {annotation.annotation_type === 'pin' && (
                        <div
                          className="w-4 h-4 rounded-full transform -translate-x-1/2 -translate-y-1/2"
                          style={{ backgroundColor: annotation.color }}
                        />
                      )}
                      {annotation.annotation_type === 'text' && annotation.text_content && (
                        <div
                          className="px-2 py-1 rounded text-xs text-white"
                          style={{ backgroundColor: annotation.color }}
                        >
                          {annotation.text_content}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-white">
              <Camera className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>Photo not available</p>
            </div>
          )}

          {/* Click areas for navigation */}
          {hasPrevious && (
            <div
              className="absolute left-0 top-0 bottom-0 w-1/4 cursor-pointer"
              onClick={onPrevious}
            />
          )}
          {hasNext && (
            <div
              className="absolute right-0 top-0 bottom-0 w-1/4 cursor-pointer"
              onClick={onNext}
            />
          )}
        </div>

        {/* Info Panel */}
        {showMetadata && (showInfo || isEditing) && (
          <div className="absolute bottom-0 left-0 right-0 bg-black/90 text-white p-6">
            {isEditing ? (
              <div className="max-w-2xl mx-auto space-y-4">
                <h3 className="text-lg font-semibold">Edit Photo Details</h3>

                <div>
                  <label className="block text-sm font-medium mb-2">Title</label>
                  <input
                    type="text"
                    value={editedPhoto?.title || ''}
                    onChange={(e) => setEditedPhoto(prev => prev ? { ...prev, title: e.target.value } : null)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
                    placeholder="Enter photo title..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    value={editedPhoto?.description || ''}
                    onChange={(e) => setEditedPhoto(prev => prev ? { ...prev, description: e.target.value } : null)}
                    rows={3}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
                    placeholder="Enter photo description..."
                  />
                </div>

                <div className="flex items-center space-x-3">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editedPhoto?.is_public || false}
                      onChange={(e) => setEditedPhoto(prev => prev ? { ...prev, is_public: e.target.checked } : null)}
                      className="rounded border-white/20 bg-white/10 text-white focus:ring-white/50"
                    />
                    <span className="text-sm">Share with client</span>
                  </label>
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleSaveEdit}
                    disabled={isLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false)
                      setEditedPhoto(currentPhoto)
                    }}
                    className="px-4 py-2 bg-white/10 text-white rounded-md hover:bg-white/20"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Photo Info */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Photo Information</h3>
                    <dl className="space-y-2 text-sm">
                      <div className="flex">
                        <dt className="w-24 text-gray-400">File Name:</dt>
                        <dd className="flex-1 truncate">{currentPhoto.file_name}</dd>
                      </div>
                      <div className="flex">
                        <dt className="w-24 text-gray-400">Size:</dt>
                        <dd>{formatFileSize(currentPhoto.file_size)}</dd>
                      </div>
                      {currentPhoto.width && currentPhoto.height && (
                        <div className="flex">
                          <dt className="w-24 text-gray-400">Dimensions:</dt>
                          <dd>{currentPhoto.width} × {currentPhoto.height}px</dd>
                        </div>
                      )}
                      <div className="flex">
                        <dt className="w-24 text-gray-400">Type:</dt>
                        <dd className="capitalize">{currentPhoto.photo_type}</dd>
                      </div>
                      {currentPhoto.is_primary && (
                        <div className="flex">
                          <dt className="w-24 text-gray-400">Status:</dt>
                          <dd className="flex items-center">
                            <Star className="w-4 h-4 text-yellow-500 mr-1" />
                            Primary Photo
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>

                  {/* Dates & Location */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Dates & Location</h3>
                    <dl className="space-y-2 text-sm">
                      <div className="flex items-start">
                        <dt className="w-24 text-gray-400 flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          Uploaded:
                        </dt>
                        <dd>{formatDate(currentPhoto.uploaded_at)}</dd>
                      </div>
                      {currentPhoto.taken_at && (
                        <div className="flex items-start">
                          <dt className="w-24 text-gray-400">Taken:</dt>
                          <dd>{formatDate(currentPhoto.taken_at)}</dd>
                        </div>
                      )}
                      {(currentPhoto.latitude && currentPhoto.longitude) && (
                        <div className="flex items-start">
                          <dt className="w-24 text-gray-400 flex items-center">
                            <MapPin className="w-4 h-4 mr-1" />
                            Location:
                          </dt>
                          <dd>
                            {currentPhoto.latitude.toFixed(6)}, {currentPhoto.longitude.toFixed(6)}
                            {currentPhoto.location_name && (
                              <span className="ml-2 text-gray-400">({currentPhoto.location_name})</span>
                            )}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>
                </div>

                {/* Description */}
                {(currentPhoto.description || currentPhoto.title) && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-3">Details</h3>
                    {currentPhoto.title && (
                      <p className="text-white font-medium mb-2">{currentPhoto.title}</p>
                    )}
                    {currentPhoto.description && (
                      <p className="text-gray-300">{currentPhoto.description}</p>
                    )}
                  </div>
                )}

                {/* Annotations */}
                {allowAnnotations && annotations.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-3">Annotations ({annotations.length})</h3>
                    <div className="flex flex-wrap gap-2">
                      {annotations.map((annotation) => (
                        <div
                          key={annotation.id}
                          className="flex items-center space-x-2 px-3 py-1 bg-white/10 rounded-full text-sm"
                        >
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: annotation.color }}
                          />
                          <span className="capitalize">{annotation.annotation_type}</span>
                          {annotation.text_content && (
                            <span className="text-gray-300">• {annotation.text_content}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Keyboard Shortcuts Help */}
      <div className="absolute bottom-4 left-4 text-white/60 text-xs">
        <p>ESC: Close • ← →: Navigate • F: Fullscreen • I: Info</p>
      </div>
    </div>
  )
}