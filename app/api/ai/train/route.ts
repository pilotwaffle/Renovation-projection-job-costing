import { NextRequest, NextResponse } from 'next/server';
import { aiClient } from '@/lib/ai/aiClient';
import { logger } from '@/lib/logger';
import { TrainingJob, TrainingParameters } from '@/lib/ai/types';

export async function POST(request: NextRequest) {
  try {
    const body: TrainingParameters = await request.json();

    // Validate request body
    if (!body.modelType || !body.trainingDataSize) {
      return NextResponse.json(
        { error: 'Missing required training parameters' },
        { status: 400 }
      );
    }

    logger.info('AI training job requested', {
      modelType: body.modelType,
      trainingDataSize: body.trainingDataSize,
      validationSplit: body.validationSplit,
      featureCount: body.features?.length,
      userAgent: request.headers.get('user-agent')
    });

    // Start training job
    const response = await aiClient.startTrainingJob(body);

    if (!response.success) {
      logger.error('Failed to start training job', {
        error: response.error?.message,
        modelType: body.modelType
      });

      return NextResponse.json(
        {
          error: response.error?.message || 'Failed to start training job'
        },
        { status: 500 }
      );
    }

    logger.info('Training job started successfully', {
      jobId: response.data?.id,
      modelType: body.modelType,
      estimatedCompletion: response.data?.estimatedCompletion
    });

    return NextResponse.json({
      success: true,
      data: response.data,
      metadata: response.metadata
    });

  } catch (error) {
    logger.error('Training job API error', {
      error: (error as Error).message,
      stack: (error as Error).stack
    });

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to start training job'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    logger.info('Fetching training job status', { jobId });

    const response = await aiClient.getTrainingJob(jobId);

    if (!response.success) {
      logger.error('Failed to fetch training job status', {
        error: response.error?.message,
        jobId
      });

      return NextResponse.json(
        {
          error: response.error?.message || 'Failed to fetch training job status'
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
    logger.error('Training job status API error', {
      error: (error as Error).message
    });

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to fetch training job status'
      },
      { status: 500 }
    );
  }
}