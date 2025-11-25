import { useState, useCallback, useEffect } from 'react';
import { predictionService } from '@/lib/ai/predictionService';
import { JobPredictionInput, PredictionResponse, PredictionHistory } from '@/lib/ai/types';
import { Job, CostItem, TimeEntry } from '@/types/database';

interface UseAIPredictionOptions {
  autoPredict?: boolean;
  enableRealTime?: boolean;
  confidenceThreshold?: number;
  debounceMs?: number;
}

interface UseAIPredictionReturn {
  predictCost: (jobData: JobPredictionInput) => Promise<PredictionResponse | null>;
  predictFromJob: (job: Job, costItems?: CostItem[], timeEntries?: TimeEntry[]) => Promise<PredictionResponse | null>;
  currentPrediction: PredictionResponse | null;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
  clearPrediction: () => void;
  submitFeedback: (predictionId: string, actualCost: number, actualDuration: number, feedback?: string) => Promise<void>;
  getPredictionHistory: () => Promise<PredictionHistory[]>;
  batchPredict: (jobs: JobPredictionInput[]) => Promise<any>;
}

export function useAIPrediction(options: UseAIPredictionOptions = {}): UseAIPredictionReturn {
  const {
    autoPredict = false,
    enableRealTime = true,
    confidenceThreshold = 70,
    debounceMs = 1000
  } = options;

  const [currentPrediction, setCurrentPrediction] = useState<PredictionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearPrediction = useCallback(() => {
    setCurrentPrediction(null);
  }, []);

  const predictCost = useCallback(async (jobData: JobPredictionInput): Promise<PredictionResponse | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const prediction = await predictionService.predictJobCost(jobData, {
        includeFeatures: true,
        useCache: true,
        fallbackOnError: true
      });

      // Check confidence threshold
      if (prediction.confidence.overall < confidenceThreshold) {
        console.warn(`Prediction confidence ${prediction.confidence.overall}% is below threshold ${confidenceThreshold}%`);
      }

      setCurrentPrediction(prediction);
      return prediction;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Prediction failed';
      setError(errorMessage);
      console.error('Prediction error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [confidenceThreshold]);

  const predictFromJob = useCallback(async (
    job: Job,
    costItems?: CostItem[],
    timeEntries?: TimeEntry[]
  ): Promise<PredictionResponse | null> => {
    const jobData = predictionService.convertJobToPredictionInput(job, costItems, timeEntries);
    return predictCost(jobData);
  }, [predictCost]);

  const predictFromJobRealTime = useCallback((
    job: Job,
    costItems?: CostItem[],
    timeEntries?: TimeEntry[]
  ) => {
    if (!enableRealTime) return;

    const jobData = predictionService.convertJobToPredictionInput(job, costItems, timeEntries);

    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    const timer = setTimeout(async () => {
      try {
        const prediction = await predictionService.generateRealTimePrediction(jobData, currentPrediction || undefined);
        setCurrentPrediction(prediction);
      } catch (err) {
        console.error('Real-time prediction error:', err);
      }
    }, debounceMs);

    setDebounceTimer(timer);
  }, [enableRealTime, debounceMs, currentPrediction]);

  const submitFeedback = useCallback(async (
    predictionId: string,
    actualCost: number,
    actualDuration: number,
    feedback?: string
  ): Promise<void> => {
    try {
      await predictionService.submitPredictionFeedback(predictionId, actualCost, actualDuration, feedback);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit feedback';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const getPredictionHistory = useCallback(async (): Promise<PredictionHistory[]> => {
    try {
      return await predictionService.getPredictionHistory();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch history';
      setError(errorMessage);
      return [];
    }
  }, []);

  const batchPredict = useCallback(async (jobs: JobPredictionInput[]): Promise<any> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await predictionService.predictMultipleJobs(jobs);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Batch prediction failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [debounceTimer]);

  return {
    predictCost,
    predictFromJob,
    currentPrediction,
    isLoading,
    error,
    clearError,
    clearPrediction,
    submitFeedback,
    getPredictionHistory,
    batchPredict,
    predictFromJobRealTime
  };
}

export default useAIPrediction;