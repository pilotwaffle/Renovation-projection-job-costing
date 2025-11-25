export interface ScopeItemPhoto {
  id: string
  scope_item_id: string
  user_id: string

  // File information
  file_name: string
  file_path: string
  file_size: number
  mime_type: string
  file_hash: string

  // Photo metadata
  title?: string
  description?: string
  photo_type: PhotoType
  is_before_after_pair: boolean
  paired_photo_id?: string

  // Image properties
  width?: number
  height?: number
  aspect_ratio?: number
  dominant_color?: string

  // GPS and location data
  latitude?: number
  longitude?: number
  location_name?: string

  // Status and organization
  is_primary: boolean
  is_public: boolean
  sort_order: number

  // Metadata
  taken_at?: string
  uploaded_at: string
  created_at: string
  updated_at: string

  // Computed fields
  annotations_count?: number
  paired_photo?: ScopeItemPhoto
  annotations?: PhotoAnnotation[]
  signed_url?: string
  thumbnail_url?: string
}

export interface ScopeItemPhotoWithStats extends ScopeItemPhoto {
  annotations_count: number
}

export interface PhotoAnnotation {
  id: string
  photo_id: string
  user_id: string

  // Annotation data
  annotation_type: AnnotationType
  coordinates: AnnotationCoordinates
  text_content?: string
  color: string
  stroke_width: number

  // Metadata
  created_at: string
  updated_at: string
}

export interface AnnotationCoordinates {
  // Common properties
  x: number
  y: number

  // Type-specific properties
  width?: number  // For rectangle
  height?: number // For rectangle
  radius?: number // For circle
  endX?: number   // For arrow
  endY?: number   // For arrow
  points?: Array<{x: number, y: number}> // For freehand
}

export interface PhotoUploadOptions {
  file: File
  scope_item_id: string
  title?: string
  description?: string
  photo_type?: PhotoType
  is_public?: boolean
  onProgress?: (progress: number) => void
  onBeforeUpload?: (file: File) => Promise<File | null>
}

export interface PhotoUploadResult {
  photo: ScopeItemPhoto
  success: boolean
  error?: string
}

export interface PhotoGalleryProps {
  photos: ScopeItemPhoto[]
  scope_item_id: string
  onPhotoSelect?: (photo: ScopeItemPhoto) => void
  onPhotoUpload?: (files: File[]) => void
  onPhotoDelete?: (photo: ScopeItemPhoto) => void
  onPhotoUpdate?: (photo: ScopeItemPhoto) => void
  onBeforeAfterPair?: (beforePhoto: ScopeItemPhoto, afterPhoto: ScopeItemPhoto) => void
  readonly?: boolean
  showAnnotations?: boolean
  allowBeforeAfter?: boolean
}

export interface PhotoUploaderProps {
  scope_item_id: string
  onUploadComplete?: (results: PhotoUploadResult[]) => void
  onError?: (error: Error) => void
  maxFiles?: number
  maxSize?: number // in bytes
  acceptedTypes?: string[]
  allowMultiple?: boolean
  autoUpload?: boolean
}

export interface PhotoModalProps {
  photo: ScopeItemPhoto | null
  photos: ScopeItemPhoto[]
  currentIndex: number
  isOpen: boolean
  onClose: () => void
  onPrevious?: () => void
  onNext?: () => void
  allowAnnotations?: boolean
  showMetadata?: boolean
}

export interface BeforeAfterSliderProps {
  beforePhoto: ScopeItemPhoto
  afterPhoto: ScopeItemPhoto
  sliderPosition?: number
  onSliderChange?: (position: number) => void
  width?: number
  height?: number
  className?: string
}

export interface PhotoAnnotationsProps {
  photo: ScopeItemPhoto
  annotations: PhotoAnnotation[]
  onAnnotationAdd?: (annotation: Omit<PhotoAnnotation, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => void
  onAnnotationUpdate?: (annotation: PhotoAnnotation) => void
  onAnnotationDelete?: (annotation: PhotoAnnotation) => void
  readonly?: boolean
  activeTool?: AnnotationType
  onToolChange?: (tool: AnnotationType | null) => void
}

export interface PhotoStats {
  total_photos: number
  before_photos: number
  after_photos: number
  progress_photos: number
  completion_photos: number
  issue_photos: number
  reference_photos: number
  primary_photos: number
  public_photos: number
  before_after_pairs: number
  total_file_size: number
  average_file_size: number
}

export interface PhotoFilters {
  photo_types?: PhotoType[]
  date_range?: {
    start: Date
    end: Date
  }
  is_public?: boolean
  has_annotations?: boolean
  is_before_after?: boolean
  search_query?: string
}

export interface PhotoSortOptions {
  field: 'created_at' | 'uploaded_at' | 'taken_at' | 'file_size' | 'title' | 'sort_order'
  direction: 'asc' | 'desc'
}

export interface PhotoSearchResult {
  photos: ScopeItemPhotoWithStats[]
  total: number
  page: number
  per_page: number
}

// Types
export type PhotoType =
  | 'progress'
  | 'before'
  | 'after'
  | 'completion'
  | 'issue'
  | 'reference'

export type AnnotationType =
  | 'arrow'
  | 'circle'
  | 'rectangle'
  | 'text'
  | 'measurement'
  | 'pin'

export type PhotoUploadStatus =
  | 'pending'
  | 'uploading'
  | 'processing'
  | 'completed'
  | 'error'
  | 'cancelled'

export type PhotoViewMode =
  | 'grid'
  | 'list'
  | 'carousel'
  | 'before-after'

export type AnnotationTool = {
  type: AnnotationType
  name: string
  icon: string
  cursor: string
  defaultColor: string
  defaultStrokeWidth: number
}

// Database function parameters
export interface SetPrimaryPhotoParams {
  photo_id: string
}

export interface PairBeforeAfterParams {
  before_photo_id: string
  after_photo_id: string
}

export interface GetScopeItemPhotosParams {
  scope_item_id: string
}

export interface GetJobPhotoStatsParams {
  job_id: string
}

// Image optimization types
export interface ImageOptimizationOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
  format?: 'webp' | 'jpeg' | 'png'
  enableWebP?: boolean
  generateThumbnails?: boolean
  thumbnailSize?: number
}

export interface ProcessedImageResult {
  original: Blob
  optimized?: Blob
  thumbnail?: Blob
  metadata: ImageMetadata
}

export interface ImageMetadata {
  width: number
  height: number
  aspectRatio: number
  fileSize: number
  mimeType: string
  dominantColor?: string
  hasAlpha?: boolean
  orientation?: number
}

// File validation types
export interface FileValidationResult {
  isValid: boolean
  error?: string
  warnings?: string[]
}

export interface FileValidationOptions {
  maxSize?: number
  allowedTypes?: string[]
  minWidth?: number
  minHeight?: number
  maxWidth?: number
  maxHeight?: number
}

// Error types
export interface PhotoError extends Error {
  code: PhotoErrorCode
  details?: Record<string, any>
}

export type PhotoErrorCode =
  | 'FILE_TOO_LARGE'
  | 'INVALID_FILE_TYPE'
  | 'UPLOAD_FAILED'
  | 'STORAGE_ERROR'
  | 'PERMISSION_DENIED'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'OPTIMIZATION_ERROR'
  | 'ANNOTATION_ERROR'
  | 'BEFORE_AFTER_ERROR'

// Event types
export interface PhotoUploadStartEvent {
  type: 'upload:start'
  file: File
  photo_id?: string
}

export interface PhotoUploadProgressEvent {
  type: 'upload:progress'
  file: File
  progress: number
  bytesUploaded: number
  totalBytes: number
}

export interface PhotoUploadCompleteEvent {
  type: 'upload:complete'
  file: File
  photo: ScopeItemPhoto
}

export interface PhotoUploadErrorEvent {
  type: 'upload:error'
  file: File
  error: PhotoError
}

export type PhotoUploadEvent =
  | PhotoUploadStartEvent
  | PhotoUploadProgressEvent
  | PhotoUploadCompleteEvent
  | PhotoUploadErrorEvent

// Utility types
export type PhotoUploadHandler = (event: PhotoUploadEvent) => void

export type PhotoWithAnnotations = ScopeItemPhoto & {
  annotations: PhotoAnnotation[]
}

export type BeforeAfterPair = {
  before: ScopeItemPhoto
  after: ScopeItemPhoto
}

// Component state types
export interface PhotoGalleryState {
  selectedPhoto: ScopeItemPhoto | null
  viewMode: PhotoViewMode
  filters: PhotoFilters
  sortOptions: PhotoSortOptions
  isLoading: boolean
  error: string | null
}

export interface PhotoUploaderState {
  files: File[]
  uploadProgress: Record<string, number>
  uploadStatus: Record<string, PhotoUploadStatus>
  isDragging: boolean
  error: string | null
}

export interface PhotoModalState {
  currentIndex: number
  showAnnotations: boolean
  showMetadata: boolean
  isFullscreen: boolean
  activeTool: AnnotationType | null
}