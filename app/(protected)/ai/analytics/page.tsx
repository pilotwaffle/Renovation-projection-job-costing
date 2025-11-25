'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Target,
  BarChart3,
  PieChart,
  Calendar,
  DollarSign,
  Clock,
  Users,
  Activity,
  Brain,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Download
} from 'lucide-react';

const mockAnalyticsData = {
  predictionAccuracy: {
    overall: 92.3,
    byModel: {
      'renovation-cost-v1': 94.2,
      'material-cost-v2': 91.8,
      'duration-predictor-v1': 88.3,
      'regional-adjuster-v3': 96.1
    },
    byCategory: {
      'kitchen': 94.5,
      'bathroom': 92.8,
      'flooring': 89.2,
      'painting': 91.7,
      'plumbing': 87.3,
      'electrical': 90.1
    },
    trend: [
      { date: '2024-06', accuracy: 87.2 },
      { date: '2024-07', accuracy: 88.9 },
      { date: '2024-08', accuracy: 90.1 },
      { date: '2024-09', accuracy: 91.3 },
      { date: '2024-10', accuracy: 91.8 },
      { date: '2024-11', accuracy: 92.3 }
    ]
  },
  modelPerformance: [
    { modelId: 'renovation-cost-v1', name: 'Renovation Cost Predictor', accuracy: 94.2, usage: 1247, avgConfidence: 89.5 },
    { modelId: 'material-cost-v2', name: 'Material Cost Estimator', accuracy: 91.8, usage: 892, avgConfidence: 87.2 },
    { modelId: 'duration-predictor-v1', name: 'Project Duration Model', accuracy: 88.3, usage: 645, avgConfidence: 85.1 },
    { modelId: 'regional-adjuster-v3', name: 'Regional Cost Adjuster', accuracy: 96.1, usage: 423, avgConfidence: 92.8 }
  ],
  costDeviations: [
    { jobType: 'Kitchen Renovation', avgDeviation: 5.2, deviationPercentage: 5.2, sampleSize: 342 },
    { jobType: 'Bathroom Renovation', avgDeviation: 4.8, deviationPercentage: 4.8, sampleSize: 276 },
    { jobType: 'Full Home Renovation', avgDeviation: 7.3, deviationPercentage: 7.3, sampleSize: 189 },
    { jobType: 'Flooring', avgDeviation: 3.1, deviationPercentage: 3.1, sampleSize: 428 },
    { jobType: 'Painting', avgDeviation: 2.9, deviationPercentage: 2.9, sampleSize: 567 },
    { jobType: 'Plumbing', avgDeviation: 6.4, deviationPercentage: 6.4, sampleSize: 198 }
  ],
  usageStats: {
    totalPredictions: 12473,
    predictionsThisMonth: 2847,
    averageResponseTime: 245,
    popularModels: ['renovation-cost-v1', 'material-cost-v2', 'duration-predictor-v1']
  },
  userSatisfaction: [
    { rating: 5, count: 892, percentage: 71.4 },
    { rating: 4, count: 245, percentage: 19.6 },
    { rating: 3, count: 89, percentage: 7.1 },
    { rating: 2, count: 18, percentage: 1.4 },
    { rating: 1, count: 8, percentage: 0.6 }
  ]
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState('30d');
  const [activeTab, setActiveTab] = useState('overview');

  const getAccuracyIcon = (accuracy: number) => {
    if (accuracy >= 95) {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    } else if (accuracy >= 85) {
      return <Target className="h-4 w-4 text-yellow-600" />;
    } else {
      return <AlertTriangle className="h-4 w-4 text-red-600" />;
    }
  };

  const getAccuracyBadgeVariant = (accuracy: number) => {
    if (accuracy >= 95) {
      return 'default';
    } else if (accuracy >= 85) {
      return 'secondary';
    } else {
      return 'destructive';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              AI Analytics Dashboard
            </h1>
            <p className="text-lg text-gray-600">
              Comprehensive insights into AI prediction performance and usage
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Overall Accuracy</p>
                <div className="flex items-center space-x-2">
                  <p className="text-2xl font-bold">{mockAnalyticsData.predictionAccuracy.overall}%</p>
                  {getAccuracyIcon(mockAnalyticsData.predictionAccuracy.overall)}
                </div>
              </div>
              <Target className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Predictions</p>
                <p className="text-2xl font-bold">{mockAnalyticsData.usageStats.totalPredictions.toLocaleString()}</p>
              </div>
              <Activity className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Response Time</p>
                <p className="text-2xl font-bold">{mockAnalyticsData.usageStats.averageResponseTime}ms</p>
              </div>
              <Clock className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">User Satisfaction</p>
                <div className="flex items-center space-x-2">
                  <p className="text-2xl font-bold">4.6</p>
                  <Badge variant="outline">/5.0</Badge>
                </div>
              </div>
              <Users className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="accuracy">Accuracy Analysis</TabsTrigger>
          <TabsTrigger value="usage">Usage Patterns</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Accuracy Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Accuracy Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={mockAnalyticsData.predictionAccuracy.trend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[85, 100]} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="accuracy"
                      stroke="#8884d8"
                      strokeWidth={2}
                      dot={{ fill: '#8884d8' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Model Usage Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChart className="h-5 w-5 mr-2" />
                  Model Usage Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={mockAnalyticsData.modelPerformance}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name}: ${percentage}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="usage"
                    >
                      {mockAnalyticsData.modelPerformance.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Recent Performance Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Performance Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <h4 className="font-medium">Top Performing Models</h4>
                  {mockAnalyticsData.modelPerformance
                    .sort((a, b) => b.accuracy - a.accuracy)
                    .slice(0, 3)
                    .map((model) => (
                    <div key={model.modelId} className="flex items-center justify-between">
                      <span className="text-sm">{model.name}</span>
                      <Badge variant={getAccuracyBadgeVariant(model.accuracy)}>
                        {model.accuracy}%
                      </Badge>
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">Most Used Models</h4>
                  {mockAnalyticsData.modelPerformance
                    .sort((a, b) => b.usage - a.usage)
                    .slice(0, 3)
                    .map((model) => (
                    <div key={model.modelId} className="flex items-center justify-between">
                      <span className="text-sm">{model.name}</span>
                      <span className="text-sm font-medium">{model.usage} uses</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">Accuracy by Category</h4>
                  {Object.entries(mockAnalyticsData.predictionAccuracy.byCategory)
                    .slice(0, 3)
                    .map(([category, accuracy]) => (
                    <div key={category} className="flex items-center justify-between">
                      <span className="text-sm capitalize">{category}</span>
                      <Badge variant={getAccuracyBadgeVariant(accuracy)}>
                        {accuracy}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accuracy" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Model Accuracy Comparison */}
            <Card>
              <CardHeader>
                <CardTitle>Model Accuracy Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={mockAnalyticsData.modelPerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="accuracy" fill="#8884d8" />
                    <Bar dataKey="avgConfidence" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Cost Deviations by Job Type */}
            <Card>
              <CardHeader>
                <CardTitle>Cost Deviations by Job Type</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={mockAnalyticsData.costDeviations}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="jobType" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="deviationPercentage" fill="#ff7300" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Accuracy Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Accuracy Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Model</th>
                      <th className="text-right p-2">Accuracy</th>
                      <th className="text-right p-2">Avg Confidence</th>
                      <th className="text-right p-2">Usage Count</th>
                      <th className="text-center p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockAnalyticsData.modelPerformance.map((model) => (
                      <tr key={model.modelId} className="border-b">
                        <td className="p-2">{model.name}</td>
                        <td className="text-right p-2">
                          <div className="flex items-center justify-end space-x-2">
                            <span>{model.accuracy}%</span>
                            {getAccuracyIcon(model.accuracy)}
                          </div>
                        </td>
                        <td className="text-right p-2">{model.avgConfidence}%</td>
                        <td className="text-right p-2">{model.usage}</td>
                        <td className="text-center p-2">
                          <Badge variant={getAccuracyBadgeVariant(model.accuracy)}>
                            {model.accuracy >= 95 ? 'Excellent' : model.accuracy >= 85 ? 'Good' : 'Needs Improvement'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usage" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Usage Statistics */}
            <Card>
              <CardHeader>
                <CardTitle>Usage Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total Predictions</span>
                  <span className="font-bold">{mockAnalyticsData.usageStats.totalPredictions.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">This Month</span>
                  <span className="font-bold">{mockAnalyticsData.usageStats.predictionsThisMonth.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Daily Average</span>
                  <span className="font-bold">
                    {Math.round(mockAnalyticsData.usageStats.predictionsThisMonth / 30)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Peak Hour</span>
                  <span className="font-bold">2:00 PM - 4:00 PM</span>
                </div>
              </CardContent>
            </Card>

            {/* User Satisfaction */}
            <Card>
              <CardHeader>
                <CardTitle>User Satisfaction</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockAnalyticsData.userSatisfaction.map((rating) => (
                    <div key={rating.rating} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-1">
                          {[...Array(5)].map((_, i) => (
                            <div
                              key={i}
                              className={`w-3 h-3 rounded-full ${
                                i < rating.rating ? 'bg-yellow-400' : 'bg-gray-300'
                              }`}
                            />
                          ))}
                          <span>{rating.rating} stars</span>
                        </div>
                        <span className="font-medium">{rating.count}</span>
                      </div>
                      <Progress value={rating.percentage} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Popular Features */}
            <Card>
              <CardHeader>
                <CardTitle>Popular Features</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Real-time Predictions</span>
                  <Badge variant="secondary">89% usage</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Cost Breakdown</span>
                  <Badge variant="secondary">76% usage</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Feature Importance</span>
                  <Badge variant="secondary">68% usage</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Confidence Intervals</span>
                  <Badge variant="secondary">54% usage</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Batch Predictions</span>
                  <Badge variant="secondary">23% usage</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Usage Patterns */}
          <Card>
            <CardHeader>
              <CardTitle>Usage Patterns Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={[
                  { date: 'Mon', predictions: 145 },
                  { date: 'Tue', predictions: 189 },
                  { date: 'Wed', predictions: 234 },
                  { date: 'Thu', predictions: 298 },
                  { date: 'Fri', predictions: 345 },
                  { date: 'Sat', predictions: 178 },
                  { date: 'Sun', predictions: 156 }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="predictions"
                    stroke="#8884d8"
                    fill="#8884d8"
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Response Time Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>Response Time Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Average Response Time</span>
                      <span className="text-2xl font-bold text-green-600">245ms</span>
                    </div>
                    <p className="text-sm text-green-700">Well within SLA target of 500ms</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">P50 (Median)</span>
                      <span className="font-medium">198ms</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">P95</span>
                      <span className="font-medium">456ms</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">P99</span>
                      <span className="font-medium">789ms</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Error Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>Error Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Success Rate</span>
                      <span className="text-2xl font-bold text-blue-600">99.7%</span>
                    </div>
                    <p className="text-sm text-blue-700">Excellent reliability</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Total Requests</span>
                      <span className="font-medium">12,473</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Failed Requests</span>
                      <span className="font-medium text-red-600">38</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Timeouts</span>
                      <span className="font-medium text-yellow-600">12</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Model Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <RadarChart data={mockAnalyticsData.modelPerformance.map(model => ({
                  model: model.name.split(' ')[0],
                  accuracy: model.accuracy,
                  confidence: model.avgConfidence,
                  usage: (model.usage / Math.max(...mockAnalyticsData.modelPerformance.map(m => m.usage))) * 100
                }))}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="model" />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} />
                  <Radar name="Accuracy" dataKey="accuracy" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                  <Radar name="Confidence" dataKey="confidence" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.6} />
                  <Radar name="Usage" dataKey="usage" stroke="#ffc658" fill="#ffc658" fillOpacity={0.6} />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}