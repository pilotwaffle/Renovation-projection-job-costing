'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { JobPredictionInput, ScopeItem, MaterialItem, LaborItem } from '@/lib/ai/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Calculator,
  Upload,
  FileText,
  Home,
  Building,
  Factory
} from 'lucide-react';
import { toast } from 'sonner';

const jobPredictionSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  category: z.string().optional(),
  estimatedDuration: z.number().min(1).optional(),
  location: z.object({
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional()
  }).optional(),
  scope: z.array(z.object({
    id: z.string(),
    category: z.string(),
    description: z.string(),
    quantity: z.number().min(1),
    unit: z.string(),
    estimatedHours: z.number().min(0).optional(),
    complexity: z.enum(['simple', 'moderate', 'complex'])
  })).optional(),
  materials: z.array(z.object({
    id: z.string(),
    name: z.string(),
    category: z.string(),
    quantity: z.number().min(0),
    unit: z.string(),
    unitCost: z.number().min(0).optional(),
    quality: z.enum(['basic', 'standard', 'premium'])
  })).optional(),
  labor: z.array(z.object({
    id: z.string(),
    type: z.string(),
    skillLevel: z.enum(['basic', 'intermediate', 'expert']),
    estimatedHours: z.number().min(0),
    hourlyRate: z.number().min(0).optional(),
    teamSize: z.number().min(1).optional()
  })).optional(),
  propertyType: z.enum(['residential', 'commercial', 'industrial']),
  propertySize: z.number().min(1).optional(),
  yearBuilt: z.number().min(1800).max(new Date().getFullYear()).optional(),
  complexity: z.enum(['simple', 'moderate', 'complex']),
  season: z.enum(['spring', 'summer', 'fall', 'winter']).optional(),
  urgency: z.enum(['low', 'medium', 'high']).optional(),
  permitsRequired: z.boolean().default(false)
});

type JobPredictionFormData = z.infer<typeof jobPredictionSchema>;

interface PredictionFormProps {
  initialData?: Partial<JobPredictionInput>;
  onPrediction: (data: JobPredictionInput) => void;
  onBatchPrediction?: (jobs: JobPredictionInput[]) => void;
  isLoading?: boolean;
  compact?: boolean;
  models?: any[];
  selectedModel?: string;
  onModelChange?: (model: string) => void;
}

export function PredictionForm({
  initialData,
  onPrediction,
  onBatchPrediction,
  isLoading = false,
  compact = false,
  models = [],
  selectedModel = '',
  onModelChange
}: PredictionFormProps) {
  const [isScopeOpen, setIsScopeOpen] = useState(false);
  const [isMaterialsOpen, setIsMaterialsOpen] = useState(false);
  const [isLaborOpen, setIsLaborOpen] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty, isValid }
  } = useForm<JobPredictionFormData>({
    resolver: zodResolver(jobPredictionSchema),
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      category: initialData?.category || '',
      estimatedDuration: initialData?.estimatedDuration || undefined,
      location: {
        address: initialData?.location?.address || '',
        city: initialData?.location?.city || '',
        state: initialData?.location?.state || '',
        postalCode: initialData?.location?.postalCode || ''
      },
      scope: initialData?.scope || [],
      materials: initialData?.materials || [],
      labor: initialData?.labor || [],
      propertyType: initialData?.propertyType || 'residential',
      propertySize: initialData?.propertySize || undefined,
      yearBuilt: initialData?.yearBuilt || undefined,
      complexity: initialData?.complexity || 'moderate',
      season: initialData?.season || undefined,
      urgency: initialData?.urgency || 'medium',
      permitsRequired: initialData?.permitsRequired || false
    }
  });

  const {
    fields: scopeFields,
    append: appendScope,
    remove: removeScope,
    update: updateScope
  } = useFieldArray({
    control,
    name: 'scope'
  });

  const {
    fields: materialFields,
    append: appendMaterial,
    remove: removeMaterial,
    update: updateMaterial
  } = useFieldArray({
    control,
    name: 'materials'
  });

  const {
    fields: laborFields,
    append: appendLabor,
    remove: removeLabor,
    update: updateLabor
  } = useFieldArray({
    control,
    name: 'labor'
  });

  const watchedValues = watch();
  const estimatedCost = calculateEstimatedCost(watchedValues);

  // Auto-save to localStorage
  useEffect(() => {
    if (isDirty) {
      localStorage.setItem('ai-prediction-form', JSON.stringify(watchedValues));
    }
  }, [watchedValues, isDirty]);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('ai-prediction-form');
    if (saved && !initialData?.title) {
      try {
        const parsed = JSON.parse(saved);
        Object.keys(parsed).forEach(key => {
          setValue(key as any, parsed[key]);
        });
      } catch (error) {
        console.error('Failed to load saved form data:', error);
      }
    }
  }, [initialData, setValue]);

  const onSubmit = useCallback((data: JobPredictionFormData) => {
    const cleanedData = {
      ...data,
      scope: data.scope?.filter(item => item.description && item.quantity > 0),
      materials: data.materials?.filter(item => item.name && item.quantity > 0),
      labor: data.labor?.filter(item => item.type && item.estimatedHours > 0)
    };

    onPrediction(cleanedData as JobPredictionInput);
  }, [onPrediction]);

  const handleQuickPredict = useCallback(() => {
    if (!watchedValues.title) {
      toast.error('Please enter a project title');
      return;
    }

    const minimalData = {
      title: watchedValues.title,
      description: watchedValues.description,
      propertyType: watchedValues.propertyType,
      complexity: watchedValues.complexity
    };

    onPrediction(minimalData as JobPredictionInput);
  }, [watchedValues, onPrediction]);

  const addScopeItem = useCallback(() => {
    appendScope({
      id: crypto.randomUUID(),
      category: '',
      description: '',
      quantity: 1,
      unit: 'units',
      estimatedHours: 0,
      complexity: 'moderate'
    });
  }, [appendScope]);

  const addMaterialItem = useCallback(() => {
    appendMaterial({
      id: crypto.randomUUID(),
      name: '',
      category: '',
      quantity: 0,
      unit: 'units',
      unitCost: 0,
      quality: 'standard'
    });
  }, [appendMaterial]);

  const addLaborItem = useCallback(() => {
    appendLabor({
      id: crypto.randomUUID(),
      type: '',
      skillLevel: 'intermediate',
      estimatedHours: 0,
      hourlyRate: 0,
      teamSize: 1
    });
  }, [appendLabor]);

  const handleImportFromTemplate = useCallback((template: 'kitchen' | 'bathroom' | 'full-renovation') => {
    const templates = {
      kitchen: {
        title: 'Kitchen Renovation',
        description: 'Complete kitchen renovation with cabinets, countertops, and appliances',
        category: 'kitchen',
        scope: [
          { id: crypto.randomUUID(), category: 'Demolition', description: 'Remove existing cabinets and countertops', quantity: 1, unit: 'job', complexity: 'moderate' as const },
          { id: crypto.randomUUID(), category: 'Cabinets', description: 'Install new cabinets', quantity: 1, unit: 'job', complexity: 'complex' as const },
          { id: crypto.randomUUID(), category: 'Countertops', description: 'Install new countertops', quantity: 1, unit: 'job', complexity: 'moderate' as const }
        ],
        materials: [
          { id: crypto.randomUUID(), name: 'Cabinets', category: 'Cabinetry', quantity: 1, unit: 'set', unitCost: 5000, quality: 'standard' as const },
          { id: crypto.randomUUID(), name: 'Countertops', category: 'Surfaces', quantity: 30, unit: 'sq ft', unitCost: 75, quality: 'standard' as const }
        ]
      },
      bathroom: {
        title: 'Bathroom Renovation',
        description: 'Complete bathroom renovation with new fixtures and tiling',
        category: 'bathroom',
        scope: [
          { id: crypto.randomUUID(), category: 'Demolition', description: 'Remove existing fixtures and tiles', quantity: 1, unit: 'job', complexity: 'moderate' as const },
          { id: crypto.randomUUID(), category: 'Plumbing', description: 'Update plumbing fixtures', quantity: 1, unit: 'job', complexity: 'complex' as const },
          { id: crypto.randomUUID(), category: 'Tiling', description: 'Install new floor and wall tiles', quantity: 1, unit: 'job', complexity: 'moderate' as const }
        ]
      },
      'full-renovation': {
        title: 'Full Home Renovation',
        description: 'Complete home renovation including multiple rooms',
        category: 'general',
        complexity: 'complex' as const,
        estimatedDuration: 90
      }
    };

    const templateData = templates[template];
    Object.keys(templateData).forEach(key => {
      setValue(key as any, templateData[key as keyof typeof templateData]);
    });

    toast.success(`Loaded ${template.replace('-', ' ')} template`);
  }, [setValue]);

  if (compact) {
    return (
      <div className="space-y-4">
        <div>
          <Label htmlFor="title">Project Title *</Label>
          <Input
            id="title"
            {...register('title')}
            placeholder="e.g., Kitchen Renovation"
            disabled={isLoading}
          />
          {errors.title && <p className="text-sm text-red-600">{errors.title.message}</p>}
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            {...register('description')}
            placeholder="Brief description of the project..."
            rows={3}
            disabled={isLoading}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="propertyType">Property Type</Label>
            <Select value={watchedValues.propertyType} onValueChange={(value) => setValue('propertyType', value as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="residential">Residential</SelectItem>
                <SelectItem value="commercial">Commercial</SelectItem>
                <SelectItem value="industrial">Industrial</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="complexity">Complexity</Label>
            <Select value={watchedValues.complexity} onValueChange={(value) => setValue('complexity', value as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="simple">Simple</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="complex">Complex</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          type="button"
          onClick={handleQuickPredict}
          disabled={isLoading || !watchedValues.title}
          className="w-full"
        >
          {isLoading ? 'Predicting...' : 'Quick Predict'}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Model Selection */}
      {models.length > 0 && onModelChange && (
        <div>
          <Label htmlFor="model">Prediction Model</Label>
          <Select value={selectedModel} onValueChange={onModelChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select model" />
            </SelectTrigger>
            <SelectContent>
              {models.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  {model.name} (v{model.version}) - {model.accuracy}% accuracy
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Quick Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Quick Templates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleImportFromTemplate('kitchen')}
              className="h-auto p-4 flex flex-col items-start"
            >
              <div className="font-medium">Kitchen</div>
              <div className="text-sm text-gray-600">Complete kitchen renovation</div>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleImportFromTemplate('bathroom')}
              className="h-auto p-4 flex flex-col items-start"
            >
              <div className="font-medium">Bathroom</div>
              <div className="text-sm text-gray-600">Complete bathroom renovation</div>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleImportFromTemplate('full-renovation')}
              className="h-auto p-4 flex flex-col items-start"
            >
              <div className="font-medium">Full Home</div>
              <div className="text-sm text-gray-600">Complete home renovation</div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">Project Title *</Label>
            <Input
              id="title"
              {...register('title')}
              placeholder="e.g., Kitchen Renovation"
              disabled={isLoading}
            />
            {errors.title && <p className="text-sm text-red-600">{errors.title.message}</p>}
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Detailed description of the project scope, requirements, and special considerations..."
              rows={4}
              disabled={isLoading}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={watchedValues.category} onValueChange={(value) => setValue('category', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kitchen">Kitchen</SelectItem>
                  <SelectItem value="bathroom">Bathroom</SelectItem>
                  <SelectItem value="flooring">Flooring</SelectItem>
                  <SelectItem value="painting">Painting</SelectItem>
                  <SelectItem value="plumbing">Plumbing</SelectItem>
                  <SelectItem value="electrical">Electrical</SelectItem>
                  <SelectItem value="roofing">Roofing</SelectItem>
                  <SelectItem value="hvac">HVAC</SelectItem>
                  <SelectItem value="exterior">Exterior</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="propertyType">Property Type</Label>
              <Select value={watchedValues.propertyType} onValueChange={(value) => setValue('propertyType', value as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="residential">
                    <div className="flex items-center">
                      <Home className="h-4 w-4 mr-2" />
                      Residential
                    </div>
                  </SelectItem>
                  <SelectItem value="commercial">
                    <div className="flex items-center">
                      <Building className="h-4 w-4 mr-2" />
                      Commercial
                    </div>
                  </SelectItem>
                  <SelectItem value="industrial">
                    <div className="flex items-center">
                      <Factory className="h-4 w-4 mr-2" />
                      Industrial
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="complexity">Complexity</Label>
              <Select value={watchedValues.complexity} onValueChange={(value) => setValue('complexity', value as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="simple">Simple</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="complex">Complex</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Location Information */}
      <Card>
        <CardHeader>
          <CardTitle>Location Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              {...register('location.address')}
              placeholder="123 Main St"
              disabled={isLoading}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                {...register('location.city')}
                placeholder="New York"
                disabled={isLoading}
              />
            </div>

            <div>
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                {...register('location.state')}
                placeholder="NY"
                disabled={isLoading}
              />
            </div>

            <div>
              <Label htmlFor="postalCode">Postal Code</Label>
              <Input
                id="postalCode"
                {...register('location.postalCode')}
                placeholder="10001"
                disabled={isLoading}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Property Details */}
      <Card>
        <CardHeader>
          <CardTitle>Property Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="propertySize">Property Size (sq ft)</Label>
              <Input
                id="propertySize"
                type="number"
                {...register('propertySize', { valueAsNumber: true })}
                placeholder="2000"
                disabled={isLoading}
              />
            </div>

            <div>
              <Label htmlFor="yearBuilt">Year Built</Label>
              <Input
                id="yearBuilt"
                type="number"
                {...register('yearBuilt', { valueAsNumber: true })}
                placeholder="1990"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="season">Season</Label>
              <Select value={watchedValues.season} onValueChange={(value) => setValue('season', value as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select season" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="spring">Spring</SelectItem>
                  <SelectItem value="summer">Summer</SelectItem>
                  <SelectItem value="fall">Fall</SelectItem>
                  <SelectItem value="winter">Winter</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="urgency">Urgency</Label>
              <Select value={watchedValues.urgency} onValueChange={(value) => setValue('urgency', value as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2 pt-6">
              <Checkbox
                id="permitsRequired"
                checked={watchedValues.permitsRequired}
                onCheckedChange={(checked) => setValue('permitsRequired', checked as boolean)}
              />
              <Label htmlFor="permitsRequired">Permits Required</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scope Items */}
      <Collapsible open={isScopeOpen} onOpenChange={setIsScopeOpen}>
        <CollapsibleTrigger asChild>
          <Card className="cursor-pointer">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <span>Scope Items</span>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary">{scopeFields.length} items</Badge>
                  {isScopeOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </CardTitle>
            </CardHeader>
          </Card>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Card className="mt-2">
            <CardContent className="pt-6">
              <div className="space-y-4">
                {scopeFields.map((field, index) => (
                  <div key={field.id} className="flex items-end space-x-2 p-4 border rounded-lg">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-2">
                      <Input
                        placeholder="Category"
                        {...register(`scope.${index}.category`)}
                        disabled={isLoading}
                      />
                      <Input
                        placeholder="Description"
                        {...register(`scope.${index}.description`)}
                        disabled={isLoading}
                      />
                      <Input
                        type="number"
                        placeholder="Quantity"
                        {...register(`scope.${index}.quantity`, { valueAsNumber: true })}
                        disabled={isLoading}
                      />
                      <Select
                        value={watchedValues.scope?.[index]?.complexity}
                        onValueChange={(value) => setValue(`scope.${index}.complexity`, value as any)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Complexity" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="simple">Simple</SelectItem>
                          <SelectItem value="moderate">Moderate</SelectItem>
                          <SelectItem value="complex">Complex</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeScope(index)}
                      disabled={isLoading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={addScopeItem}
                  disabled={isLoading}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Scope Item
                </Button>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Materials */}
      <Collapsible open={isMaterialsOpen} onOpenChange={setIsMaterialsOpen}>
        <CollapsibleTrigger asChild>
          <Card className="cursor-pointer">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <span>Materials</span>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary">{materialFields.length} items</Badge>
                  {isMaterialsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </CardTitle>
            </CardHeader>
          </Card>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Card className="mt-2">
            <CardContent className="pt-6">
              <div className="space-y-4">
                {materialFields.map((field, index) => (
                  <div key={field.id} className="flex items-end space-x-2 p-4 border rounded-lg">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-2">
                      <Input
                        placeholder="Material name"
                        {...register(`materials.${index}.name`)}
                        disabled={isLoading}
                      />
                      <Input
                        placeholder="Category"
                        {...register(`materials.${index}.category`)}
                        disabled={isLoading}
                      />
                      <Input
                        type="number"
                        placeholder="Quantity"
                        {...register(`materials.${index}.quantity`, { valueAsNumber: true })}
                        disabled={isLoading}
                      />
                      <Input
                        type="number"
                        placeholder="Unit cost"
                        {...register(`materials.${index}.unitCost`, { valueAsNumber: true })}
                        disabled={isLoading}
                      />
                      <Select
                        value={watchedValues.materials?.[index]?.quality}
                        onValueChange={(value) => setValue(`materials.${index}.quality`, value as any)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Quality" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="basic">Basic</SelectItem>
                          <SelectItem value="standard">Standard</SelectItem>
                          <SelectItem value="premium">Premium</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeMaterial(index)}
                      disabled={isLoading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={addMaterialItem}
                  disabled={isLoading}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Material
                </Button>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Labor */}
      <Collapsible open={isLaborOpen} onOpenChange={setIsLaborOpen}>
        <CollapsibleTrigger asChild>
          <Card className="cursor-pointer">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <span>Labor</span>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary">{laborFields.length} items</Badge>
                  {isLaborOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </CardTitle>
            </CardHeader>
          </Card>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Card className="mt-2">
            <CardContent className="pt-6">
              <div className="space-y-4">
                {laborFields.map((field, index) => (
                  <div key={field.id} className="flex items-end space-x-2 p-4 border rounded-lg">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-2">
                      <Input
                        placeholder="Labor type"
                        {...register(`labor.${index}.type`)}
                        disabled={isLoading}
                      />
                      <Select
                        value={watchedValues.labor?.[index]?.skillLevel}
                        onValueChange={(value) => setValue(`labor.${index}.skillLevel`, value as any)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Skill level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="basic">Basic</SelectItem>
                          <SelectItem value="intermediate">Intermediate</SelectItem>
                          <SelectItem value="expert">Expert</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        placeholder="Hours"
                        {...register(`labor.${index}.estimatedHours`, { valueAsNumber: true })}
                        disabled={isLoading}
                      />
                      <Input
                        type="number"
                        placeholder="Hourly rate"
                        {...register(`labor.${index}.hourlyRate`, { valueAsNumber: true })}
                        disabled={isLoading}
                      />
                      <Input
                        type="number"
                        placeholder="Team size"
                        {...register(`labor.${index}.teamSize`, { valueAsNumber: true })}
                        disabled={isLoading}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeLabor(index)}
                      disabled={isLoading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={addLaborItem}
                  disabled={isLoading}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Labor Item
                </Button>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Estimated Cost Preview */}
      {estimatedCost > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calculator className="h-5 w-5 mr-2" />
              Rough Estimate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${estimatedCost.toLocaleString()}
            </div>
            <p className="text-sm text-gray-600">
              Based on material and labor costs entered above
            </p>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex space-x-4">
        <Button
          type="submit"
          disabled={isLoading || !isValid}
          className="flex-1"
        >
          {isLoading ? 'Predicting...' : 'Get AI Prediction'}
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={handleQuickPredict}
          disabled={isLoading || !watchedValues.title}
        >
          Quick Predict
        </Button>

        {onBatchPrediction && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              // Implementation for batch prediction
              toast.info('Batch prediction feature coming soon');
            }}
            disabled={isLoading}
          >
            <Upload className="h-4 w-4 mr-2" />
            Batch
          </Button>
        )}
      </div>
    </form>
  );
}

function calculateEstimatedCost(data: any): number {
  let totalCost = 0;

  // Calculate materials cost
  if (data.materials) {
    totalCost += data.materials.reduce((sum: number, material: any) => {
      return sum + (material.quantity * (material.unitCost || 0));
    }, 0);
  }

  // Calculate labor cost
  if (data.labor) {
    totalCost += data.labor.reduce((sum: number, labor: any) => {
      const hourlyRate = labor.hourlyRate || 50; // Default rate
      return sum + (labor.estimatedHours * hourlyRate * (labor.teamSize || 1));
    }, 0);
  }

  // Add overhead (15%)
  totalCost *= 1.15;

  return Math.round(totalCost);
}