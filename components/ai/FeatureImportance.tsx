'use client';

import React, { useState } from 'react';
import { FeatureImportance as FeatureImportanceType } from '@/lib/ai/types';
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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Treemap,
  Cell
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Info,
  Filter,
  BarChart3,
  PieChart,
  Target,
  MapPin,
  Package,
  Users,
  Clock
} from 'lucide-react';

interface FeatureImportanceProps {
  features: FeatureImportanceType[];
  compact?: boolean;
}

const CATEGORY_ICONS = {
  location: MapPin,
  scope: Target,
  materials: Package,
  labor: Users,
  timing: Clock,
  property: Target
};

const CATEGORY_COLORS = {
  location: '#3b82f6',
  scope: '#10b981',
  materials: '#f59e0b',
  labor: '#8b5cf6',
  timing: '#ef4444',
  property: '#06b6d4'
};

export function FeatureImportance({ features, compact = false }: FeatureImportanceProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'importance' | 'impact'>('importance');
  const [viewMode, setViewMode] = useState<'bar' | 'radar' | 'treemap'>('bar');

  if (!features || features.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Feature Importance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-600">
            <Info className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No feature importance data available</p>
            <p className="text-sm mt-2">Enable feature analysis in prediction settings</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Filter and sort features
  const filteredFeatures = features
    .filter(feature => selectedCategory === 'all' || feature.category === selectedCategory)
    .sort((a, b) => {
      if (sortBy === 'importance') {
        return b.importance - a.importance;
      } else {
        // Sort by impact (positive first, then negative, then neutral)
        const impactOrder = { positive: 0, neutral: 1, negative: 2 };
        return impactOrder[a.impact] - impactOrder[b.impact];
      }
    });

  // Prepare data for charts
  const chartData = filteredFeatures.map(feature => ({
    name: feature.feature,
    importance: feature.importance * 100,
    category: feature.category,
    impact: feature.impact,
    fill: CATEGORY_COLORS[feature.category as keyof typeof CATEGORY_COLORS] || '#8884d8'
  }));

  const radarData = filteredFeatures.slice(0, 8).map(feature => ({
    feature: feature.feature.length > 15 ? feature.feature.substring(0, 15) + '...' : feature.feature,
    importance: feature.importance * 100,
    fullMark: 100
  }));

  const treemapData = filteredFeatures.map(feature => ({
    name: feature.feature,
    size: feature.importance * 1000,
    category: feature.category,
    impact: feature.impact
  }));

  // Get unique categories
  const categories = Array.from(new Set(features.map(f => f.category)));

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case 'positive':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'negative':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Target className="h-4 w-4 text-gray-600" />;
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'positive':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'negative':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (compact) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Key Factors</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredFeatures.slice(0, 5).map((feature, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-2 flex-1">
                  {getImpactIcon(feature.impact)}
                  <span className="text-sm truncate">{feature.feature}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Progress value={feature.importance * 100} className="w-16 h-2" />
                  <span className="text-sm font-medium w-10 text-right">
                    {Math.round(feature.importance * 100)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
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
              <BarChart3 className="h-5 w-5 mr-2" />
              Feature Importance Analysis
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>
                      <div className="flex items-center capitalize">
                        {React.createElement(CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS] || Target, { className: "h-4 w-4 mr-2" })}
                        {category}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="importance">By Importance</SelectItem>
                  <SelectItem value="impact">By Impact</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Showing {filteredFeatures.length} of {features.length} features</span>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span>Positive Impact</span>
              </div>
              <div className="flex items-center space-x-2">
                <TrendingDown className="h-4 w-4 text-red-600" />
                <span>Negative Impact</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Visualization</CardTitle>
            <Tabs value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
              <TabsList>
                <TabsTrigger value="bar">
                  <BarChart className="h-4 w-4 mr-2" />
                  Bar Chart
                </TabsTrigger>
                <TabsTrigger value="radar">
                  <Target className="h-4 w-4 mr-2" />
                  Radar Chart
                </TabsTrigger>
                <TabsTrigger value="treemap">
                  <PieChart className="h-4 w-4 mr-2" />
                  Treemap
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {viewMode === 'bar' && (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={chartData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis dataKey="name" type="category" width={150} />
                <Tooltip
                  formatter={(value: any) => [`${value.toFixed(1)}%`, 'Importance']}
                  labelFormatter={(label) => `Feature: ${label}`}
                />
                <Bar dataKey="importance" fill="#8884d8">
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}

          {viewMode === 'radar' && (
            <ResponsiveContainer width="100%" height={400}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="feature" />
                <PolarRadiusAxis domain={[0, 100]} />
                <Radar
                  name="Importance"
                  dataKey="importance"
                  stroke="#8884d8"
                  fill="#8884d8"
                  fillOpacity={0.6}
                />
                <Tooltip formatter={(value: any) => [`${value.toFixed(1)}%`, 'Importance']} />
              </RadarChart>
            </ResponsiveContainer>
          )}

          {viewMode === 'treemap' && (
            <ResponsiveContainer width="100%" height={400}>
              <Treemap
                data={treemapData}
                dataKey="size"
                aspectRatio={4 / 3}
                stroke="#fff"
                fill="#8884d8"
              >
                <Tooltip
                  formatter={(value: any) => [`${(value / 10).toFixed(1)}%`, 'Importance']}
                  labelFormatter={(label) => `Feature: ${label}`}
                />
                {treemapData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={CATEGORY_COLORS[entry.category as keyof typeof CATEGORY_COLORS] || '#8884d8'}
                  />
                ))}
              </Treemap>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Detailed Feature List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Features by Category */}
        <Card>
          <CardHeader>
            <CardTitle>Features by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categories.map(category => {
                const categoryFeatures = filteredFeatures.filter(f => f.category === category);
                const CategoryIcon = CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS] || Target;

                return (
                  <div key={category} className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <CategoryIcon className="h-4 w-4" />
                      <h4 className="font-medium capitalize">{category}</h4>
                      <Badge variant="secondary">{categoryFeatures.length}</Badge>
                    </div>
                    <div className="pl-6 space-y-1">
                      {categoryFeatures.slice(0, 3).map((feature, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-2">
                            {getImpactIcon(feature.impact)}
                            <span>{feature.feature}</span>
                          </div>
                          <span className="font-medium">
                            {Math.round(feature.importance * 100)}%
                          </span>
                        </div>
                      ))}
                      {categoryFeatures.length > 3 && (
                        <div className="text-sm text-gray-500">
                          +{categoryFeatures.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Top Influencers */}
        <Card>
          <CardHeader>
            <CardTitle>Top Influencers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredFeatures.slice(0, 8).map((feature, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 flex-1">
                      <span className="text-sm font-medium text-gray-500 w-6">#{index + 1}</span>
                      <span className="font-medium">{feature.feature}</span>
                      {getImpactIcon(feature.impact)}
                    </div>
                    <Badge
                      variant="outline"
                      className={getImpactColor(feature.impact)}
                    >
                      {Math.round(feature.importance * 100)}%
                    </Badge>
                  </div>
                  <Progress value={feature.importance * 100} className="w-full h-2" />
                  <p className="text-sm text-gray-600">{feature.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Impact Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Impact Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {filteredFeatures.filter(f => f.impact === 'positive').length}
              </div>
              <div className="text-sm text-gray-600">Positive Factors</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">
                {filteredFeatures.filter(f => f.impact === 'neutral').length}
              </div>
              <div className="text-sm text-gray-600">Neutral Factors</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {filteredFeatures.filter(f => f.impact === 'negative').length}
              </div>
              <div className="text-sm text-gray-600">Negative Factors</div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium mb-2">Key Insights</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• The most important factor is <strong>{features[0]?.feature}</strong> with {Math.round((features[0]?.importance || 0) * 100)}% importance</li>
              <li>• <strong>{categories[0]}</strong> category has the most influential features</li>
              <li>• Consider focusing on <strong>{filteredFeatures.filter(f => f.impact === 'positive').slice(0, 2).map(f => f.feature).join(' and ')}</strong> to optimize costs</li>
              <li>• Be aware of <strong>{filteredFeatures.filter(f => f.impact === 'negative').slice(0, 2).map(f => f.feature).join(' and ')}</strong> as they may increase costs</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default FeatureImportance;