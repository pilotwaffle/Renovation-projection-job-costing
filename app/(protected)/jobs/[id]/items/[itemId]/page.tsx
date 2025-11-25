'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ScopeItemWithCategory, ScopeItemPhoto } from '@/lib/types'
import { PhotoUploader, PhotoGallery, PhotoModal } from '@/components/photos'
import { photoService } from '@/lib/services/photoService'
import {
  ArrowLeft,
  Camera,
  Edit3,
  DollarSign,
  Clock,
  CheckCircle,
  Circle,
  Calendar,
  Tag
} from 'lucide-react'

export default function ScopeItemDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [scopeItem, setScopeItem] = useState<ScopeItemWithCategory | null>(null)
  const [photos, setPhotos] = useState<ScopeItemPhoto[]>([])
  const [selectedPhoto, setSelectedPhoto] = useState<ScopeItemPhoto | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadScopeItem()
    loadPhotos()
  }, [params.id, params.itemId])

  const loadScopeItem = async () => {
    try {
      const { data, error } = await supabase
        .from('scope_items')
        .select(`
          *,
          category:categories(*),
          budget_version:budget_versions!inner(job:jobs(*))
        `)
        .eq('id', params.itemId)
        .single()

      if (error) throw error
      setScopeItem(data)
    } catch (error) {
      console.error('Failed to load scope item:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadPhotos = async () => {
    try {
      const itemPhotos = await photoService.getScopeItemPhotos(params.itemId as string)
      setPhotos(itemPhotos)
    } catch (error) {
      console.error('Failed to load photos:', error)
    }
  }

  const handlePhotoSelect = (photo: ScopeItemPhoto) => {
    const index = photos.findIndex(p => p.id === photo.id)
    setCurrentPhotoIndex(index)
    setSelectedPhoto(photo)
    setIsModalOpen(true)
  }

  const handlePhotoUpload = async (results: any[]) => {
    // Reload photos after upload
    await loadPhotos()
  }

  const handlePhotoDelete = async (photo: ScopeItemPhoto) => {
    try {
      await photoService.deletePhoto(photo.id)
      await loadPhotos()
    } catch (error) {
      console.error('Failed to delete photo:', error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading scope item...</p>
        </div>
      </div>
    )
  }

  if (!scopeItem) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Scope Item Not Found</h1>
          <p className="text-gray-600 mb-4">The scope item you're looking for doesn't exist.</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  const estimated = scopeItem.estimated_material_cost + (scopeItem.estimated_labor_hours * scopeItem.estimated_labor_rate)
  const actual = scopeItem.actual_material_cost + (scopeItem.actual_labor_hours * scopeItem.estimated_labor_rate)
  const variance = actual - estimated

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="py-8">
        <header className="mb-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <button
              onClick={() => router.back()}
              className="flex items-center text-blue-600 hover:text-blue-500 mb-4 text-sm"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Job
            </button>

            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {scopeItem.description}
                </h1>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  {scopeItem.category && (
                    <div className="flex items-center">
                      <Tag className="w-4 h-4 mr-1" />
                      {scopeItem.category.name}
                    </div>
                  )}
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    Created {formatDate(scopeItem.created_at)}
                  </div>
                  <div className="flex items-center">
                    {scopeItem.is_completed ? (
                      <>
                        <CheckCircle className="w-4 h-4 mr-1 text-green-600" />
                        Completed
                      </>
                    ) : (
                      <>
                        <Circle className="w-4 h-4 mr-1 text-gray-400" />
                        In Progress
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => router.push(`/jobs/${params.id}/items/${params.itemId}/edit`)}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Edit Costs
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Cost Summary Cards */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-4 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <DollarSign className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Estimated</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {formatCurrency(estimated)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Actual</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {formatCurrency(actual)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className={`p-2 rounded-lg ${variance > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
                  <DollarSign className={`w-6 h-6 ${variance > 0 ? 'text-red-600' : 'text-green-600'}`} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Variance</p>
                  <p className={`text-2xl font-semibold ${variance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {variance > 0 ? '+' : ''}{formatCurrency(variance)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Clock className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Labor Hours</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {scopeItem.actual_labor_hours || scopeItem.estimated_labor_hours}h
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Cost Breakdown */}
          <div className="bg-white rounded-lg shadow mb-8">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Cost Breakdown</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Estimated Costs</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Material:</span>
                      <span className="font-medium">{formatCurrency(scopeItem.estimated_material_cost)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Labor:</span>
                      <span className="font-medium">
                        {scopeItem.estimated_labor_hours}h × {formatCurrency(scopeItem.estimated_labor_rate)}/h = {formatCurrency(scopeItem.estimated_labor_hours * scopeItem.estimated_labor_rate)}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-gray-200">
                      <span className="font-medium">Total Estimated:</span>
                      <span className="font-bold">{formatCurrency(estimated)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Actual Costs</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Material:</span>
                      <span className="font-medium">{formatCurrency(scopeItem.actual_material_cost)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Labor:</span>
                      <span className="font-medium">
                        {scopeItem.actual_labor_hours}h × {formatCurrency(scopeItem.estimated_labor_rate)}/h = {formatCurrency(scopeItem.actual_labor_hours * scopeItem.estimated_labor_rate)}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-gray-200">
                      <span className="font-medium">Total Actual:</span>
                      <span className="font-bold">{formatCurrency(actual)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {scopeItem.notes && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Notes</h3>
                  <p className="text-gray-600">{scopeItem.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Photos Section */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Camera className="w-5 h-5 mr-2 text-gray-600" />
                  <h2 className="text-lg font-medium text-gray-900">
                    Photos ({photos.length})
                  </h2>
                </div>
              </div>
            </div>

            <div className="p-6">
              {/* Photo Uploader */}
              <div className="mb-8">
                <PhotoUploader
                  scope_item_id={scopeItem.id}
                  onUploadComplete={handlePhotoUpload}
                  maxFiles={20}
                  maxSize={10 * 1024 * 1024} // 10MB
                />
              </div>

              {/* Photo Gallery */}
              <PhotoGallery
                photos={photos}
                scope_item_id={scopeItem.id}
                onPhotoSelect={handlePhotoSelect}
                onPhotoDelete={handlePhotoDelete}
                showAnnotations={true}
                allowBeforeAfter={true}
              />
            </div>
          </div>
        </main>
      </div>

      {/* Photo Modal */}
      <PhotoModal
        photo={selectedPhoto}
        photos={photos}
        currentIndex={currentPhotoIndex}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onPrevious={() => {
          const newIndex = currentPhotoIndex > 0 ? currentPhotoIndex - 1 : photos.length - 1
          setCurrentPhotoIndex(newIndex)
          setSelectedPhoto(photos[newIndex])
        }}
        onNext={() => {
          const newIndex = currentPhotoIndex < photos.length - 1 ? currentPhotoIndex + 1 : 0
          setCurrentPhotoIndex(newIndex)
          setSelectedPhoto(photos[newIndex])
        }}
        allowAnnotations={true}
        showMetadata={true}
      />
    </div>
  )
}