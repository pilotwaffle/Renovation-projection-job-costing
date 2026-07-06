'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import {
  ScopeItemPhoto,
  PhotoGalleryProps,
  PhotoType,
  PhotoViewMode,
  BeforeAfterPair
} from '@/lib/types/photo'
import { photoService } from '@/lib/services/photoService'
import {
  Grid,
  List,
  Eye,
  Download,
  Trash2,
  Star,
  StarOff,
  Camera,
  Calendar,
  FileText,
  Layers,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

export default function PhotoGallery({
  photos,
  scope_item_id,
  onPhotoSelect,
  onPhotoDelete,
  onPhotoUpdate,
  onBeforeAfterPair,
  readonly = false,
  showAnnotations = true,
  allowBeforeAfter = true,
  className = ''
}: PhotoGalleryProps) {
  const [viewMode, setViewMode] = useState<PhotoViewMode>('grid')
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([])
  const [beforeAfterPairs, setBeforeAfterPairs] = useState<BeforeAfterPair[]>([])
  const [showPairingMode, setShowPairingMode] = useState(false)
  const [pairingSelection, setPairingSelection] = useState<string[]>([])

  // Group photos by type and create before/after pairs
  useEffect(() => {
    const pairs: BeforeAfterPair[] = []
    const beforePhotos = photos.filter(p => p.photo_type === 'before' && p.paired_photo_id)

    beforePhotos.forEach(beforePhoto => {
      const afterPhoto = photos.find(p => p.id === beforePhoto.paired_photo_id)
      if (afterPhoto) {
        pairs.push({ before: beforePhoto, after: afterPhoto })
      }
    })

    setBeforeAfterPairs(pairs)
  }, [photos])

  const handlePhotoClick = useCallback((photo: ScopeItemPhoto) => {
    if (showPairingMode) {
      handlePairingSelection(photo.id)
    } else {
      onPhotoSelect?.(photo)
    }
  }, [showPairingMode, onPhotoSelect])

  const handlePairingSelection = useCallback((photoId: string) => {
    setPairingSelection(prev => {
      const newSelection = prev.includes(photoId)
        ? prev.filter(id => id !== photoId)
        : [...prev, photoId]

      // If we have 2 photos selected, attempt to pair them
      if (newSelection.length === 2) {
        const photo1 = photos.find(p => p.id === newSelection[0])
        const photo2 = photos.find(p => p.id === newSelection[1])

        if (photo1 && photo2) {
          // Determine which is before and which is after based on creation time
          const beforePhoto = photo1.created_at < photo2.created_at ? photo1 : photo2
          const afterPhoto = photo1.created_at >= photo2.created_at ? photo1 : photo2

          onBeforeAfterPair?.(beforePhoto, afterPhoto)
          setTimeout(() => {
            setPairingSelection([])
            setShowPairingMode(false)
          }, 500)
        }
      }

      return newSelection
    })
  }, [photos, onBeforeAfterPair])

  const handleSetPrimary = useCallback(async (photoId: string) => {
    if (readonly) return

    try {
      await photoService.setPrimaryPhoto(photoId)
      onPhotoUpdate?.(photos.find(p => p.id === photoId)!)
    } catch (error) {
      console.error('Failed to set primary photo:', error)
    }
  }, [readonly, photos, onPhotoUpdate])

  const handleDelete = useCallback(async (photoId: string) => {
    if (readonly) return

    try {
      await photoService.deletePhoto(photoId)
      onPhotoDelete?.(photos.find(p => p.id === photoId)!)
      setSelectedPhotos(prev => prev.filter(id => id !== photoId))
    } catch (error) {
      console.error('Failed to delete photo:', error)
    }
  }, [readonly, photos, onPhotoDelete])

  const handleDownload = useCallback(async (photo: ScopeItemPhoto) => {
    try {
      const url = await photoService.getDownloadUrl(photo.id)
      if (url) {
        const link = document.createElement('a')
        link.href = url
        link.download = photo.file_name
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    } catch (error) {
      console.error('Failed to download photo:', error)
    }
  }, [])

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getPhotoTypeColor = (type: PhotoType) => {
    const colors = {
      progress: 'bg-blue-100 text-blue-800',
      before: 'bg-yellow-100 text-yellow-800',
      after: 'bg-green-100 text-green-800',
      completion: 'bg-purple-100 text-purple-800',
      issue: 'bg-red-100 text-red-800',
      reference: 'bg-gray-100 text-gray-800'
    }
    return colors[type] || 'bg-gray-100 text-gray-800'
  }

  const getPhotoTypeIcon = (type: PhotoType) => {
    switch (type) {
      case 'progress': return <Camera className="w-3 h-3" />
      case 'before': return <ChevronLeft className="w-3 h-3" />
      case 'after': return <ChevronRight className="w-3 h-3" />
      case 'completion': return <Star className="w-3 h-3" />
      case 'issue': return <FileText className="w-3 h-3" />
      default: return <Layers className="w-3 h-3" />
    }
  }

  // Filter out photos already rendered inside a Before & After pair card.
  // Membership is based on the actual rendered pairs (not the
  // is_before_after_pair flag) so orphaned half-pairs - e.g. an 'after'
  // photo whose partner was deleted - still render as standalone photos
  // instead of silently disappearing from the gallery. Pair cards only
  // exist in grid view, so in list view nothing is excluded - every photo
  // renders as its own row.
  const renderedPairIds = new Set(
    viewMode === 'grid'
      ? beforeAfterPairs.flatMap(pair => [pair.before.id, pair.after.id])
      : []
  )
  const unpairedPhotos = photos.filter(photo => !renderedPairIds.has(photo.id))

  const renderGridItem = (photo: ScopeItemPhoto) => {
    const isSelected = selectedPhotos.includes(photo.id)
    const isPairingSelected = pairingSelection.includes(photo.id)
    const isPrimary = photo.is_primary

    return (
      <div
        key={photo.id}
        className={`group relative bg-white rounded-lg border-2 overflow-hidden cursor-pointer transition-all hover:shadow-lg ${
          isSelected ? 'border-blue-500 ring-2 ring-blue-500 ring-opacity-50' :
          isPairingSelected ? 'border-purple-500 ring-2 ring-purple-500 ring-opacity-50' :
          'border-gray-200'
        }`}
        onClick={() => handlePhotoClick(photo)}
      >
        {/* Photo */}
        <div className="aspect-square relative">
          {photo.signed_url ? (
            <Image
              src={photo.signed_url}
              alt={photo.title || photo.file_name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, (max-width: 1536px) 33vw, 25vw"
            />
          ) : (
            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
              <Camera className="w-12 h-12 text-gray-400" />
            </div>
          )}

          {/* Primary Badge */}
          {isPrimary && (
            <div className="absolute top-2 right-2">
              <div className="flex items-center space-x-1 bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                <Star className="w-3 h-3" />
                Primary
              </div>
            </div>
          )}

          {/* Photo Type Badge */}
          <div className="absolute top-2 left-2">
            <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getPhotoTypeColor(photo.photo_type)}`}>
              {getPhotoTypeIcon(photo.photo_type)}
              <span className="capitalize">{photo.photo_type}</span>
            </div>
          </div>

          {/* Annotations Count */}
          {showAnnotations && photo.annotations_count && photo.annotations_count > 0 && (
            <div className="absolute bottom-2 left-2">
              <div className="bg-black bg-opacity-50 text-white px-2 py-1 rounded-full text-xs">
                {photo.annotations_count} annotations
              </div>
            </div>
          )}

          {/* Hover Actions */}
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-opacity flex items-center justify-center opacity-0 group-hover:opacity-100">
            <button
              onClick={(e) => {
                e.stopPropagation()
                handlePhotoClick(photo)
              }}
              className="p-2 bg-white rounded-full mx-1 shadow-lg"
            >
              <Eye className="w-4 h-4 text-gray-700" />
            </button>

            {!readonly && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleSetPrimary(photo.id)
                  }}
                  className="p-2 bg-white rounded-full mx-1 shadow-lg"
                >
                  {isPrimary ? (
                    <StarOff className="w-4 h-4 text-gray-700" />
                  ) : (
                    <Star className="w-4 h-4 text-gray-700" />
                  )}
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(photo.id)
                  }}
                  className="p-2 bg-white rounded-full mx-1 shadow-lg hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Photo Info */}
        <div className="p-3">
          <p className="font-medium text-gray-900 truncate">
            {photo.title || photo.file_name}
          </p>
          <p className="text-sm text-gray-500 truncate">
            {formatFileSize(photo.file_size)} • {formatDate(photo.uploaded_at)}
          </p>
        </div>
      </div>
    )
  }

  const renderListItem = (photo: ScopeItemPhoto) => {
    const isSelected = selectedPhotos.includes(photo.id)
    const isPairingSelected = pairingSelection.includes(photo.id)
    const isPrimary = photo.is_primary

    return (
      <div
        key={photo.id}
        className={`flex items-center p-4 bg-white border rounded-lg hover:shadow-md transition-all cursor-pointer ${
          isSelected ? 'border-blue-500 ring-2 ring-blue-500 ring-opacity-50' :
          isPairingSelected ? 'border-purple-500 ring-2 ring-purple-500 ring-opacity-50' :
          'border-gray-200'
        }`}
        onClick={() => handlePhotoClick(photo)}
      >
        {/* Thumbnail */}
        <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-gray-100">
          {photo.signed_url ? (
            <Image
              src={photo.signed_url}
              alt={photo.title || photo.file_name}
              width={80}
              height={80}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Camera className="w-8 h-8 text-gray-400" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 ml-4 min-w-0">
          <div className="flex items-center space-x-2">
            <p className="font-medium text-gray-900 truncate">
              {photo.title || photo.file_name}
            </p>
            {isPrimary && (
              <Star className="w-4 h-4 text-yellow-500 fill-current" />
            )}
            <span className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getPhotoTypeColor(photo.photo_type)}`}>
              {getPhotoTypeIcon(photo.photo_type)}
              <span className="capitalize">{photo.photo_type}</span>
            </span>
          </div>
          <p className="text-sm text-gray-500 truncate">
            {formatFileSize(photo.file_size)} • {formatDate(photo.uploaded_at)}
          </p>
          {photo.description && (
            <p className="text-sm text-gray-600 line-clamp-2 mt-1">
              {photo.description}
            </p>
          )}
          {showAnnotations && photo.annotations_count && photo.annotations_count > 0 && (
            <p className="text-xs text-blue-600 mt-1">
              {photo.annotations_count} annotations
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2 ml-4">
          <button
            onClick={(e) => {
              e.stopPropagation()
              handlePhotoClick(photo)
            }}
            className="p-2 text-gray-400 hover:text-gray-600"
          >
            <Eye className="w-4 h-4" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation()
              handleDownload(photo)
            }}
            className="p-2 text-gray-400 hover:text-gray-600"
          >
            <Download className="w-4 h-4" />
          </button>

          {!readonly && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleSetPrimary(photo.id)
                }}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                {isPrimary ? (
                  <StarOff className="w-4 h-4" />
                ) : (
                  <Star className="w-4 h-4" />
                )}
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete(photo.id)
                }}
                className="p-2 text-gray-400 hover:text-red-600"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  const renderBeforeAfterPair = (pair: BeforeAfterPair, index: number) => {
    return (
      <div
        key={`pair-${index}`}
        className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
      >
        <div className="p-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Before & After</span>
            <span className="text-xs text-gray-500">
              {formatDate(pair.before.uploaded_at)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 p-4">
          {/* Before Photo */}
          <div className="relative">
            <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
              {pair.before.signed_url ? (
                <Image
                  src={pair.before.signed_url}
                  alt={pair.before.title || 'Before'}
                  fill
                  className="object-cover"
                  sizes="50vw"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Camera className="w-8 h-8 text-gray-400" />
                </div>
              )}
            </div>
            <div className="absolute top-2 left-2">
              <span className="bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                Before
              </span>
            </div>
          </div>

          {/* After Photo */}
          <div className="relative">
            <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
              {pair.after.signed_url ? (
                <Image
                  src={pair.after.signed_url}
                  alt={pair.after.title || 'After'}
                  fill
                  className="object-cover"
                  sizes="50vw"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Camera className="w-8 h-8 text-gray-400" />
                </div>
              )}
            </div>
            <div className="absolute top-2 left-2">
              <span className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                After
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (photos.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <Camera className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No photos yet</h3>
        <p className="text-gray-500">
          Upload photos to document your progress and keep track of changes.
        </p>
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Photos ({photos.length})
          </h2>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Grid className="w-4 h-4 inline-block mr-1" />
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <List className="w-4 h-4 inline-block mr-1" />
              List
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2">
          {allowBeforeAfter && !readonly && beforeAfterPairs.length < unpairedPhotos.length / 2 && (
            <button
              onClick={() => setShowPairingMode(!showPairingMode)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                showPairingMode
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Layers className="w-4 h-4 inline-block mr-1" />
              {showPairingMode ? 'Cancel Pairing' : 'Pair Before/After'}
            </button>
          )}
        </div>
      </div>

      {/* Before/After Pairs */}
      {viewMode === 'grid' && beforeAfterPairs.length > 0 && (
        <div className="mb-6">
          <h3 className="text-md font-medium text-gray-700 mb-3">Before & After Pairs</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {beforeAfterPairs.map((pair, index) => renderBeforeAfterPair(pair, index))}
          </div>
        </div>
      )}

      {/* Regular Photos */}
      <div>
        {beforeAfterPairs.length > 0 && unpairedPhotos.length > 0 && (
          <h3 className="text-md font-medium text-gray-700 mb-3">Other Photos</h3>
        )}

        {viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {unpairedPhotos.map(renderGridItem)}
          </div>
        ) : (
          <div className="space-y-2">
            {unpairedPhotos.map(renderListItem)}
          </div>
        )}
      </div>

      {/* Pairing Mode Instructions */}
      {showPairingMode && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-purple-600 text-white px-6 py-3 rounded-full shadow-lg z-50">
          <p className="text-sm font-medium">
            {pairingSelection.length === 0
              ? 'Click 2 photos to create a before/after pair'
              : pairingSelection.length === 1
              ? 'Select one more photo to complete the pair'
              : 'Creating pair...'}
          </p>
        </div>
      )}
    </div>
  )
}