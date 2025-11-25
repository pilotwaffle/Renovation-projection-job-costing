import { NextRequest, NextResponse } from 'next/server';
import { aiClient } from '@/lib/ai/aiClient';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    logger.info('Fetching available AI models');

    const response = await aiClient.getModels();

    if (!response.success) {
      logger.error('Failed to fetch AI models', {
        error: response.error?.message
      });

      return NextResponse.json(
        {
          error: response.error?.message || 'Failed to fetch models'
        },
        { status: 500 }
      );
    }

    logger.info('AI models fetched successfully', {
      modelCount: response.data?.models.length,
      defaultModel: response.data?.defaultModel
    });

    return NextResponse.json({
      success: true,
      data: response.data,
      metadata: response.metadata
    });

  } catch (error) {
    logger.error('AI models API error', {
      error: (error as Error).message
    });

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to fetch AI models'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { modelId, action } = body;

    if (!modelId || !action) {
      return NextResponse.json(
        { error: 'Model ID and action are required' },
        { status: 400 }
      );
    }

    logger.info('Model action requested', {
      modelId,
      action,
      userAgent: request.headers.get('user-agent')
    });

    switch (action) {
      case 'performance':
        const performanceResponse = await aiClient.getModelPerformance(modelId);

        if (!performanceResponse.success) {
          return NextResponse.json(
            {
              error: performanceResponse.error?.message || 'Failed to fetch model performance'
            },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          data: performanceResponse.data,
          metadata: performanceResponse.metadata
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    logger.error('Model action API error', {
      error: (error as Error).message
    });

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to process model action'
      },
      { status: 500 }
    );
  }
}