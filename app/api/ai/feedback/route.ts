import { NextRequest, NextResponse } from 'next/server';
import { aiClient } from '@/lib/ai/aiClient';
import { logger } from '@/lib/logger';
import { PredictionFeedback } from '@/lib/ai/types';

export async function POST(request: NextRequest) {
  try {
    const body: PredictionFeedback = await request.json();

    // Validate request body
    if (!body.predictionId || body.actualCost === undefined || body.actualDuration === undefined) {
      return NextResponse.json(
        { error: 'Missing required feedback data' },
        { status: 400 }
      );
    }

    // Validate numeric values
    if (isNaN(body.actualCost) || isNaN(body.actualDuration)) {
      return NextResponse.json(
        { error: 'Actual cost and duration must be valid numbers' },
        { status: 400 }
      );
    }

    logger.info('Prediction feedback received', {
      predictionId: body.predictionId,
      actualCost: body.actualCost,
      actualDuration: body.actualDuration,
      accuracy: body.accuracy,
      hasFeedback: !!body.feedback,
      factorCount: body.factors?.length,
      userAgent: request.headers.get('user-agent')
    });

    // Submit feedback to AI engine
    const response = await aiClient.submitFeedback(body);

    if (!response.success) {
      logger.error('Failed to submit prediction feedback', {
        error: response.error?.message,
        predictionId: body.predictionId
      });

      return NextResponse.json(
        {
          error: response.error?.message || 'Failed to submit feedback'
        },
        { status: 500 }
      );
    }

    logger.info('Prediction feedback submitted successfully', {
      predictionId: body.predictionId,
      accuracy: body.accuracy
    });

    return NextResponse.json({
      success: true,
      message: 'Feedback submitted successfully',
      metadata: response.metadata
    });

  } catch (error) {
    logger.error('Prediction feedback API error', {
      error: (error as Error).message,
      stack: (error as Error).stack
    });

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to submit prediction feedback'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const predictionId = searchParams.get('predictionId');

    if (!predictionId) {
      return NextResponse.json(
        { error: 'Prediction ID is required' },
        { status: 400 }
      );
    }

    logger.info('Fetching prediction feedback', { predictionId });

    // This would typically query your database for feedback history
    // For now, we'll return a placeholder response
    const feedbackData = {
      predictionId,
      feedbackHistory: [],
      averageAccuracy: 0,
      totalSubmissions: 0
    };

    return NextResponse.json({
      success: true,
      data: feedbackData
    });

  } catch (error) {
    logger.error('Prediction feedback fetch API error', {
      error: (error as Error).message
    });

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to fetch prediction feedback'
      },
      { status: 500 }
    );
  }
}