'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { PhotoAnnotationsProps, AnnotationType, PhotoAnnotation, AnnotationCoordinates } from '@/lib/types/photo'
import { photoService } from '@/lib/services/photoService'
import {
  Arrow,
  Circle,
  Square,
  Type,
  Ruler,
  MapPin,
  Trash2,
  Save,
  X,
  Palette
} from 'lucide-react'

const ANNOTATION_TOOLS = [
  { type: 'arrow' as AnnotationType, name: 'Arrow', icon: Arrow, cursor: 'crosshair' },
  { type: 'circle' as AnnotationType, name: 'Circle', icon: Circle, cursor: 'crosshair' },
  { type: 'rectangle' as AnnotationType, name: 'Rectangle', icon: Square, cursor: 'crosshair' },
  { type: 'text' as AnnotationType, name: 'Text', icon: Type, cursor: 'text' },
  { type: 'pin' as AnnotationType, name: 'Pin', icon: MapPin, cursor: 'pointer' },
  { type: 'measurement' as AnnotationType, name: 'Measure', icon: Ruler, cursor: 'crosshair' }
]

const DEFAULT_COLORS = [
  '#FF0000', // Red
  '#00FF00', // Green
  '#0000FF', // Blue
  '#FFFF00', // Yellow
  '#FF00FF', // Magenta
  '#00FFFF', // Cyan
  '#FFA500', // Orange
  '#800080', // Purple
  '#FFFFFF', // White
  '#000000'  // Black
]

export default function PhotoAnnotations({
  photo,
  annotations,
  onAnnotationAdd,
  onAnnotationUpdate,
  onAnnotationDelete,
  readonly = false,
  activeTool,
  onToolChange
}: PhotoAnnotationsProps) {
  const [currentTool, setCurrentTool] = useState<AnnotationType | null>(activeTool || null)
  const [currentColor, setCurrentColor] = useState('#FF0000')
  const [strokeWidth, setStrokeWidth] = useState(3)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentAnnotation, setCurrentAnnotation] = useState<Partial<PhotoAnnotation> | null>(null)
  const [tempText, setTempText] = useState('')
  const [showTextInput, setShowTextInput] = useState(false)
  const [textPosition, setTextPosition] = useState({ x: 0, y: 0 })
  const [selectedAnnotation, setSelectedAnnotation] = useState<PhotoAnnotation | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    setCurrentTool(activeTool || null)
  }, [activeTool])

  const getRelativeCoordinates = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return { x: 0, y: 0 }

    const rect = containerRef.current.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (readonly || !currentTool) return

    const coords = getRelativeCoordinates(e)

    switch (currentTool) {
      case 'pin':
        // Pin is a single click
        const pinAnnotation: Partial<PhotoAnnotation> = {
          photo_id: photo.id,
          annotation_type: 'pin',
          coordinates: { x: coords.x, y: coords.y },
          color: currentColor,
          stroke_width: 1
        }
        addAnnotation(pinAnnotation)
        break

      case 'text':
        // Show text input at click position
        setTextPosition(coords)
        setShowTextInput(true)
        setTempText('')
        break

      case 'circle':
      case 'rectangle':
      case 'arrow':
      case 'measurement':
        // Start drawing
        setIsDrawing(true)
        setCurrentAnnotation({
          photo_id: photo.id,
          annotation_type: currentTool,
          coordinates: { x: coords.x, y: coords.x, width: 0, height: 0, endX: coords.x, endY: coords.y },
          color: currentColor,
          stroke_width: strokeWidth
        })
        break
    }
  }, [readonly, currentTool, getRelativeCoordinates, currentColor, strokeWidth, photo.id])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !currentAnnotation) return

    const coords = getRelativeCoordinates(e)
    const startX = currentAnnotation.coordinates?.x || 0
    const startY = currentAnnotation.coordinates?.y || 0

    const updatedAnnotation = {
      ...currentAnnotation,
      coordinates: {
        ...currentAnnotation.coordinates!,
        endX: coords.x,
        endY: coords.y,
        width: Math.abs(coords.x - startX),
        height: Math.abs(coords.y - startY)
      }
    }

    setCurrentAnnotation(updatedAnnotation)
  }, [isDrawing, currentAnnotation, getRelativeCoordinates])

  const handleMouseUp = useCallback(() => {
    if (!isDrawing || !currentAnnotation) return

    // Only save if the annotation has some size
    const coords = currentAnnotation.coordinates
    if (
      currentAnnotation.annotation_type === 'pin' ||
      (coords && (
        Math.abs((coords.endX || 0) - (coords.x || 0)) > 5 ||
        Math.abs((coords.endY || 0) - (coords.y || 0)) > 5
      ))
    ) {
      addAnnotation(currentAnnotation)
    }

    setIsDrawing(false)
    setCurrentAnnotation(null)
  }, [isDrawing, currentAnnotation])

  const handleTextInputSubmit = useCallback(() => {
    if (!tempText.trim()) {
      setShowTextInput(false)
      return
    }

    const textAnnotation: Partial<PhotoAnnotation> = {
      photo_id: photo.id,
      annotation_type: 'text',
      coordinates: { x: textPosition.x, y: textPosition.y },
      text_content: tempText,
      color: currentColor,
      stroke_width: 1
    }

    addAnnotation(textAnnotation)
    setShowTextInput(false)
    setTempText('')
  }, [tempText, textPosition, currentColor, photo.id])

  const addAnnotation = useCallback(async (annotation: Partial<PhotoAnnotation>) => {
    if (!annotation.photo_id || !annotation.annotation_type || !annotation.coordinates) return

    try {
      const newAnnotation = await photoService.addAnnotation(annotation as Omit<PhotoAnnotation, 'id' | 'user_id' | 'created_at' | 'updated_at'>)
      if (newAnnotation) {
        onAnnotationAdd?.(newAnnotation)
      }
    } catch (error) {
      console.error('Failed to add annotation:', error)
    }
  }, [onAnnotationAdd])

  const updateAnnotation = useCallback(async (annotation: PhotoAnnotation) => {
    try {
      const updatedAnnotation = await photoService.updateAnnotation(annotation.id, annotation)
      if (updatedAnnotation) {
        onAnnotationUpdate?.(updatedAnnotation)
      }
    } catch (error) {
      console.error('Failed to update annotation:', error)
    }
  }, [onAnnotationUpdate])

  const deleteAnnotation = useCallback(async (annotationId: string) => {
    try {
      await photoService.deleteAnnotation(annotationId)
      onAnnotationDelete?.(annotations.find(a => a.id === annotationId)!)
      setSelectedAnnotation(null)
    } catch (error) {
      console.error('Failed to delete annotation:', error)
    }
  }, [annotations, onAnnotationDelete])

  const handleAnnotationClick = useCallback((e: React.MouseEvent, annotation: PhotoAnnotation) => {
    e.stopPropagation()
    if (!readonly) {
      setSelectedAnnotation(annotation)
    }
  }, [readonly])

  const renderAnnotation = useCallback((annotation: PhotoAnnotation) => {
    const coords = annotation.coordinates
    const isSelected = selectedAnnotation?.id === annotation.id

    switch (annotation.annotation_type) {
      case 'pin':
        return (
          <g key={annotation.id}>
            <circle
              cx={coords.x}
              cy={coords.y}
              r="8"
              fill={annotation.color}
              stroke="white"
              strokeWidth="2"
              className={`cursor-pointer ${isSelected ? 'opacity-100' : 'opacity-80'} hover:opacity-100`}
              onClick={(e) => handleAnnotationClick(e, annotation)}
            />
            <circle
              cx={coords.x}
              cy={coords.y}
              r="3"
              fill="white"
              pointerEvents="none"
            />
          </g>
        )

      case 'circle':
        const radius = Math.sqrt(Math.pow(coords.width || 0, 2) + Math.pow(coords.height || 0, 2)) / 2
        const centerX = coords.x + (coords.width || 0) / 2
        const centerY = coords.y + (coords.height || 0) / 2

        return (
          <circle
            key={annotation.id}
            cx={centerX}
            cy={centerY}
            r={radius}
            fill="none"
            stroke={annotation.color}
            strokeWidth={annotation.stroke_width}
            className={`cursor-pointer ${isSelected ? 'opacity-100' : 'opacity-80'} hover:opacity-100`}
            onClick={(e) => handleAnnotationClick(e, annotation)}
          />
        )

      case 'rectangle':
        return (
          <rect
            key={annotation.id}
            x={Math.min(coords.x, coords.endX || coords.x)}
            y={Math.min(coords.y, coords.endY || coords.y)}
            width={coords.width}
            height={coords.height}
            fill="none"
            stroke={annotation.color}
            strokeWidth={annotation.stroke_width}
            className={`cursor-pointer ${isSelected ? 'opacity-100' : 'opacity-80'} hover:opacity-100`}
            onClick={(e) => handleAnnotationClick(e, annotation)}
          />
        )

      case 'arrow':
        const endX = coords.endX || coords.x
        const endY = coords.endY || coords.y

        return (
          <g key={annotation.id}>
            <defs>
              <marker
                id={`arrowhead-${annotation.id}`}
                markerWidth="10"
                markerHeight="10"
                refX="9"
                refY="3"
                orient="auto"
                fill={annotation.color}
              >
                <polygon points="0 0, 10 3, 0 6" />
              </marker>
            </defs>
            <line
              x1={coords.x}
              y1={coords.y}
              x2={endX}
              y2={endY}
              stroke={annotation.color}
              strokeWidth={annotation.stroke_width}
              markerEnd={`url(#arrowhead-${annotation.id})`}
              className={`cursor-pointer ${isSelected ? 'opacity-100' : 'opacity-80'} hover:opacity-100`}
              onClick={(e) => handleAnnotationClick(e, annotation)}
            />
          </g>
        )

      case 'text':
        return (
          <g key={annotation.id}>
            <rect
              x={coords.x - 5}
              y={coords.y - 20}
              width={(annotation.text_content?.length || 0) * 8 + 10}
              height="25"
              fill={annotation.color}
              rx="3"
              className={`cursor-pointer ${isSelected ? 'opacity-100' : 'opacity-90'} hover:opacity-100`}
              onClick={(e) => handleAnnotationClick(e, annotation)}
            />
            <text
              x={coords.x}
              y={coords.y - 2}
              fill="white"
              fontSize="14"
              fontWeight="500"
              textAnchor="middle"
              pointerEvents="none"
            >
              {annotation.text_content}
            </text>
          </g>
        )

      case 'measurement':
        const measEndX = coords.endX || coords.x
        const measEndY = coords.endY || coords.y
        const distance = Math.sqrt(Math.pow(measEndX - coords.x, 2) + Math.pow(measEndY - coords.y, 2))
        const midX = (coords.x + measEndX) / 2
        const midY = (coords.y + measEndY) / 2

        return (
          <g key={annotation.id}>
            <line
              x1={coords.x}
              y1={coords.y}
              x2={measEndX}
              y2={measEndY}
              stroke={annotation.color}
              strokeWidth={annotation.stroke_width}
              strokeDasharray="5,5"
              className={`cursor-pointer ${isSelected ? 'opacity-100' : 'opacity-80'} hover:opacity-100`}
              onClick={(e) => handleAnnotationClick(e, annotation)}
            />
            <circle cx={coords.x} cy={coords.y} r="4" fill={annotation.color} />
            <circle cx={measEndX} cy={measEndY} r="4" fill={annotation.color} />
            <rect
              x={midX - 30}
              y={midY - 10}
              width="60"
              height="20"
              fill="white"
              stroke={annotation.color}
              strokeWidth="1"
              rx="2"
            />
            <text
              x={midX}
              y={midY + 3}
              fill={annotation.color}
              fontSize="12"
              fontWeight="600"
              textAnchor="middle"
              pointerEvents="none"
            >
              {Math.round(distance)}px
            </text>
          </g>
        )

      default:
        return null
    }
  }, [selectedAnnotation, handleAnnotationClick])

  const renderCurrentAnnotation = useCallback(() => {
    if (!currentAnnotation || !isDrawing) return null

    // Create a temporary annotation with current data
    const tempAnnotation: PhotoAnnotation = {
      id: 'temp',
      photo_id: photo.id,
      user_id: '',
      annotation_type: currentAnnotation.annotation_type!,
      coordinates: currentAnnotation.coordinates!,
      text_content: currentAnnotation.text_content,
      color: currentAnnotation.color!,
      stroke_width: currentAnnotation.stroke_width!,
      created_at: '',
      updated_at: ''
    }

    return renderAnnotation(tempAnnotation)
  }, [currentAnnotation, isDrawing, photo.id, renderAnnotation])

  return (
    <div className={`relative w-full h-full ${className}`}>
      {/* Annotation SVG Overlay */}
      <svg
        ref={svgRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 10 }}
      >
        {/* Render existing annotations */}
        {annotations.map(renderAnnotation)}

        {/* Render current drawing annotation */}
        {renderCurrentAnnotation()}
      </svg>

      {/* Drawing Surface */}
      <div
        ref={containerRef}
        className={`absolute inset-0 w-full h-full ${!readonly && currentTool ? 'pointer-events-auto' : 'pointer-events-none'}`}
        style={{ cursor: currentTool ? ANNOTATION_TOOLS.find(t => t.type === currentTool)?.cursor : 'default' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />

      {/* Text Input Modal */}
      {showTextInput && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 shadow-lg">
            <h3 className="text-lg font-semibold mb-3">Add Text Annotation</h3>
            <input
              type="text"
              value={tempText}
              onChange={(e) => setTempText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleTextInputSubmit()}
              placeholder="Enter text..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <div className="flex justify-end space-x-2 mt-3">
              <button
                onClick={() => setShowTextInput(false)}
                className="px-3 py-1.5 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleTextInputSubmit}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Annotation Tools (when not readonly) */}
      {!readonly && (
        <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-2 space-y-2 z-20">
          <div className="grid grid-cols-3 gap-1">
            {ANNOTATION_TOOLS.map((tool) => (
              <button
                key={tool.type}
                onClick={() => {
                  const newTool = currentTool === tool.type ? null : tool.type
                  setCurrentTool(newTool)
                  onToolChange?.(newTool)
                }}
                className={`p-2 rounded transition-colors ${
                  currentTool === tool.type
                    ? 'bg-blue-100 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                title={tool.name}
              >
                <tool.icon className="w-4 h-4" />
              </button>
            ))}
          </div>

          {/* Color Picker */}
          {currentTool && (
            <div className="border-t pt-2">
              <p className="text-xs font-medium text-gray-700 mb-1">Color</p>
              <div className="grid grid-cols-5 gap-1">
                {DEFAULT_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setCurrentColor(color)}
                    className={`w-6 h-6 rounded border-2 ${
                      currentColor === color ? 'border-gray-800' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Stroke Width (for drawing tools) */}
          {currentTool && ['circle', 'rectangle', 'arrow'].includes(currentTool) && (
            <div className="border-t pt-2">
              <p className="text-xs font-medium text-gray-700 mb-1">Width: {strokeWidth}px</p>
              <input
                type="range"
                min="1"
                max="10"
                value={strokeWidth}
                onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
                className="w-full"
              />
            </div>
          )}

          {/* Instructions */}
          {currentTool && (
            <div className="border-t pt-2 text-xs text-gray-600">
              {currentTool === 'pin' && 'Click to add pin'}
              {currentTool === 'text' && 'Click to add text'}
              {currentTool === 'circle' && 'Click and drag to draw circle'}
              {currentTool === 'rectangle' && 'Click and drag to draw rectangle'}
              {currentTool === 'arrow' && 'Click and drag to draw arrow'}
              {currentTool === 'measurement' && 'Click and drag to measure'}
            </div>
          )}
        </div>
      )}

      {/* Selected Annotation Actions */}
      {selectedAnnotation && !readonly && (
        <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-2 space-y-1 z-20">
          <button
            onClick={() => {
              deleteAnnotation(selectedAnnotation.id)
            }}
            className="w-full flex items-center space-x-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
          <button
            onClick={() => {
              setSelectedAnnotation(null)
            }}
            className="w-full flex items-center space-x-2 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 rounded transition-colors"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}