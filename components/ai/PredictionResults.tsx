'use client';

import React, { useState } from 'react';
import { PredictionResponse, PredictionFeedback } from '@/lib/ai/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DollarSign,
  Clock,
  TrendingUp,
  TrendingDown,
  Target,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  PieChart,
  Download,
  Share2,
  Edit,
  Save
} from 'lucide-react';
import { toast } from 'sonner';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar
} from 'recharts';

interface PredictionResultsProps {
  prediction: PredictionResponse;
  onFeedback?: (predictionId: string, actualCost: number, actualDuration: number, feedback?: string) => void;
  compact?: boolean;
  showComparison?: boolean;
  actualCost?: number;
  actualDuration?: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export function PredictionResults({
  prediction,
  onFeedback,
  compact = false,
  showComparison = false,
  actualCost,
  actualDuration
}: PredictionResultsProps) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackData, setFeedbackData] = useState({
    actualCost: '',
    actualDuration: '',
    feedback: ''
  });

  const handleFeedbackSubmit = () => {
    if (!feedbackData.actualCost || !feedbackData.actualDuration) {
      toast.error('Please fill in both actual cost and duration');
      return;
    }

    const cost = parseFloat(feedbackData.actualCost);
    const duration = parseFloat(feedbackData.actualDuration);

    if (isNaN(cost) || isNaN(duration)) {
      toast.error('Please enter valid numbers for cost and duration');
      return;
    }

    onFeedback?.(prediction.id, cost, duration, feedbackData.feedback);
    setFeedbackOpen(false);
    setFeedbackData({ actualCost: '', actualDuration: '', feedback: '' });
  };

  const exportResults = () => {
    const data = {
      prediction: {
        id: prediction.id,
        totalCost: prediction.predictedCost.totalCost,
        totalDuration: prediction.predictedDuration.totalDays,
        confidence: prediction.confidence.overall,
        timestamp: prediction.timestamp
      },
      breakdown: prediction.predictedCost.breakdown,
      features: prediction.features
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prediction-${prediction.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Prediction results exported');
  };

  const shareResults = async () => {
    const text = `AI Cost Prediction: $${prediction.predictedCost.totalCost.toLocaleString()} for ${prediction.predictedDuration.totalDays} days with ${prediction.confidence.overall}% confidence`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'AI Cost Prediction Results',
          text,
          url: window.location.href
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(text);
      toast.success('Results copied to clipboard');
    }
  };

  const calculateAccuracy = (predicted: number, actual: number): number => {
    if (predicted === 0) return 0;
    return Math.max(0, 100 - Math.abs((actual - predicted) / predicted) * 100);
  };

  const costAccuracy = actualCost ? calculateAccuracy(prediction.predictedCost.totalCost, actualCost) : null;
  const durationAccuracy = actualDuration ? calculateAccuracy(prediction.predictedDuration.totalDays, actualDuration) : null;

  // Prepare data for charts
  const costBreakdownData = [
    { name: 'Labor', value: prediction.predictedCost.labor.amount, color: '#0088FE' },
    { name: 'Materials', value: prediction.predictedCost.materials.amount, color: '#00C49F' },
    { name: 'Equipment', value: prediction.predictedCost.equipment.amount, color: '#FFBB28' },
    { name: 'Permits', value: prediction.predictedCost.permits.amount, color: '#FF8042' },
    { name: 'Overhead', value: prediction.predictedCost.overhead.amount, color: '#8884D8' },
    { name: 'Profit', value: prediction.predictedCost.profit.amount, color: '#82CA9D' },
    { name: 'Contingency', value: prediction.predictedCost.contingency.amount, color: '#FF6B6B' }
  ];

  const confidenceData = [
    { name: 'Overall', value: prediction.confidence.overall, fill: '#8884d8' },
    { name: 'Cost', value: prediction.confidence.costConfidence, fill: '#82ca9d' },
    { name: 'Duration', value: prediction.confidence.durationConfidence, fill: '#ffc658' },
    { name: 'Data Quality', value: prediction.confidence.dataQuality, fill: '#ff7300' }
  ];

  const rangeData = [
    {
      aspect: 'Cost',
      predicted: prediction.predictedCost.totalCost,
      min: prediction.predictedCost.totalCost * 0.8,
      max: prediction.predictedCost.totalCost * 1.2,
      actual: actualCost
    },
    {
      aspect: 'Duration',
      predicted: prediction.predictedDuration.totalDays,
      min: prediction.predictedDuration.totalDays * 0.8,
      max: prediction.predictedDuration.totalDays * 1.2,
      actual: actualDuration
    }
  ];

  if (compact) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Prediction Results</span>
            <Badge variant={prediction.confidence.overall >= 80 ? 'default' : 'secondary'}>
              {prediction.confidence.overall}% confidence
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-600">Estimated Cost</div>
              <div className="text-2xl font-bold">
                ${prediction.predictedCost.totalCost.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Duration</div>
              <div className="text-2xl font-bold">
                {prediction.predictedDuration.totalDays} days
              </div>
            </div>
          </div>

          <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full">
                Submit Feedback
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Submit Actual Results</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="actualCost">Actual Cost ($)</Label>
                  <Input
                    id="actualCost"
                    type="number"
                    value={feedbackData.actualCost}
                    onChange={(e) => setFeedbackData(prev => ({ ...prev, actualCost: e.target.value }))}
                    placeholder="Enter actual cost"
                  />
                </div>
                <div>
                  <Label htmlFor="actualDuration">Actual Duration (days)</Label>
                  <Input
                    id="actualDuration"
                    type="number"
                    value={feedbackData.actualDuration}
                    onChange={(e) => setFeedbackData(prev => ({ ...prev, actualDuration: e.target.value }))}
                    placeholder="Enter actual duration"
                  />
                </div>
                <div>
                  <Label htmlFor="feedback">Notes (optional)</Label>
                  <Textarea
                    id="feedback"
                    value={feedbackData.feedback}
                    onChange={(e) => setFeedbackData(prev => ({ ...prev, feedback: e.target.value }))}
                    placeholder="Any notes about the prediction accuracy..."
                    rows={3}
                  />
                </div>
                <Button onClick={handleFeedbackSubmit} className="w-full">
                  Submit Feedback
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Target className="h-6 w-6 mr-2 text-blue-600" />
              Prediction Results
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Badge
                variant={
                  prediction.confidence.overall >= 80 ? 'default' :
                  prediction.confidence.overall >= 60 ? 'secondary' : 'destructive'
                }
              >
                {prediction.confidence.overall}% confidence
              </Badge>
              <Button variant="outline" size="sm" onClick={exportResults}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" size="sm" onClick={shareResults}>
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              {onFeedback && (
                <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4 mr-2" />
                      Feedback
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Submit Actual Results</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="actualCost">Actual Cost ($)</Label>
                        <Input
                          id="actualCost"
                          type="number"
                          value={feedbackData.actualCost}
                          onChange={(e) => setFeedbackData(prev => ({ ...prev, actualCost: e.target.value }))}
                          placeholder={`Predicted: $${prediction.predictedCost.totalCost.toLocaleString()}`}
                        />
                      </div>
                      <div>
                        <Label htmlFor="actualDuration">Actual Duration (days)</Label>
                        <Input
                          id="actualDuration"
                          type="number"
                          value={feedbackData.actualDuration}
                          onChange={(e) => setFeedbackData(prev => ({ ...prev, actualDuration: e.target.value }))}
                          placeholder={`Predicted: ${prediction.predictedDuration.totalDays} days`}
                        />
                      </div>
                      <div>
                        <Label htmlFor="feedback">Notes (optional)</Label>
                        <Textarea
                          id="feedback"
                          value={feedbackData.feedback}
                          onChange={(e) => setFeedbackData(prev => ({ ...prev, feedback: e.target.value }))}
                          placeholder="Any notes about the prediction accuracy, unexpected costs, timeline delays..."
                          rows={4}
                        />
                      </div>
                      <Button onClick={handleFeedbackSubmit} className="w-full">
                        <Save className="h-4 w-4 mr-2" />
                        Submit Feedback
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center text-sm text-gray-600">
                <DollarSign className="h-4 w-4 mr-2" />
                Total Cost
              </div>
              <div className="text-3xl font-bold">
                ${prediction.predictedCost.totalCost.toLocaleString()}
              </div>
              {costAccuracy !== null && (
                <div className="flex items-center space-x-2">
                  {costAccuracy >= 90 ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : costAccuracy >= 70 ? (
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                  <span className="text-sm text-gray-600">
                    {costAccuracy >= 90 ? 'Excellent' : costAccuracy >= 70 ? 'Good' : 'Needs improvement'} accuracy ({costAccuracy.toFixed(1)}%)
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center text-sm text-gray-600">
                <Clock className="h-4 w-4 mr-2" />
                Duration
              </div>
              <div className="text-3xl font-bold">
                {prediction.predictedDuration.totalDays} days
              </div>
              {durationAccuracy !== null && (
                <div className="flex items-center space-x-2">
                  {durationAccuracy >= 90 ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : durationAccuracy >= 70 ? (
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                  <span className="text-sm text-gray-600">
                    {durationAccuracy >= 90 ? 'Excellent' : durationAccuracy >= 70 ? 'Good' : 'Needs improvement'} accuracy ({durationAccuracy.toFixed(1)}%)
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center text-sm text-gray-600">
                <Target className="h-4 w-4 mr-2" />
                Overall Confidence
              </div>
              <div className="text-3xl font-bold">
                {prediction.confidence.overall}%
              </div>
              <Progress value={prediction.confidence.overall} className="w-full" />
            </div>
          </div>

          {/* Confidence Factors */}
          {prediction.confidence.factors && prediction.confidence.factors.length > 0 && (
            <div className="mt-6">
              <h4 className="font-medium mb-3">Confidence Factors</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {prediction.confidence.factors.map((factor, index) => (
                  <div key={index} className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                    {factor.impact === 'positive' ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : factor.impact === 'negative' ? (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    ) : (
                      <Target className="h-4 w-4 text-gray-600" />
                    )}
                    <span className="text-sm flex-1">{factor.description}</span>
                    <Badge variant="outline">{factor.weight}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Tabs */}
      <Tabs defaultValue="breakdown" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="breakdown">Cost Breakdown</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="confidence">Confidence</TabsTrigger>
          {showComparison && <TabsTrigger value="comparison">Comparison</TabsTrigger>}
        </TabsList>

        <TabsContent value="breakdown" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cost Breakdown Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChart className="h-5 w-5 mr-2" />
                  Cost Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={costBreakdownData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {costBreakdownData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Cost Breakdown Table */}
            <Card>
              <CardHeader>
                <CardTitle>Detailed Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(prediction.predictedCost).map(([key, value]) => {
                    if (key === 'totalCost' || key === 'breakdown') return null;

                    const component = value as any;
                    return (
                      <div key={key} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: component.color || '#8884d8' }}
                          />
                          <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">${component.amount.toLocaleString()}</div>
                          <div className="text-sm text-gray-600">{component.percentage}%</div>
                        </div>
                      </div>
                    );
                  })}
                  <Separator />
                  <div className="flex items-center justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>${prediction.predictedCost.totalCost.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Cost Items */}
          {prediction.predictedCost.breakdown && prediction.predictedCost.breakdown.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Detailed Cost Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Category</th>
                        <th className="text-left p-2">Description</th>
                        <th className="text-right p-2">Quantity</th>
                        <th className="text-right p-2">Unit Cost</th>
                        <th className="text-right p-2">Total</th>
                        <th className="text-right p-2">Confidence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {prediction.predictedCost.breakdown.map((item, index) => (
                        <tr key={index} className="border-b">
                          <td className="p-2">{item.category}</td>
                          <td className="p-2">{item.description}</td>
                          <td className="text-right p-2">{item.quantity}</td>
                          <td className="text-right p-2">${item.unitCost.toLocaleString()}</td>
                          <td className="text-right p-2 font-medium">${item.amount.toLocaleString()}</td>
                          <td className="text-right p-2">
                            <Badge
                              variant={
                                item.confidence >= 80 ? 'default' :
                                item.confidence >= 60 ? 'secondary' : 'destructive'
                              }
                            >
                              {item.confidence}%
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="timeline" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Project Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Total Duration</span>
                    <span className="text-2xl font-bold">{prediction.predictedDuration.totalDays} days</span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Minimum</span>
                      <span>{prediction.predictedDuration.range.min} days</span>
                    </div>
                    <Progress
                      value={((prediction.predictedDuration.totalDays - prediction.predictedDuration.range.min) /
                      (prediction.predictedDuration.range.max - prediction.predictedDuration.range.min)) * 100}
                    />
                    <div className="flex items-center justify-between text-sm">
                      <span>Maximum</span>
                      <span>{prediction.predictedDuration.range.max} days</span>
                    </div>
                  </div>

                  {durationAccuracy !== null && (
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Accuracy</span>
                        <span className="font-bold">{durationAccuracy.toFixed(1)}%</span>
                      </div>
                    </div>
                  )}
                </div>

                {prediction.predictedDuration.phases && prediction.predictedDuration.phases.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3">Project Phases</h4>
                    <div className="space-y-2">
                      {prediction.predictedDuration.phases.map((phase, index) => (
                        <div key={index} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{phase.phase}</span>
                            <span>{phase.duration} days</span>
                          </div>
                          {phase.dependencies.length > 0 && (
                            <div className="text-sm text-gray-600">
                              Depends on: {phase.dependencies.join(', ')}
                            </div>
                          )}
                          {phase.bufferTime > 0 && (
                            <div className="text-sm text-blue-600">
                              Buffer time: {phase.bufferTime} days
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="confidence" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Confidence Scores */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Confidence Scores
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {confidenceData.map((item) => (
                    <div key={item.name} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{item.name}</span>
                        <span>{item.value}%</span>
                      </div>
                      <Progress value={item.value} className="w-full" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Model Information */}
            <Card>
              <CardHeader>
                <CardTitle>Model Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Model Name</span>
                    <span className="font-medium">{prediction.model.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Version</span>
                    <span className="font-medium">{prediction.model.version}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Type</span>
                    <span className="font-medium">{prediction.model.type}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Accuracy</span>
                    <span className="font-medium">{prediction.model.accuracy}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Training Data</span>
                    <span className="font-medium">{prediction.model.trainingDataSize.toLocaleString()} samples</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Last Trained</span>
                    <span className="font-medium">
                      {new Date(prediction.model.lastTrained).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {showComparison && (
          <TabsContent value="comparison" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Predicted vs Actual
                </CardTitle>
              </CardHeader>
              <CardContent>
                {actualCost && actualDuration ? (
                  <div className="space-y-6">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={rangeData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="aspect" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="min" fill="#e0e7ff" name="Min Range" />
                        <Bar dataKey="predicted" fill="#8884d8" name="Predicted" />
                        <Bar dataKey="max" fill="#e0e7ff" name="Max Range" />
                        {actualCost && actualDuration && (
                          <Bar dataKey="actual" fill="#82ca9d" name="Actual" />
                        )}
                      </BarChart>
                    </ResponsiveContainer>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-medium mb-2">Cost Comparison</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>Predicted:</span>
                            <span>${prediction.predictedCost.totalCost.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Actual:</span>
                            <span>${actualCost.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between font-bold">
                            <span>Difference:</span>
                            <span className={costAccuracy && costAccuracy >= 90 ? 'text-green-600' : costAccuracy && costAccuracy >= 70 ? 'text-yellow-600' : 'text-red-600'}>
                              ${(actualCost - prediction.predictedCost.totalCost).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 border rounded-lg">
                        <h4 className="font-medium mb-2">Duration Comparison</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>Predicted:</span>
                            <span>{prediction.predictedDuration.totalDays} days</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Actual:</span>
                            <span>{actualDuration} days</span>
                          </div>
                          <div className="flex justify-between font-bold">
                            <span>Difference:</span>
                            <span className={durationAccuracy && durationAccuracy >= 90 ? 'text-green-600' : durationAccuracy && durationAccuracy >= 70 ? 'text-yellow-600' : 'text-red-600'}>
                              {actualDuration - prediction.predictedDuration.totalDays} days
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-600">
                    <p>No actual data available for comparison</p>
                    <p className="text-sm mt-2">Submit feedback with actual results to see comparison</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

export default PredictionResults;