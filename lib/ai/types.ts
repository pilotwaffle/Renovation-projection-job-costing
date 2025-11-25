// AI Prediction Engine Types

export interface PredictionRequest {
  jobData: JobPredictionInput;
  modelId?: string;
  includeFeatures?: boolean;
  includeConfidence?: boolean;
}

export interface JobPredictionInput {
  title: string;
  description?: string;
  category?: string;
  estimatedDuration?: number; // in days
  location?: {
    address?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    latitude?: number;
    longitude?: number;
  };
  scope?: ScopeItem[];
  materials?: MaterialItem[];
  labor?: LaborItem[];
  propertyType?: 'residential' | 'commercial' | 'industrial';
  propertySize?: number; // in square feet
  yearBuilt?: number;
  complexity?: 'simple' | 'moderate' | 'complex';
  season?: string; // 'spring', 'summer', 'fall', 'winter'
  urgency?: 'low' | 'medium' | 'high';
  permitsRequired?: boolean;
  historicalData?: {
    similarJobsCompleted?: number;
    averageCost?: number;
    averageDuration?: number;
  };
}

export interface ScopeItem {
  id: string;
  category: string;
  description: string;
  quantity: number;
  unit: string;
  estimatedHours?: number;
  complexity?: 'simple' | 'moderate' | 'complex';
}

export interface MaterialItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  unitCost?: number;
  quality?: 'basic' | 'standard' | 'premium';
}

export interface LaborItem {
  id: string;
  type: string;
  skillLevel: 'basic' | 'intermediate' | 'expert';
  estimatedHours: number;
  hourlyRate?: number;
  teamSize?: number;
}

export interface PredictionResponse {
  id: string;
  predictedCost: CostBreakdown;
  predictedDuration: DurationBreakdown;
  confidence: ConfidenceMetrics;
  features?: FeatureImportance[];
  model: ModelInfo;
  timestamp: string;
  requestId: string;
}

export interface CostBreakdown {
  totalCost: number;
  labor: CostComponent;
  materials: CostComponent;
  equipment: CostComponent;
  permits: CostComponent;
  overhead: CostComponent;
  profit: CostComponent;
  contingency: CostComponent;
  breakdown: CostDetail[];
}

export interface CostComponent {
  amount: number;
  percentage: number;
  range: {
    min: number;
    max: number;
  };
}

export interface CostDetail {
  category: string;
  description: string;
  amount: number;
  quantity: number;
  unitCost: number;
  confidence: number;
}

export interface DurationBreakdown {
  totalDays: number;
  phases: PhaseBreakdown[];
  range: {
    min: number;
    max: number;
  };
}

export interface PhaseBreakdown {
  phase: string;
  duration: number;
  dependencies: string[];
  bufferTime: number;
}

export interface ConfidenceMetrics {
  overall: number; // 0-100
  costConfidence: number;
  durationConfidence: number;
  dataQuality: number;
  factors: ConfidenceFactor[];
}

export interface ConfidenceFactor {
  factor: string;
  impact: 'positive' | 'negative' | 'neutral';
  description: string;
  weight: number;
}

export interface FeatureImportance {
  feature: string;
  importance: number; // 0-1
  impact: 'positive' | 'negative';
  description: string;
  category: 'location' | 'scope' | 'materials' | 'labor' | 'timing' | 'property';
}

export interface ModelInfo {
  id: string;
  name: string;
  version: string;
  type: 'regression' | 'ensemble' | 'neural_network';
  trainingDataSize: number;
  lastTrained: string;
  accuracy: number;
  bestFor: string[];
}

export interface ModelListResponse {
  models: ModelInfo[];
  defaultModel: string;
  recommendations: ModelRecommendation[];
}

export interface ModelRecommendation {
  modelId: string;
  reason: string;
  confidence: number;
  useCases: string[];
}

export interface TrainingJob {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number; // 0-100
  startedAt: string;
  completedAt?: string;
  estimatedCompletion?: string;
  parameters: TrainingParameters;
  results?: TrainingResults;
}

export interface TrainingParameters {
  modelType: string;
  trainingDataSize: number;
  validationSplit: number;
  features: string[];
  hyperparameters: Record<string, any>;
}

export interface TrainingResults {
  accuracy: number;
  mse: number;
  mae: number;
  r2Score: number;
  featureImportance: FeatureImportance[];
  validationMetrics: Record<string, number>;
}

export interface PredictionFeedback {
  predictionId: string;
  actualCost: number;
  actualDuration: number;
  accuracy: number;
  feedback: string;
  factors?: string[];
  timestamp: string;
}

export interface PredictionHistory {
  id: string;
  jobTitle: string;
  prediction: PredictionResponse;
  actual?: {
    cost: number;
    duration: number;
    accuracy: number;
  };
  createdAt: string;
  status: 'predicted' | 'completed' | 'cancelled';
}

export interface BatchPredictionRequest {
  jobs: JobPredictionInput[];
  modelId?: string;
  priority?: 'low' | 'normal' | 'high';
}

export interface BatchPredictionResponse {
  batchId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalJobs: number;
  processedJobs: number;
  results?: PredictionResponse[];
  errors?: BatchError[];
  estimatedCompletion?: string;
}

export interface BatchError {
  jobIndex: number;
  error: string;
  code: string;
}

export interface AnalyticsData {
  predictionAccuracy: {
    overall: number;
    byModel: Record<string, number>;
    byCategory: Record<string, number>;
    trend: {
      date: string;
      accuracy: number;
    }[];
  };
  modelPerformance: {
    modelId: string;
    accuracy: number;
    usage: number;
    averageConfidence: number;
  }[];
  costDeviations: {
    jobType: string;
    averageDeviation: number;
    deviationPercentage: number;
    sampleSize: number;
  }[];
  usageStats: {
    totalPredictions: number;
    predictionsThisMonth: number;
    averageResponseTime: number;
    popularModels: string[];
  };
}

export interface AIEngineConfig {
  apiUrl: string;
  apiKey?: string;
  timeout: number;
  retryAttempts: number;
  rateLimiting: {
    requestsPerMinute: number;
    burstLimit: number;
  };
  caching: {
    enabled: boolean;
    ttl: number; // in seconds
  };
  fallback: {
    enabled: boolean;
    useHistoricalData: boolean;
    defaultModel: string;
  };
}

export interface APIError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
  requestId?: string;
}

export interface AIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: APIError;
  metadata?: {
    requestId: string;
    timestamp: string;
    processingTime: number;
    cached: boolean;
  };
}