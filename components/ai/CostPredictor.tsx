'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { predictionService } from '@/lib/ai/predictionService';
import { JobPredictionInput, PredictionResponse, PredictionHistory } from '@/lib/ai/types';
import { PredictionForm } from './PredictionForm';
import { PredictionResults } from './PredictionResults';
import { FeatureImportance } from './FeatureImportance';
import { PredictionHistory as HistoryComponent } from './PredictionHistory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Brain, TrendingUp, History, Settings, Zap, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface CostPredictorProps {
  initialData?: Partial<JobPredictionInput>;
  onPredictionComplete?: (prediction: PredictionResponse) => void;
  showHistory?: boolean;
  showAnalytics?: boolean;
  compact?: boolean;
}

export function CostPredictor({
  initialData,
  onPredictionComplete,
  showHistory = true,
  showAnalytics = true,
  compact = false
}: CostPredictorProps) {
  const [activeTab, setActiveTab] = useState('predict');
  const [currentPrediction, setCurrentPrediction] = useState<PredictionResponse | null>(null);
  const [predictionHistory, setPredictionHistory] = useState<PredictionHistory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(true);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [models, setModels] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  // Load available models on mount
  useEffect(() => {
    loadAvailableModels();
    loadPredictionHistory();
  }, []);

  // Real-time prediction setup
  useEffect(() => {
    if (!isRealTimeEnabled || !initialData) return;

    const timeoutId = setTimeout(() => {
      handleRealTimePrediction(initialData as JobPredictionInput);
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [initialData, isRealTimeEnabled]);

  const loadAvailableModels = async () => {
    try {
      const modelList = await predictionService.getAvailableModels();
      setModels(modelList.models);
      setSelectedModel(modelList.defaultModel);
    } catch (error) {
      console.error('Failed to load models:', error);
    }
  };

  const loadPredictionHistory = async () => {
    try {
      const history = await predictionService.getPredictionHistory(20);
      setPredictionHistory(history);
    } catch (error) {
      console.error('Failed to load prediction history:', error);
    }
  };

  const handlePrediction = useCallback(async (jobData: JobPredictionInput) => {
    setIsLoading(true);
    setError(null);
    setProgress(0);

    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 10, 90));
    }, 200);

    try {
      const prediction = await predictionService.predictJobCost(jobData, {
        modelId: selectedModel,
        includeFeatures: true,
        useCache: true,
        fallbackOnError: true
      });

      setProgress(100);
      setCurrentPrediction(prediction);

      // Update history
      const newHistory: PredictionHistory = {
        id: prediction.id,
        jobTitle: jobData.title,
        prediction,
        createdAt: prediction.timestamp,
        status: 'predicted'
      };
      setPredictionHistory(prev => [newHistory, ...prev.slice(0, 19)]);

      onPredictionComplete?.(prediction);

      toast.success('Prediction completed successfully', {
        description: `Predicted cost: $${prediction.predictedCost.totalCost.toLocaleString()}`
      });

      // Show analytics if confidence is low
      if (prediction.confidence.overall < 70) {
        setActiveTab('features');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Prediction failed';
      setError(errorMessage);
      toast.error('Prediction failed', { description: errorMessage });
    } finally {
      clearInterval(progressInterval);
      setIsLoading(false);
      setTimeout(() => setProgress(0), 1000);
    }
  }, [selectedModel, onPredictionComplete]);

  const handleRealTimePrediction = useCallback(async (jobData: JobPredictionInput) => {
    if (!jobData.title || jobData.title.length < 3) return;

    try {
      const prediction = await predictionService.generateRealTimePrediction(
        jobData,
        currentPrediction || undefined
      );
      setCurrentPrediction(prediction);
    } catch (error) {
      console.error('Real-time prediction failed:', error);
    }
  }, [currentPrediction]);

  const handleBatchPrediction = async (jobs: JobPredictionInput[]) => {
    setIsLoading(true);
    setError(null);

    try {
      const batchResult = await predictionService.predictMultipleJobs(jobs, {
        modelId: selectedModel,
        priority: 'normal',
        progressCallback: (processed, total) => {
          setProgress((processed / total) * 100);
        }
      });

      toast.success(`Batch prediction completed`, {
        description: `Processed ${batchResult.processedJobs} of ${batchResult.totalJobs} jobs`
      });

      // Refresh history
      await loadPredictionHistory();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Batch prediction failed';
      setError(errorMessage);
      toast.error('Batch prediction failed', { description: errorMessage });
    } finally {
      setIsLoading(false);
      setProgress(0);
    }
  };

  const handleFeedback = async (
    predictionId: string,
    actualCost: number,
    actualDuration: number,
    feedback?: string
  ) => {
    try {
      await predictionService.submitPredictionFeedback(
        predictionId,
        actualCost,
        actualDuration,
        feedback
      );

      toast.success('Feedback submitted successfully');

      // Update history
      await loadPredictionHistory();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit feedback';
      toast.error('Failed to submit feedback', { description: errorMessage });
    }
  };

  if (compact) {
    return (
      <div className="space-y-4">
        <PredictionForm
          initialData={initialData}
          onPrediction={handlePrediction}
          isLoading={isLoading}
          compact={true}
        />
        {currentPrediction && (
          <PredictionResults
            prediction={currentPrediction}
            compact={true}
            onFeedback={handleFeedback}
          />
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Brain className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold">AI Cost Predictor</h1>
            <p className="text-gray-600">Get intelligent cost estimates for your renovation projects</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <Badge variant={isRealTimeEnabled ? 'default' : 'secondary'}>
            {isRealTimeEnabled ? <Zap className="h-4 w-4 mr-1" /> : null}
            Real-time {isRealTimeEnabled ? 'On' : 'Off'}
          </Badge>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsRealTimeEnabled(!isRealTimeEnabled)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      {isLoading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Processing prediction...</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="w-full" />
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="predict" className="flex items-center space-x-2">
            <Brain className="h-4 w-4" />
            <span>Predict</span>
          </TabsTrigger>
          <TabsTrigger value="results" className="flex items-center space-x-2" disabled={!currentPrediction}>
            <TrendingUp className="h-4 w-4" />
            <span>Results</span>
          </TabsTrigger>
          <TabsTrigger value="features" className="flex items-center space-x-2" disabled={!currentPrediction}>
            <Settings className="h-4 w-4" />
            <span>Features</span>
          </TabsTrigger>
          {showHistory && (
            <TabsTrigger value="history" className="flex items-center space-x-2">
              <History className="h-4 w-4" />
              <span>History</span>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="predict" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Prediction Form */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Project Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <PredictionForm
                    initialData={initialData}
                    onPrediction={handlePrediction}
                    onBatchPrediction={handleBatchPrediction}
                    isLoading={isLoading}
                    models={models}
                    selectedModel={selectedModel}
                    onModelChange={setSelectedModel}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Quick Stats */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Model Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Available Models</span>
                    <Badge variant="secondary">{models.length}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Selected Model</span>
                    <Badge variant="outline">{selectedModel || 'Default'}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Predictions Today</span>
                    <Badge variant="secondary">
                      {predictionHistory.filter(h =>
                        new Date(h.createdAt).toDateString() === new Date().toDateString()
                      ).length}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {currentPrediction && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                      Latest Prediction
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="text-2xl font-bold text-green-600">
                      ${currentPrediction.predictedCost.totalCost.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">
                      Confidence: {currentPrediction.confidence.overall}%
                    </div>
                    <div className="text-sm text-gray-600">
                      Duration: {currentPrediction.predictedDuration.totalDays} days
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => setActiveTab('results')}
                    >
                      View Details
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="results" className="space-y-6">
          {currentPrediction && (
            <PredictionResults
              prediction={currentPrediction}
              onFeedback={handleFeedback}
            />
          )}
        </TabsContent>

        <TabsContent value="features" className="space-y-6">
          {currentPrediction && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <FeatureImportance features={currentPrediction.features || []} />
              <Card>
                <CardHeader>
                  <CardTitle>Model Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Model</span>
                    <span className="font-medium">{currentPrediction.model.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Version</span>
                    <span className="font-medium">{currentPrediction.model.version}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Type</span>
                    <span className="font-medium">{currentPrediction.model.type}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Accuracy</span>
                    <span className="font-medium">{currentPrediction.model.accuracy}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Last Trained</span>
                    <span className="font-medium">
                      {new Date(currentPrediction.model.lastTrained).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {showHistory && (
          <TabsContent value="history" className="space-y-6">
            <HistoryComponent
              history={predictionHistory}
              onFeedback={handleFeedback}
              onRefresh={loadPredictionHistory}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

export default CostPredictor;