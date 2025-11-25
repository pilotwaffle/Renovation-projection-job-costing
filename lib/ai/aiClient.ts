import { AIEngineConfig, AIResponse, PredictionRequest, PredictionResponse, ModelListResponse, TrainingJob, PredictionFeedback, BatchPredictionRequest, BatchPredictionResponse } from './types';
import { logger } from '../logger';

class AIClient {
  private config: AIEngineConfig;
  private requestCache = new Map<string, { data: any; timestamp: number }>();
  private rateLimiter = {
    tokens: 60, // Start with full bucket
    lastRefill: Date.now(),
    requestsPerMinute: 60,
    burstLimit: 10
  };

  constructor(config: Partial<AIEngineConfig> = {}) {
    this.config = {
      apiUrl: process.env.AI_ENGINE_URL || 'http://localhost:8000/api',
      apiKey: process.env.AI_ENGINE_API_KEY,
      timeout: 30000,
      retryAttempts: 3,
      rateLimiting: {
        requestsPerMinute: 60,
        burstLimit: 10
      },
      caching: {
        enabled: true,
        ttl: 300 // 5 minutes
      },
      fallback: {
        enabled: true,
        useHistoricalData: true,
        defaultModel: 'renovation-cost-v1'
      },
      ...config
    };
  }

  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRefill = now - this.rateLimiter.lastRefill;

    // Refill tokens based on time elapsed
    if (timeSinceLastRefill >= 60000) { // 1 minute
      this.rateLimiter.tokens = this.rateLimiter.requestsPerMinute;
      this.rateLimiter.lastRefill = now;
    }

    if (this.rateLimiter.tokens <= 0) {
      const waitTime = 60000 - timeSinceLastRefill;
      logger.warn(`Rate limit exceeded, waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.rateLimiter.tokens = this.rateLimiter.requestsPerMinute;
    }

    this.rateLimiter.tokens--;
  }

  private getCacheKey(endpoint: string, body?: any): string {
    return `${endpoint}:${JSON.stringify(body || {})}`;
  }

  private getFromCache(key: string): any | null {
    if (!this.config.caching.enabled) return null;

    const cached = this.requestCache.get(key);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > this.config.caching.ttl * 1000) {
      this.requestCache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCache(key: string, data: any): void {
    if (!this.config.caching.enabled) return;

    this.requestCache.set(key, {
      data,
      timestamp: Date.now()
    });

    // Clean up old cache entries periodically
    if (this.requestCache.size > 100) {
      const keysToDelete: string[] = [];
      const now = Date.now();

      this.requestCache.forEach((value, key) => {
        if (now - value.timestamp > this.config.caching.ttl * 1000) {
          keysToDelete.push(key);
        }
      });

      keysToDelete.forEach(key => this.requestCache.delete(key));
    }
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    useCache = true
  ): Promise<AIResponse<T>> {
    const requestId = crypto.randomUUID();
    const startTime = Date.now();

    try {
      // Check cache for GET requests
      if (useCache && (!options.method || options.method === 'GET')) {
        const cacheKey = this.getCacheKey(endpoint, options.body);
        const cached = this.getFromCache(cacheKey);
        if (cached) {
          logger.debug('Cache hit for AI request', { endpoint, requestId });
          return {
            success: true,
            data: cached,
            metadata: {
              requestId,
              timestamp: new Date().toISOString(),
              processingTime: Date.now() - startTime,
              cached: true
            }
          };
        }
      }

      await this.waitForRateLimit();

      const url = `${this.config.apiUrl}${endpoint}`;
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'User-Agent': 'Renovation-Job-Costing/1.0',
        ...options.headers
      };

      if (this.config.apiKey) {
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
      }

      const fetchOptions: RequestInit = {
        ...options,
        headers,
        signal: AbortSignal.timeout(this.config.timeout)
      };

      logger.debug('Making AI request', { url, method: options.method || 'GET', requestId });

      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
        try {
          const response = await fetch(url, fetchOptions);

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
            (error as any).status = response.status;
            (error as any).data = errorData;
            throw error;
          }

          const data = await response.json();
          const processingTime = Date.now() - startTime;

          logger.info('AI request successful', {
            url,
            attempt,
            processingTime,
            requestId
          });

          // Cache successful responses
          if (useCache && (!options.method || options.method === 'GET')) {
            const cacheKey = this.getCacheKey(endpoint, options.body);
            this.setCache(cacheKey, data);
          }

          return {
            success: true,
            data,
            metadata: {
              requestId,
              timestamp: new Date().toISOString(),
              processingTime,
              cached: false
            }
          };

        } catch (error) {
          lastError = error as Error;
          logger.warn(`AI request attempt ${attempt} failed`, {
            url,
            error: lastError.message,
            requestId
          });

          // Don't retry on client errors (4xx)
          if ((lastError as any).status && (lastError as any).status >= 400 && (lastError as any).status < 500) {
            break;
          }

          // Wait before retry (exponential backoff)
          if (attempt < this.config.retryAttempts) {
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      throw lastError;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('AI request failed', {
        endpoint,
        error: (error as Error).message,
        processingTime,
        requestId
      });

      return {
        success: false,
        error: {
          code: 'REQUEST_FAILED',
          message: (error as Error).message,
          details: (error as any).data,
          timestamp: new Date().toISOString(),
          requestId
        },
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          processingTime,
          cached: false
        }
      };
    }
  }

  async predictCost(request: PredictionRequest): Promise<AIResponse<PredictionResponse>> {
    return this.makeRequest<PredictionResponse>('/predict', {
      method: 'POST',
      body: JSON.stringify(request)
    }, false);
  }

  async batchPredict(request: BatchPredictionRequest): Promise<AIResponse<BatchPredictionResponse>> {
    return this.makeRequest<BatchPredictionResponse>('/predict/batch', {
      method: 'POST',
      body: JSON.stringify(request)
    }, false);
  }

  async getModels(): Promise<AIResponse<ModelListResponse>> {
    return this.makeRequest<ModelListResponse>('/models');
  }

  async getModelPerformance(modelId: string): Promise<AIResponse<any>> {
    return this.makeRequest<any>(`/models/${modelId}/performance`);
  }

  async startTrainingJob(parameters: any): Promise<AIResponse<TrainingJob>> {
    return this.makeRequest<TrainingJob>('/train', {
      method: 'POST',
      body: JSON.stringify(parameters)
    }, false);
  }

  async getTrainingJob(jobId: string): Promise<AIResponse<TrainingJob>> {
    return this.makeRequest<TrainingJob>(`/train/${jobId}`);
  }

  async submitFeedback(feedback: PredictionFeedback): Promise<AIResponse<void>> {
    return this.makeRequest<void>('/feedback', {
      method: 'POST',
      body: JSON.stringify(feedback)
    }, false);
  }

  async getPredictionHistory(limit = 50, offset = 0): Promise<AIResponse<any[]>> {
    return this.makeRequest<any[]>(`/predictions/history?limit=${limit}&offset=${offset}`);
  }

  async getAnalytics(timeRange = '30d'): Promise<AIResponse<any>> {
    return this.makeRequest<any>(`/analytics?range=${timeRange}`);
  }

  async healthCheck(): Promise<AIResponse<{ status: string; version: string }>> {
    return this.makeRequest<{ status: string; version: string }>('/health');
  }

  // Fallback methods for when AI engine is unavailable
  async getFallbackPrediction(jobData: any): Promise<PredictionResponse> {
    logger.warn('Using fallback prediction method', { jobTitle: jobData.title });

    // Simple rule-based fallback
    const baseCost = this.calculateBaseCost(jobData);
    const duration = this.estimateDuration(jobData);

    return {
      id: crypto.randomUUID(),
      predictedCost: {
        totalCost: baseCost,
        labor: { amount: baseCost * 0.4, percentage: 40, range: { min: baseCost * 0.35, max: baseCost * 0.45 } },
        materials: { amount: baseCost * 0.3, percentage: 30, range: { min: baseCost * 0.25, max: baseCost * 0.35 } },
        equipment: { amount: baseCost * 0.1, percentage: 10, range: { min: baseCost * 0.08, max: baseCost * 0.12 } },
        permits: { amount: baseCost * 0.05, percentage: 5, range: { min: baseCost * 0.03, max: baseCost * 0.07 } },
        overhead: { amount: baseCost * 0.1, percentage: 10, range: { min: baseCost * 0.08, max: baseCost * 0.12 } },
        profit: { amount: baseCost * 0.15, percentage: 15, range: { min: baseCost * 0.12, max: baseCost * 0.18 } },
        contingency: { amount: baseCost * 0.1, percentage: 10, range: { min: baseCost * 0.08, max: baseCost * 0.12 } },
        breakdown: []
      },
      predictedDuration: {
        totalDays: duration,
        phases: [],
        range: { min: duration * 0.8, max: duration * 1.2 }
      },
      confidence: {
        overall: 60,
        costConfidence: 60,
        durationConfidence: 55,
        dataQuality: 50,
        factors: []
      },
      model: {
        id: 'fallback-v1',
        name: 'Fallback Estimator',
        version: '1.0.0',
        type: 'rule-based',
        trainingDataSize: 0,
        lastTrained: new Date().toISOString(),
        accuracy: 60,
        bestFor: ['Emergency estimates', 'Basic cost approximation']
      },
      timestamp: new Date().toISOString(),
      requestId: crypto.randomUUID()
    };
  }

  private calculateBaseCost(jobData: any): number {
    // Very basic fallback calculation
    const sizeMultiplier = jobData.propertySize ? jobData.propertySize / 1000 : 1;
    const complexityMultiplier = {
      simple: 0.8,
      moderate: 1.0,
      complex: 1.5
    }[jobData.complexity] || 1.0;

    const baseCost = 5000 * sizeMultiplier * complexityMultiplier;

    // Add material costs if provided
    if (jobData.materials) {
      const materialCost = jobData.materials.reduce((sum: number, material: any) => {
        return sum + (material.quantity * (material.unitCost || 50));
      }, 0);
      return baseCost + materialCost;
    }

    return baseCost;
  }

  private estimateDuration(jobData: any): number {
    const baseDuration = 7; // 1 week base
    const sizeMultiplier = jobData.propertySize ? Math.log(jobData.propertySize) / 10 : 1;
    const complexityMultiplier = {
      simple: 0.7,
      moderate: 1.0,
      complex: 1.8
    }[jobData.complexity] || 1.0;

    return Math.ceil(baseDuration * sizeMultiplier * complexityMultiplier);
  }

  // Utility methods
  clearCache(): void {
    this.requestCache.clear();
    logger.info('AI client cache cleared');
  }

  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.requestCache.size,
      keys: Array.from(this.requestCache.keys())
    };
  }

  updateConfig(newConfig: Partial<AIEngineConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('AI client configuration updated');
  }
}

// Singleton instance
export const aiClient = new AIClient();

export default AIClient;