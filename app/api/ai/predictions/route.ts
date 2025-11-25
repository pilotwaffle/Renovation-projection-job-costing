import { NextRequest, NextResponse } from 'next/server';
import { aiClient } from '@/lib/ai/aiClient';
import { logger } from '@/lib/logger';
import { PredictionRequest } from '@/lib/ai/types';

export async function POST(request: NextRequest) {
  try {
    const body: PredictionRequest = await request.json();

    // Validate request body
    if (!body.jobData || !body.jobData.title) {
      return NextResponse.json(
        { error: 'Missing required job data' },
        { status: 400 }
      );
    }

    // Log the prediction request
    logger.info('AI prediction request received', {
      jobTitle: body.jobData.title,
      modelId: body.modelId,
      includeFeatures: body.includeFeatures,
      userAgent: request.headers.get('user-agent'),
      ip: request.ip || 'unknown'
    });

    // Make prediction request to AI engine
    const response = await aiClient.predictCost(body);

    if (!response.success) {
      logger.error('AI prediction failed', {
        error: response.error?.message,
        jobTitle: body.jobData.title
      });

      return NextResponse.json(
        {
          error: response.error?.message || 'Prediction failed',
          details: response.error?.details
        },
        { status: 500 }
      );
    }

    // Log successful prediction
    logger.info('AI prediction completed successfully', {
      predictionId: response.data?.id,
      predictedCost: response.data?.predictedCost.totalCost,
      confidence: response.data?.confidence.overall,
      processingTime: response.metadata?.processingTime
    });

    // Return the prediction response
    return NextResponse.json({
      success: true,
      data: response.data,
      metadata: response.metadata
    });

  } catch (error) {
    logger.error('AI prediction API error', {
      error: (error as Error).message,
      stack: (error as Error).stack
    });

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to process prediction request'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status');

    logger.info('Fetching prediction history', {
      limit,
      offset,
      status
    });

    const response = await aiClient.getPredictionHistory(limit, offset);

    if (!response.success) {
      logger.error('Failed to fetch prediction history', {
        error: response.error?.message
      });

      return NextResponse.json(
        {
          error: response.error?.message || 'Failed to fetch history'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: response.data,
      metadata: response.metadata
    });

  } catch (error) {
    logger.error('Prediction history API error', {
      error: (error as Error).message
    });

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to fetch prediction history'
      },
      { status: 500 }
    );
  }
}