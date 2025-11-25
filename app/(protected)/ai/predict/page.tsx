'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CostPredictor } from '@/components/ai/CostPredictor';
import { Brain, Sparkles, Target, TrendingUp, Users } from 'lucide-react';

export default function PredictPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              AI Cost Prediction
            </h1>
            <p className="text-lg text-gray-600">
              Get intelligent cost estimates powered by machine learning
            </p>
          </div>
          <Badge variant="default" className="text-sm px-4 py-2">
            <Brain className="h-4 w-4 mr-2" />
            AI-Powered
          </Badge>
        </div>
      </div>

      {/* Features Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Brain className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold">Smart Predictions</h3>
                <p className="text-sm text-gray-600">ML-powered cost estimates</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Target className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold">High Accuracy</h3>
                <p className="text-sm text-gray-600">Up to 95% accuracy</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold">Real-time Updates</h3>
                <p className="text-sm text-gray-600">Instant cost adjustments</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Users className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold">Continuous Learning</h3>
                <p className="text-sm text-gray-600">Improves over time</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Predictions Made</p>
                <p className="text-2xl font-bold">2,847</p>
              </div>
              <Sparkles className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Average Accuracy</p>
                <p className="text-2xl font-bold">92.3%</p>
              </div>
              <Target className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Models</p>
                <p className="text-2xl font-bold">5</p>
              </div>
              <Brain className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Predictor */}
      <CostPredictor
        showHistory={true}
        showAnalytics={true}
        onPredictionComplete={(prediction) => {
          console.log('Prediction completed:', prediction);
        }}
      />

      {/* Help Section */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Target className="h-5 w-5 mr-2" />
            How to Use AI Predictions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <h4 className="font-semibold">1. Enter Project Details</h4>
              <p className="text-sm text-gray-600">
                Provide basic information about your renovation project including location, scope, and materials.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">2. Get Instant Prediction</h4>
              <p className="text-sm text-gray-600">
                Our AI analyzes your data and provides a detailed cost breakdown with confidence intervals.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">3. Review and Refine</h4>
              <p className="text-sm text-gray-600">
                Examine feature importance, cost breakdowns, and adjust parameters to fine-tune your estimate.
              </p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">Pro Tips</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Include detailed scope items for more accurate predictions</li>
              <li>• Specify material quality levels (basic, standard, premium)</li>
              <li>• Provide accurate location data for regional pricing adjustments</li>
              <li>• Use templates for common renovation types to save time</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}