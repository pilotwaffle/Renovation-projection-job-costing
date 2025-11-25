import { aiClient } from './aiClient';
import {
  PredictionRequest,
  PredictionResponse,
  JobPredictionInput,
  PredictionHistory,
  PredictionFeedback,
  ModelListResponse,
  AnalyticsData,
  BatchPredictionRequest,
  BatchPredictionResponse
} from './types';
import { logger } from '../logger';
import { Job, CostItem, TimeEntry } from '@/types/database';

class PredictionService {
  private predictionHistory: Map<string, PredictionHistory> = new Map();
  private offlineQueue: PredictionRequest[] = [];

  async predictJobCost(
    jobData: JobPredictionInput,
    options: {
      modelId?: string;
      includeFeatures?: boolean;
      useCache?: boolean;
      fallbackOnError?: boolean;
    } = {}
  ): Promise<PredictionResponse> {
    const { modelId, includeFeatures = true, useCache = true, fallbackOnError = true } = options;

    try {
      logger.info('Starting job cost prediction', {
        jobTitle: jobData.title,
        modelId,
        includeFeatures
      });

      const request: PredictionRequest = {
        jobData: this.prepareJobData(jobData),
        modelId,
        includeFeatures,
        includeConfidence: true
      };

      const response = await aiClient.predictCost(request);

      if (!response.success) {
        if (fallbackOnError) {
          logger.warn('AI prediction failed, using fallback', {
            error: response.error?.message,
            jobTitle: jobData.title
          });
          return await aiClient.getFallbackPrediction(jobData);
        }
        throw new Error(response.error?.message || 'Prediction failed');
      }

      const prediction = response.data!;

      // Cache the prediction
      this.cachePrediction(jobData, prediction);

      logger.info('Prediction completed successfully', {
        predictionId: prediction.id,
        predictedCost: prediction.predictedCost.totalCost,
        confidence: prediction.confidence.overall,
        processingTime: response.metadata?.processingTime
      });

      return prediction;

    } catch (error) {
      logger.error('Prediction service error', {
        error: (error as Error).message,
        jobTitle: jobData.title
      });

      if (fallbackOnError) {
        return await aiClient.getFallbackPrediction(jobData);
      }

      throw error;
    }
  }

  async predictMultipleJobs(
    jobs: JobPredictionInput[],
    options: {
      modelId?: string;
      priority?: 'low' | 'normal' | 'high';
      progressCallback?: (processed: number, total: number) => void;
    } = {}
  ): Promise<BatchPredictionResponse> {
    const { modelId, priority = 'normal', progressCallback } = options;

    try {
      logger.info('Starting batch prediction', {
        jobCount: jobs.length,
        priority
      });

      const request: BatchPredictionRequest = {
        jobs: jobs.map(job => this.prepareJobData(job)),
        modelId,
        priority
      };

      const response = await aiClient.batchPredict(request);

      if (!response.success) {
        throw new Error(response.error?.message || 'Batch prediction failed');
      }

      const batchResult = response.data!;

      // Cache individual predictions
      if (batchResult.results) {
        batchResult.results.forEach((prediction, index) => {
          this.cachePrediction(jobs[index], prediction);
        });
      }

      logger.info('Batch prediction completed', {
        batchId: batchResult.batchId,
        totalJobs: batchResult.totalJobs,
        processedJobs: batchResult.processedJobs
      });

      return batchResult;

    } catch (error) {
      logger.error('Batch prediction failed', {
        error: (error as Error).message,
        jobCount: jobs.length
      });
      throw error;
    }
  }

  async getAvailableModels(): Promise<ModelListResponse> {
    try {
      const response = await aiClient.getModels();

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch models');
      }

      return response.data!;
    } catch (error) {
      logger.error('Failed to fetch available models', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  async submitPredictionFeedback(
    predictionId: string,
    actualCost: number,
    actualDuration: number,
    feedback?: string,
    factors?: string[]
  ): Promise<void> {
    try {
      const predictionHistory = this.predictionHistory.get(predictionId);
      if (!predictionHistory) {
        throw new Error('Prediction not found in history');
      }

      const accuracy = this.calculateAccuracy(
        predictionHistory.prediction.predictedCost.totalCost,
        actualCost
      );

      const feedbackData: PredictionFeedback = {
        predictionId,
        actualCost,
        actualDuration,
        accuracy,
        feedback: feedback || '',
        factors,
        timestamp: new Date().toISOString()
      };

      const response = await aiClient.submitFeedback(feedbackData);

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to submit feedback');
      }

      // Update local history
      predictionHistory.actual = {
        cost: actualCost,
        duration: actualDuration,
        accuracy
      };
      predictionHistory.status = 'completed';

      logger.info('Prediction feedback submitted', {
        predictionId,
        accuracy,
        actualCost,
        predictedCost: predictionHistory.prediction.predictedCost.totalCost
      });

    } catch (error) {
      logger.error('Failed to submit prediction feedback', {
        error: (error as Error).message,
        predictionId
      });
      throw error;
    }
  }

  async getPredictionHistory(limit = 50, offset = 0): Promise<PredictionHistory[]> {
    try {
      const response = await aiClient.getPredictionHistory(limit, offset);

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch prediction history');
      }

      // Merge with local history
      const localHistory = Array.from(this.predictionHistory.values());
      const remoteHistory = response.data! || [];

      return [...localHistory, ...remoteHistory]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(offset, offset + limit);

    } catch (error) {
      logger.error('Failed to fetch prediction history', {
        error: (error as Error).message
      });

      // Return local history as fallback
      return Array.from(this.predictionHistory.values())
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(offset, offset + limit);
    }
  }

  async getAnalytics(timeRange = '30d'): Promise<AnalyticsData> {
    try {
      const response = await aiClient.getAnalytics(timeRange);

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch analytics');
      }

      return response.data!;
    } catch (error) {
      logger.error('Failed to fetch analytics', {
        error: (error as Error).message,
        timeRange
      });

      // Return basic analytics from local data
      return this.generateLocalAnalytics();
    }
  }

  // Utility methods
  convertJobToPredictionInput(job: Job, costItems?: CostItem[], timeEntries?: TimeEntry[]): JobPredictionInput {
    return {
      title: job.title,
      description: job.description,
      estimatedDuration: this.calculateDurationFromTimeEntries(timeEntries || []),
      location: {
        address: job.address,
        city: job.city,
        state: job.state,
        postalCode: job.postal_code,
        latitude: job.latitude,
        longitude: job.longitude
      },
      materials: this.extractMaterialsFromCostItems(costItems || []),
      labor: this.extractLaborFromCostItems(costItems || []),
      propertyType: 'residential', // Default, could be inferred from job data
      complexity: this.inferComplexity(job.title, job.description),
      historicalData: {
        similarJobsCompleted: 0, // Would need database query
        averageCost: job.budget,
        averageDuration: this.calculateDurationFromTimeEntries(timeEntries || [])
      }
    };
  }

  generateRealTimePrediction(
    jobData: Partial<JobPredictionInput>,
    previousPrediction?: PredictionResponse
  ): Promise<PredictionResponse> {
    // Debounced real-time prediction
    return new Promise((resolve) => {
      setTimeout(async () => {
        try {
          const prediction = await this.predictJobCost(jobData as JobPredictionInput, {
            useCache: true
          });
          resolve(prediction);
        } catch (error) {
          if (previousPrediction) {
            resolve(previousPrediction);
          } else {
            resolve(aiClient.getFallbackPrediction(jobData as any));
          }
        }
      }, 500); // 500ms debounce
    });
  }

  comparePredictions(
    prediction: PredictionResponse,
    actual: { cost: number; duration: number }
  ): {
    costAccuracy: number;
    durationAccuracy: number;
    overallAccuracy: number;
    costDifference: number;
    durationDifference: number;
  } {
    const costAccuracy = this.calculateAccuracy(
      prediction.predictedCost.totalCost,
      actual.cost
    );
    const durationAccuracy = this.calculateAccuracy(
      prediction.predictedDuration.totalDays,
      actual.duration
    );

    return {
      costAccuracy,
      durationAccuracy,
      overallAccuracy: (costAccuracy + durationAccuracy) / 2,
      costDifference: actual.cost - prediction.predictedCost.totalCost,
      durationDifference: actual.duration - prediction.predictedDuration.totalDays
    };
  }

  private prepareJobData(jobData: JobPredictionInput): JobPredictionInput {
    // Normalize and validate job data
    return {
      ...jobData,
      title: jobData.title.trim(),
      description: jobData.description?.trim(),
      category: jobData.category || this.inferCategory(jobData.title, jobData.description),
      complexity: jobData.complexity || this.inferComplexity(jobData.title, jobData.description),
      propertyType: jobData.propertyType || 'residential',
      scope: jobData.scope || [],
      materials: jobData.materials || [],
      labor: jobData.labor || []
    };
  }

  private cachePrediction(jobData: JobPredictionInput, prediction: PredictionResponse): void {
    const history: PredictionHistory = {
      id: prediction.id,
      jobTitle: jobData.title,
      prediction,
      createdAt: prediction.timestamp,
      status: 'predicted'
    };

    this.predictionHistory.set(prediction.id, history);

    // Keep only last 100 predictions in memory
    if (this.predictionHistory.size > 100) {
      const oldestId = Array.from(this.predictionHistory.keys())[0];
      this.predictionHistory.delete(oldestId);
    }
  }

  private calculateAccuracy(predicted: number, actual: number): number {
    if (predicted === 0) return 0;
    const accuracy = Math.max(0, 100 - Math.abs((actual - predicted) / predicted) * 100);
    return Math.round(accuracy * 100) / 100;
  }

  private calculateDurationFromTimeEntries(timeEntries: TimeEntry[]): number {
    if (!timeEntries.length) return 0;

    const totalHours = timeEntries.reduce((sum, entry) => {
      return sum + (entry.duration || 0);
    }, 0);

    return Math.ceil(totalHours / 8); // Convert to 8-hour work days
  }

  private extractMaterialsFromCostItems(costItems: CostItem[]): any[] {
    return costItems
      .filter(item => item.type === 'material')
      .map(item => ({
        id: item.id,
        name: item.description,
        category: 'general',
        quantity: item.quantity,
        unit: 'units',
        unitCost: item.unit_cost,
        quality: 'standard'
      }));
  }

  private extractLaborFromCostItems(costItems: CostItem[]): any[] {
    return costItems
      .filter(item => item.type === 'labor')
      .map(item => ({
        id: item.id,
        type: item.description,
        skillLevel: 'intermediate',
        estimatedHours: item.quantity,
        hourlyRate: item.unit_cost
      }));
  }

  private inferCategory(title: string, description?: string): string {
    const text = `${title} ${description || ''}`.toLowerCase();

    const categories = {
      'kitchen': ['kitchen', 'cabinet', 'counter', 'sink', 'appliance'],
      'bathroom': ['bathroom', 'shower', 'tub', 'toilet', 'vanity'],
      'flooring': ['floor', 'tile', 'hardwood', 'carpet', 'laminate'],
      'painting': ['paint', 'drywall', 'texture', 'primer'],
      'plumbing': ['plumb', 'pipe', 'drain', 'water', 'sewer'],
      'electrical': ['electrical', 'wire', 'outlet', 'switch', 'panel'],
      'roofing': ['roof', 'shingle', 'gutter', 'flashing'],
      'hvac': ['hvac', 'furnace', 'ac', 'duct', 'vent'],
      'exterior': ['siding', 'window', 'door', 'deck', 'patio']
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        return category;
      }
    }

    return 'general';
  }

  private inferComplexity(title: string, description?: string): 'simple' | 'moderate' | 'complex' {
    const text = `${title} ${description || ''}`.toLowerCase();

    const complexKeywords = ['structural', 'foundation', 'load-bearing', 'demolition', 'major renovation'];
    const simpleKeywords = ['paint', 'clean', 'minor', 'simple', 'basic'];

    if (complexKeywords.some(keyword => text.includes(keyword))) {
      return 'complex';
    }

    if (simpleKeywords.some(keyword => text.includes(keyword))) {
      return 'simple';
    }

    return 'moderate';
  }

  private generateLocalAnalytics(): AnalyticsData {
    const history = Array.from(this.predictionHistory.values());
    const completedPredictions = history.filter(h => h.actual);

    return {
      predictionAccuracy: {
        overall: completedPredictions.length > 0
          ? completedPredictions.reduce((sum, p) => sum + (p.actual?.accuracy || 0), 0) / completedPredictions.length
          : 0,
        byModel: {},
        byCategory: {},
        trend: []
      },
      modelPerformance: [],
      costDeviations: [],
      usageStats: {
        totalPredictions: history.length,
        predictionsThisMonth: history.filter(h =>
          new Date(h.createdAt).getMonth() === new Date().getMonth()
        ).length,
        averageResponseTime: 0,
        popularModels: []
      }
    };
  }

  // Offline support
  addToOfflineQueue(request: PredictionRequest): void {
    this.offlineQueue.push(request);
    logger.info('Added prediction to offline queue', { queueSize: this.offlineQueue.length });
  }

  async processOfflineQueue(): Promise<void> {
    if (this.offlineQueue.length === 0) return;

    logger.info('Processing offline prediction queue', { queueSize: this.offlineQueue.length });

    const requests = [...this.offlineQueue];
    this.offlineQueue = [];

    for (const request of requests) {
      try {
        await aiClient.predictCost(request);
      } catch (error) {
        logger.error('Failed to process offline prediction', {
          error: (error as Error).message,
          jobTitle: request.jobData.title
        });
      }
    }
  }

  getOfflineQueueSize(): number {
    return this.offlineQueue.length;
  }
}

// Singleton instance
export const predictionService = new PredictionService();

export default PredictionService;