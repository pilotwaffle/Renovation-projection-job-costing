// AI Prediction Database Extensions
// These extend the base database types with AI-specific fields

import { Job, CostItem, TimeEntry } from './database';

// Extended Job interface with AI predictions
export interface JobWithAI extends Job {
  ai_prediction?: AIPrediction;
  prediction_comparison?: PredictionComparison;
}

// AI Prediction table
export interface AIPrediction {
  id: string;
  job_id?: string;
  user_id?: string;
  prediction_data: any; // JSON from AI engine
  predicted_cost: number;
  predicted_duration: number;
  confidence_score: number;
  model_id: string;
  model_version: string;
  feature_importance?: any[]; // JSON array
  created_at: string;
  updated_at: string;
  status: 'pending' | 'completed' | 'failed';
}

// Prediction Feedback table
export interface PredictionFeedback {
  id: string;
  prediction_id: string;
  actual_cost: number;
  actual_duration: number;
  accuracy?: number;
  feedback_text?: string;
  factors?: string[]; // What factors affected accuracy
  submitted_by?: string;
  created_at: string;
}

// Training Job table
export interface TrainingJob {
  id: string;
  model_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  started_at: string;
  completed_at?: string;
  parameters: any; // JSON
  results?: any; // JSON
  created_by?: string;
  created_at: string;
}

// Model Performance table
export interface ModelPerformance {
  id: string;
  model_id: string;
  accuracy: number;
  mse: number;
  mae: number;
  r2_score: number;
  confidence_score: number;
  prediction_count: number;
  average_response_time: number;
  measured_at: string;
  created_at: string;
}

// Prediction Comparison for jobs
export interface PredictionComparison {
  job_id: string;
  predicted_cost: number;
  actual_cost?: number;
  predicted_duration: number;
  actual_duration?: number;
  accuracy?: number;
  created_at: string;
}

// Feature Impact Tracking
export interface FeatureImpact {
  id: string;
  prediction_id: string;
  feature_name: string;
  feature_value: any;
  impact_score: number;
  importance_rank: number;
  category: string;
  created_at: string;
}

// User AI Preferences
export interface UserAIPreferences {
  id: string;
  user_id: string;
  preferred_model?: string;
  auto_predict_enabled: boolean;
  confidence_threshold: number;
  real_time_enabled: boolean;
  show_feature_importance: boolean;
  notifications_enabled: boolean;
  created_at: string;
  updated_at: string;
}

// AI Usage Analytics
export interface AIUsageAnalytics {
  id: string;
  user_id?: string;
  date: string;
  prediction_count: number;
  average_confidence: number;
  average_accuracy: number;
  most_used_model: string;
  top_project_types: string[];
  response_time_avg: number;
  created_at: string;
}

// Cost Category Accuracy (for tracking accuracy by project type)
export interface CategoryAccuracy {
  id: string;
  category: string;
  prediction_count: number;
  average_accuracy: number;
  average_deviation: number;
  confidence_avg: number;
  last_updated: string;
  created_at: string;
}

// Regional Pricing Data
export interface RegionalPricing {
  id: string;
  region: string;
  city?: string;
  state?: string;
  postal_code?: string;
  cost_multiplier: number;
  material_costs: any; // JSON object with material type costs
  labor_rates: any; // JSON object with labor rates by skill
  last_updated: string;
  created_at: string;
}

// Project Type Templates
export interface ProjectTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  default_scope: any[]; // JSON array of scope items
  default_materials: any[]; // JSON array of materials
  default_labor: any[]; // JSON array of labor items
  base_cost_multiplier: number;
  complexity_factor: string;
  duration_estimate: number;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

// SQL Schema for these tables
export const AI_TABLES_SQL = `
-- AI Predictions Table
CREATE TABLE ai_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    prediction_data JSONB NOT NULL,
    predicted_cost DECIMAL(12,2) NOT NULL,
    predicted_duration INTEGER NOT NULL,
    confidence_score DECIMAL(5,2) NOT NULL,
    model_id TEXT NOT NULL,
    model_version TEXT NOT NULL,
    feature_importance JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed'))
);

-- Prediction Feedback Table
CREATE TABLE prediction_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prediction_id UUID REFERENCES ai_predictions(id) ON DELETE CASCADE,
    actual_cost DECIMAL(12,2) NOT NULL,
    actual_duration INTEGER NOT NULL,
    accuracy DECIMAL(5,2),
    feedback_text TEXT,
    factors TEXT[],
    submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Training Jobs Table
CREATE TABLE training_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    parameters JSONB NOT NULL,
    results JSONB,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Model Performance Table
CREATE TABLE model_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id TEXT NOT NULL,
    accuracy DECIMAL(5,2) NOT NULL,
    mse DECIMAL(10,8) NOT NULL,
    mae DECIMAL(10,8) NOT NULL,
    r2_score DECIMAL(5,4) NOT NULL,
    confidence_score DECIMAL(5,2) NOT NULL,
    prediction_count INTEGER NOT NULL,
    average_response_time INTEGER NOT NULL,
    measured_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Feature Impact Tracking
CREATE TABLE feature_impact (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prediction_id UUID REFERENCES ai_predictions(id) ON DELETE CASCADE,
    feature_name TEXT NOT NULL,
    feature_value JSONB,
    impact_score DECIMAL(5,4) NOT NULL,
    importance_rank INTEGER NOT NULL,
    category TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User AI Preferences
CREATE TABLE user_ai_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    preferred_model TEXT,
    auto_predict_enabled BOOLEAN NOT NULL DEFAULT true,
    confidence_threshold DECIMAL(5,2) NOT NULL DEFAULT 70.0,
    real_time_enabled BOOLEAN NOT NULL DEFAULT true,
    show_feature_importance BOOLEAN NOT NULL DEFAULT true,
    notifications_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- AI Usage Analytics
CREATE TABLE ai_usage_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    prediction_count INTEGER NOT NULL DEFAULT 0,
    average_confidence DECIMAL(5,2),
    average_accuracy DECIMAL(5,2),
    most_used_model TEXT,
    top_project_types TEXT[],
    response_time_avg INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- Category Accuracy Tracking
CREATE TABLE category_accuracy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL UNIQUE,
    prediction_count INTEGER NOT NULL DEFAULT 0,
    average_accuracy DECIMAL(5,2),
    average_deviation DECIMAL(5,2),
    confidence_avg DECIMAL(5,2),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Regional Pricing Data
CREATE TABLE regional_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    region TEXT NOT NULL,
    city TEXT,
    state TEXT,
    postal_code TEXT,
    cost_multiplier DECIMAL(5,4) NOT NULL DEFAULT 1.0,
    material_costs JSONB,
    labor_rates JSONB,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Project Templates
CREATE TABLE project_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    default_scope JSONB NOT NULL DEFAULT '[]'::jsonb,
    default_materials JSONB NOT NULL DEFAULT '[]'::jsonb,
    default_labor JSONB NOT NULL DEFAULT '[]'::jsonb,
    base_cost_multiplier DECIMAL(5,4) NOT NULL DEFAULT 1.0,
    complexity_factor TEXT NOT NULL DEFAULT 'moderate' CHECK (complexity_factor IN ('simple', 'moderate', 'complex')),
    duration_estimate INTEGER NOT NULL DEFAULT 7,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_ai_predictions_job_id ON ai_predictions(job_id);
CREATE INDEX idx_ai_predictions_user_id ON ai_predictions(user_id);
CREATE INDEX idx_ai_predictions_created_at ON ai_predictions(created_at);
CREATE INDEX idx_ai_predictions_model_id ON ai_predictions(model_id);
CREATE INDEX idx_prediction_feedback_prediction_id ON prediction_feedback(prediction_id);
CREATE INDEX idx_training_jobs_model_id ON training_jobs(model_id);
CREATE INDEX idx_training_jobs_status ON training_jobs(status);
CREATE INDEX idx_model_performance_model_id ON model_performance(model_id);
CREATE INDEX idx_feature_impact_prediction_id ON feature_impact(prediction_id);
CREATE INDEX idx_ai_usage_analytics_date ON ai_usage_analytics(date);
CREATE INDEX idx_ai_usage_analytics_user_id ON ai_usage_analytics(user_id);
`;

// RLS (Row Level Security) Policies
export const AI_RLS_POLICIES = `
-- AI Predictions RLS
ALTER TABLE ai_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own predictions" ON ai_predictions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own predictions" ON ai_predictions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own predictions" ON ai_predictions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own predictions" ON ai_predictions
    FOR DELETE USING (auth.uid() = user_id);

-- Prediction Feedback RLS
ALTER TABLE prediction_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view feedback for their predictions" ON prediction_feedback
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM ai_predictions
            WHERE ai_predictions.id = prediction_feedback.prediction_id
            AND ai_predictions.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert feedback for their predictions" ON prediction_feedback
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM ai_predictions
            WHERE ai_predictions.id = prediction_feedback.prediction_id
            AND ai_predictions.user_id = auth.uid()
        )
    );

-- User AI Preferences RLS
ALTER TABLE user_ai_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own AI preferences" ON user_ai_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI preferences" ON user_ai_preferences
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own AI preferences" ON user_ai_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- AI Usage Analytics RLS
ALTER TABLE ai_usage_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own usage analytics" ON ai_usage_analytics
    FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

-- Training Jobs RLS (Admin only)
ALTER TABLE training_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all training jobs" ON training_jobs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Model Performance RLS (Read-only for authenticated users)
ALTER TABLE model_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view model performance" ON model_performance
    FOR SELECT USING (auth.role() = 'authenticated');
`;

export default {
  AI_TABLES_SQL,
  AI_RLS_POLICIES
};