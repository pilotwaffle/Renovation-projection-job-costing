'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Brain,
  Play,
  Pause,
  RefreshCw,
  Settings,
  TrendingUp,
  BarChart3,
  Activity,
  Calendar,
  Users,
  Target,
  Zap
} from 'lucide-react';

interface Model {
  id: string;
  name: string;
  version: string;
  type: string;
  accuracy: number;
  trainingDataSize: number;
  lastTrained: string;
  status: 'active' | 'training' | 'inactive' | 'deprecated';
  bestFor: string[];
  performance: {
    accuracy: number;
    mse: number;
    mae: number;
    r2Score: number;
  };
  usage: {
    predictionsCount: number;
    averageResponseTime: number;
    popularity: number;
  };
}

const mockModels: Model[] = [
  {
    id: 'renovation-cost-v1',
    name: 'Renovation Cost Predictor',
    version: '1.2.0',
    type: 'ensemble',
    accuracy: 94.2,
    trainingDataSize: 15420,
    lastTrained: '2024-11-15T10:30:00Z',
    status: 'active',
    bestFor: ['Kitchen renovations', 'Bathroom renovations', 'Full home renovations'],
    performance: {
      accuracy: 94.2,
      mse: 0.0023,
      mae: 0.0145,
      r2Score: 0.9876
    },
    usage: {
      predictionsCount: 1247,
      averageResponseTime: 245,
      popularity: 92
    }
  },
  {
    id: 'material-cost-v2',
    name: 'Material Cost Estimator',
    version: '2.1.0',
    type: 'neural_network',
    accuracy: 91.8,
    trainingDataSize: 28930,
    lastTrained: '2024-11-10T14:15:00Z',
    status: 'active',
    bestFor: ['Material pricing', 'Supply chain costs', 'Quality tier analysis'],
    performance: {
      accuracy: 91.8,
      mse: 0.0034,
      mae: 0.0198,
      r2Score: 0.9765
    },
    usage: {
      predictionsCount: 892,
      averageResponseTime: 189,
      popularity: 78
    }
  },
  {
    id: 'duration-predictor-v1',
    name: 'Project Duration Model',
    version: '1.0.5',
    type: 'regression',
    accuracy: 88.3,
    trainingDataSize: 8750,
    lastTrained: '2024-11-01T09:45:00Z',
    status: 'active',
    bestFor: ['Timeline estimation', 'Resource planning', 'Milestone predictions'],
    performance: {
      accuracy: 88.3,
      mse: 0.0045,
      mae: 0.0234,
      r2Score: 0.9543
    },
    usage: {
      predictionsCount: 645,
      averageResponseTime: 156,
      popularity: 65
    }
  },
  {
    id: 'regional-adjuster-v3',
    name: 'Regional Cost Adjuster',
    version: '3.0.1',
    type: 'ensemble',
    accuracy: 96.1,
    trainingDataSize: 45680,
    lastTrained: '2024-11-20T16:20:00Z',
    status: 'training',
    bestFor: ['Location-based pricing', 'Regional market analysis', 'Cost of living adjustments'],
    performance: {
      accuracy: 96.1,
      mse: 0.0018,
      mae: 0.0123,
      r2Score: 0.9912
    },
    usage: {
      predictionsCount: 423,
      averageResponseTime: 312,
      popularity: 71
    }
  }
];

export default function ModelsPage() {
  const [models, setModels] = useState<Model[]>(mockModels);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [activeTab, setActiveTab] = useState('overview');

  const getStatusBadge = (status: Model['status']) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'training':
        return <Badge className="bg-blue-100 text-blue-800">Training</Badge>;
      case 'inactive':
        return <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>;
      case 'deprecated':
        return <Badge className="bg-red-100 text-red-800">Deprecated</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getStatusIcon = (status: Model['status']) => {
    switch (status) {
      case 'active':
        return <Play className="h-4 w-4 text-green-600" />;
      case 'training':
        return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />;
      case 'inactive':
        return <Pause className="h-4 w-4 text-gray-600" />;
      case 'deprecated':
        return <Settings className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              AI Model Management
            </h1>
            <p className="text-lg text-gray-600">
              Monitor, train, and manage machine learning models
            </p>
          </div>
          <Button>
            <Brain className="h-4 w-4 mr-2" />
            Add New Model
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Models</p>
                <p className="text-2xl font-bold">{models.length}</p>
              </div>
              <Brain className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Models</p>
                <p className="text-2xl font-bold">
                  {models.filter(m => m.status === 'active').length}
                </p>
              </div>
              <Activity className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Accuracy</p>
                <p className="text-2xl font-bold">
                  {(models.reduce((sum, m) => sum + m.accuracy, 0) / models.length).toFixed(1)}%
                </p>
              </div>
              <Target className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Predictions</p>
                <p className="text-2xl font-bold">
                  {models.reduce((sum, m) => sum + m.usage.predictionsCount, 0).toLocaleString()}
                </p>
              </div>
              <Zap className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Model Management */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Model Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="training">Training</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Model Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>AI Models</CardTitle>
                <div className="flex items-center space-x-2">
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Models</SelectItem>
                      {models.map(model => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Model</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Accuracy</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Last Trained</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {models
                    .filter(model => !selectedModel || model.id === selectedModel)
                    .map((model) => (
                    <TableRow key={model.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{model.name}</div>
                          <div className="text-sm text-gray-600">{model.bestFor.slice(0, 2).join(', ')}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{model.version}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="capitalize">{model.type.replace('_', ' ')}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{model.accuracy}%</span>
                          <Progress value={model.accuracy} className="w-16 h-2" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(model.status)}
                          {getStatusBadge(model.status)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="text-sm">{model.usage.predictionsCount.toLocaleString()} predictions</div>
                          <div className="text-xs text-gray-600">{model.usage.averageResponseTime}ms avg</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {new Date(model.lastTrained).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Button variant="ghost" size="sm">
                            <BarChart3 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Settings className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Model Performance Rankings */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Rankings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {models
                    .sort((a, b) => b.accuracy - a.accuracy)
                    .slice(0, 5)
                    .map((model, index) => (
                    <div key={model.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium">
                          #{index + 1}
                        </div>
                        <div>
                          <div className="font-medium">{model.name}</div>
                          <div className="text-sm text-gray-600">{model.type}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg">{model.accuracy}%</div>
                        <div className="text-sm text-gray-600">accuracy</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Usage Statistics */}
            <Card>
              <CardHeader>
                <CardTitle>Usage Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {models
                    .sort((a, b) => b.usage.predictionsCount - a.usage.predictionsCount)
                    .slice(0, 5)
                    .map((model) => (
                    <div key={model.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{model.name}</span>
                        <span>{model.usage.predictionsCount.toLocaleString()} predictions</span>
                      </div>
                      <Progress value={(model.usage.predictionsCount / Math.max(...models.map(m => m.usage.predictionsCount))) * 100} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance Metrics Table */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Model</TableHead>
                    <TableHead>Accuracy</TableHead>
                    <TableHead>MSE</TableHead>
                    <TableHead>MAE</TableHead>
                    <TableHead>R² Score</TableHead>
                    <TableHead>Avg Response Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {models.map((model) => (
                    <TableRow key={model.id}>
                      <TableCell className="font-medium">{model.name}</TableCell>
                      <TableCell>{model.performance.accuracy}%</TableCell>
                      <TableCell>{model.performance.mse.toFixed(4)}</TableCell>
                      <TableCell>{model.performance.mae.toFixed(4)}</TableCell>
                      <TableCell>{model.performance.r2Score.toFixed(4)}</TableCell>
                      <TableCell>{model.usage.averageResponseTime}ms</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="training" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Training Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {models
                  .filter(model => model.status === 'training')
                  .map((model) => (
                  <div key={model.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="font-medium">{model.name}</h4>
                        <p className="text-sm text-gray-600">Training in progress...</p>
                      </div>
                      <Badge className="bg-blue-100 text-blue-800">Training</Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Progress</span>
                        <span>67%</span>
                      </div>
                      <Progress value={67} />
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <span>Started: 2 hours ago</span>
                        <span>Est. completion: 1 hour</span>
                      </div>
                    </div>
                  </div>
                ))}

                {models.filter(model => model.status === 'training').length === 0 && (
                  <div className="text-center py-8 text-gray-600">
                    <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No models currently training</p>
                    <p className="text-sm mt-2">All models are up to date</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Training Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">Daily Retraining</span>
                    </div>
                    <Badge variant="outline">Scheduled</Badge>
                  </div>
                  <p className="text-sm text-gray-600">
                    Models automatically retrain daily at 2:00 AM with new data
                  </p>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <span className="font-medium">Performance Threshold</span>
                    </div>
                    <Badge variant="outline">Active</Badge>
                  </div>
                  <p className="text-sm text-gray-600">
                    Automatic retraining triggered when accuracy drops below 85%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}