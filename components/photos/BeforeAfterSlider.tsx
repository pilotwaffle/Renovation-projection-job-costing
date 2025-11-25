'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { BeforeAfterSliderProps, ScopeItemPhoto } from '@/lib/types/photo'
import { ChevronLeft, ChevronRight, RotateCcw, Maximize2, Download } from 'lucide-react'

export default function BeforeAfterSlider({
  beforePhoto,
  afterPhoto,
  sliderPosition: initialSliderPosition = 50,
  onSliderChange,
  width = 800,
  height = 600,
  className = ''
}: BeforeAfterSliderProps) {
  const [sliderPosition, setSliderPosition] = useState(initialSliderPosition)
  const [isDragging, setIsDragging] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const sliderRef = useRef<HTMLDivElement>(null)

  const actualWidth = isFullscreen ? '100%' : width
  const actualHeight = isFullscreen ? '100%' : height

  const updateSliderPosition = useCallback((clientX: number) => {
    if (!containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    const x = clientX - rect.left
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100))

    setSliderPosition(percentage)
    onSliderChange?.(percentage)
  }, [onSliderChange])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    updateSliderPosition(e.clientX)
  }, [updateSliderPosition])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    setIsDragging(true)
    const touch = e.touches[0]
    updateSliderPosition(touch.clientX)
  }, [updateSliderPosition])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return
    updateSliderPosition(e.clientX)
  }, [isDragging, updateSliderPosition])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging) return
    const touch = e.touches[0]
    updateSliderPosition(touch.clientX)
  }, [isDragging, updateSliderPosition])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleReset = useCallback(() => {
    setSliderPosition(50)
    onSliderChange?.(50)
  }, [onSliderChange])

  const handleDownload = useCallback(async (photo: ScopeItemPhoto) => {
    try {
      const response = await fetch(photo.signed_url || '')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${photo.photo_type}_${photo.file_name}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to download photo:', error)
    }
  }, [])

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.addEventListener('touchmove', handleTouchMove)
      document.addEventListener('touchend', handleMouseUp)

      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.removeEventListener('touchmove', handleTouchMove)
        document.removeEventListener('touchend', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove])

  useEffect(() => {
    setSliderPosition(initialSliderPosition)
  }, [initialSliderPosition])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
  }

  return (
    <div className={`relative bg-black ${className}`}>
      {/* Main Slider Container */}
      <div
        ref={containerRef}
        className={`relative overflow-hidden bg-white ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}
        style={{ width: actualWidth, height: actualHeight }}
      >
        {/* After Photo (Background) */}
        <div className="absolute inset-0">
          {afterPhoto.signed_url ? (
            <Image
              src={afterPhoto.signed_url}
              alt={afterPhoto.title || 'After'}
              fill
              className="object-contain"
              priority
              sizes="100vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-300 rounded-lg mx-auto mb-2" />
                <p className="text-gray-500">After photo not available</p>
              </div>
            </div>
          )}
        </div>

        {/* Before Photo (Clipped) */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
        >
          {beforePhoto.signed_url ? (
            <Image
              src={beforePhoto.signed_url}
              alt={beforePhoto.title || 'Before'}
              fill
              className="object-contain"
              priority
              sizes="100vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-300 rounded-lg mx-auto mb-2" />
                <p className="text-gray-500">Before photo not available</p>
              </div>
            </div>
          )}
        </div>

        {/* Slider Handle */}
        <div
          ref={sliderRef}
          className={`absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize ${isDragging ? 'opacity-100' : 'opacity-80'} hover:opacity-100 transition-opacity`}
          style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          {/* Slider Handle Button */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center border-2 border-gray-200">
            <div className="flex">
              <ChevronLeft className="w-5 h-5 text-gray-600" />
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </div>
          </div>

          {/* Top and bottom lines */}
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-0.5 h-full bg-white" />
        </div>

        {/* Labels */}
        <div className="absolute top-4 left-4 flex items-center space-x-4">
          <div className="bg-black/70 text-white px-3 py-2 rounded-lg text-sm font-medium">
            Before
          </div>
          <div className="bg-black/70 text-white px-3 py-2 rounded-lg text-sm font-medium">
            After
          </div>
        </div>

        {/* Controls */}
        {!isFullscreen && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center space-x-2">
            <button
              onClick={handleReset}
              className="p-2 bg-black/70 text-white rounded-lg hover:bg-black/80 transition-colors"
              title="Reset slider"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsFullscreen(true)}
              className="p-2 bg-black/70 text-white rounded-lg hover:bg-black/80 transition-colors"
              title="Fullscreen"
            >
              <Maximize2 className="w-4 h-4" />
            </button>

            <button
              onClick={() => handleDownload(beforePhoto)}
              className="p-2 bg-black/70 text-white rounded-lg hover:bg-black/80 transition-colors"
              title="Download before photo"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              onClick={() => handleDownload(afterPhoto)}
              className="p-2 bg-black/70 text-white rounded-lg hover:bg-black/80 transition-colors"
              title="Download after photo"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Fullscreen Close Button */}
        {isFullscreen && (
          <button
            onClick={() => setIsFullscreen(false)}
            className="absolute top-4 right-4 p-2 bg-black/70 text-white rounded-lg hover:bg-black/80 transition-colors z-10"
          >
            ×
          </button>
        )}
      </div>

      {/* Photo Information */}
      {!isFullscreen && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 text-white">
          <div className="grid grid-cols-2 gap-4 text-sm">
            {/* Before Photo Info */}
            <div>
              <p className="font-medium mb-1">Before</p>
              <div className="text-xs space-y-0.5 opacity-80">
                <p>{formatDate(beforePhoto.uploaded_at)}</p>
                <p>{formatFileSize(beforePhoto.file_size)}</p>
                {beforePhoto.width && beforePhoto.height && (
                  <p>{beforePhoto.width} × {beforePhoto.height}px</p>
                )}
              </div>
            </div>

            {/* After Photo Info */}
            <div>
              <p className="font-medium mb-1">After</p>
              <div className="text-xs space-y-0.5 opacity-80">
                <p>{formatDate(afterPhoto.uploaded_at)}</p>
                <p>{formatFileSize(afterPhoto.file_size)}</p>
                {afterPhoto.width && afterPhoto.height && (
                  <p>{afterPhoto.width} × {afterPhoto.height}px</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Navigation Instructions (Fullscreen) */}
      {isFullscreen && (
        <div className="absolute bottom-4 left-4 text-white text-xs opacity-60">
          <p>Drag slider or use arrow keys • Press ESC to exit fullscreen</p>
        </div>
      )}

      {/* Touch/Mouse Instructions */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <div className={`bg-black/50 text-white px-3 py-2 rounded-lg text-sm transition-opacity ${
          isDragging ? 'opacity-0' : 'opacity-60'
        }`}>
          Drag to compare
        </div>
      </div>
    </div>
  )
}