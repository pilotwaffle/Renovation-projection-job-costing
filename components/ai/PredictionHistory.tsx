'use client';

import React, { useState, useCallback } from 'react';
import { PredictionHistory as PredictionHistoryType, PredictionResponse } from '@/lib/ai/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  History,
  Search,
  Filter,
  Download,
  Trash2,
  Edit,
  Eye,
  TrendingUp,
  TrendingDown,
  Target,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface PredictionHistoryProps {
  history: PredictionHistoryType[];
  onFeedback?: (predictionId: string, actualCost: number, actualDuration: number, feedback?: string) => void;
  onRefresh?: () => void;
  compact?: boolean;
}

export function PredictionHistory({
  history,
  onFeedback,
  onRefresh,
  compact = false
}: PredictionHistoryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'cost' | 'accuracy'>('date');
  const [selectedPrediction, setSelectedPrediction] = useState<PredictionHistoryType | null>(null);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [feedbackData, setFeedbackData] = useState({
    actualCost: '',
    actualDuration: '',
    feedback: ''
  });

  // Filter and sort history
  const filteredHistory = history
    .filter(item => {
      const matchesSearch = item.jobTitle.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'cost':
          return b.prediction.predictedCost.totalCost - a.prediction.predictedCost.totalCost;
        case 'accuracy':
          return (b.actual?.accuracy || 0) - (a.actual?.accuracy || 0);
        default:
          return 0;
      }
    });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'predicted':
        return <Target className="h-4 w-4 text-blue-600" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'predicted':
        return 'secondary';
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getAccuracyIcon = (accuracy: number) => {
    if (accuracy >= 90) {
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    } else if (accuracy >= 70) {
      return <Target className="h-4 w-4 text-yellow-600" />;
    } else {
      return <TrendingDown className="h-4 w-4 text-red-600" />;
    }
  };

  const calculateAccuracy = (predicted: number, actual: number): number => {
    if (predicted === 0) return 0;
    return Math.max(0, 100 - Math.abs((actual - predicted) / predicted) * 100);
  };

  const handleFeedback = useCallback((item: PredictionHistoryType) => {
    setSelectedPrediction(item);
    setFeedbackDialogOpen(true);
  }, []);

  const handleFeedbackSubmit = useCallback(() => {
    if (!selectedPrediction || !feedbackData.actualCost || !feedbackData.actualDuration) {
      toast.error('Please fill in both actual cost and duration');
      return;
    }

    const cost = parseFloat(feedbackData.actualCost);
    const duration = parseFloat(feedbackData.actualDuration);

    if (isNaN(cost) || isNaN(duration)) {
      toast.error('Please enter valid numbers for cost and duration');
      return;
    }

    onFeedback?.(selectedPrediction.prediction.id, cost, duration, feedbackData.feedback);
    setFeedbackDialogOpen(false);
    setFeedbackData({ actualCost: '', actualDuration: '', feedback: '' });
    setSelectedPrediction(null);
  }, [selectedPrediction, feedbackData, onFeedback]);

  const exportHistory = useCallback(() => {
    const exportData = filteredHistory.map(item => ({
      jobTitle: item.jobTitle,
      predictedCost: item.prediction.predictedCost.totalCost,
      predictedDuration: item.prediction.predictedDuration.totalDays,
      actualCost: item.actual?.cost,
      actualDuration: item.actual?.duration,
      accuracy: item.actual?.accuracy,
      confidence: item.prediction.confidence.overall,
      status: item.status,
      createdAt: item.createdAt,
      model: item.prediction.model.name
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prediction-history-${format(new Date(), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Prediction history exported');
  }, [filteredHistory]);

  if (compact) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <History className="h-5 w-5 mr-2" />
              Recent Predictions
            </div>
            <Button variant="outline" size="sm" onClick={onRefresh}>
              Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredHistory.slice(0, 5).map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{item.jobTitle}</div>
                  <div className="text-sm text-gray-600">
                    ${item.prediction.predictedCost.totalCost.toLocaleString()} • {item.prediction.predictedDuration.totalDays} days
                  </div>
                  <div className="text-xs text-gray-500">
                    {format(new Date(item.createdAt), 'MMM d, yyyy')}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={getStatusBadgeVariant(item.status)}>
                    {getStatusIcon(item.status)}
                  </Badge>
                  {item.actual && (
                    <Badge variant="outline">
                      {getAccuracyIcon(item.actual.accuracy)}
                      {item.actual.accuracy.toFixed(1)}%
                    </Badge>
                  )}
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
      {/* Header and Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <History className="h-6 w-6 mr-2" />
              Prediction History
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={onRefresh}>
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={exportHistory}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search predictions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="predicted">Predicted</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="sort">Sort By</Label>
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="cost">Cost</SelectItem>
                  <SelectItem value="accuracy">Accuracy</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Badge variant="outline" className="w-full justify-center">
                {filteredHistory.length} of {history.length} predictions
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="h-8 w-8 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{history.length}</div>
                <div className="text-sm text-gray-600">Total Predictions</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <div className="text-2xl font-bold">
                  {history.filter(h => h.status === 'completed').length}
                </div>
                <div className="text-sm text-gray-600">Completed</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-8 w-8 text-purple-600" />
              <div>
                <div className="text-2xl font-bold">
                  {history.filter(h => h.actual).length > 0
                    ? (history.filter(h => h.actual).reduce((sum, h) => sum + (h.actual?.accuracy || 0), 0) / history.filter(h => h.actual).length).toFixed(1)
                    : '0'
                  }%
                </div>
                <div className="text-sm text-gray-600">Avg Accuracy</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div>
                <div className="text-2xl font-bold">
                  ${history.length > 0
                    ? (history.reduce((sum, h) => sum + h.prediction.predictedCost.totalCost, 0) / history.length).toFixed(0).toLocaleString()
                    : '0'
                  }
                </div>
                <div className="text-sm text-gray-600">Avg Predicted Cost</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Prediction Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Predicted Cost</TableHead>
                  <TableHead>Predicted Duration</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Actual Results</TableHead>
                  <TableHead>Accuracy</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistory.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{item.jobTitle}</div>
                        <div className="text-sm text-gray-600">{item.prediction.model.name}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        ${item.prediction.predictedCost.totalCost.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-600">
                        ±{((item.prediction.predictedCost.totalCost * 0.2) / 1000).toFixed(0)}k
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{item.prediction.predictedDuration.totalDays} days</div>
                      <div className="text-sm text-gray-600">
                        {item.prediction.predictedDuration.range.min}-{item.prediction.predictedDuration.range.max} days
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <div className="w-12">
                          <div className="text-sm font-medium">{item.prediction.confidence.overall}%</div>
                        </div>
                        <div className="flex-1 max-w-20">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${item.prediction.confidence.overall}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.actual ? (
                        <div>
                          <div className="font-medium">${item.actual.cost.toLocaleString()}</div>
                          <div className="text-sm text-gray-600">{item.actual.duration} days</div>
                        </div>
                      ) : (
                        <span className="text-gray-400">Not available</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.actual ? (
                        <div className="flex items-center space-x-1">
                          {getAccuracyIcon(item.actual.accuracy)}
                          <span className="font-medium">{item.actual.accuracy.toFixed(1)}%</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(item.status)}>
                        {getStatusIcon(item.status)}
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{format(new Date(item.createdAt), 'MMM d, yyyy')}</div>
                        <div className="text-gray-600">{format(new Date(item.createdAt), 'h:mm a')}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedPrediction(item)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {!item.actual && item.status === 'predicted' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleFeedback(item)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredHistory.length === 0 && (
            <div className="text-center py-8 text-gray-600">
              <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No predictions found</p>
              <p className="text-sm mt-2">Try adjusting your filters or search terms</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Prediction Detail Dialog */}
      <Dialog open={!!selectedPrediction && !feedbackDialogOpen} onOpenChange={() => setSelectedPrediction(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Prediction Details</DialogTitle>
          </DialogHeader>
          {selectedPrediction && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-2">Basic Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Project Title:</span>
                      <span>{selectedPrediction.jobTitle}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Prediction ID:</span>
                      <span className="font-mono">{selectedPrediction.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Model:</span>
                      <span>{selectedPrediction.prediction.model.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Created:</span>
                      <span>{format(new Date(selectedPrediction.createdAt), 'PPPpp')}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Predictions</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Total Cost:</span>
                      <span className="font-medium">${selectedPrediction.prediction.predictedCost.totalCost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Duration:</span>
                      <span className="font-medium">{selectedPrediction.prediction.predictedDuration.totalDays} days</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Confidence:</span>
                      <span className="font-medium">{selectedPrediction.prediction.confidence.overall}%</span>
                    </div>
                    {selectedPrediction.actual && (
                      <>
                        <div className="flex justify-between">
                          <span>Actual Cost:</span>
                          <span className="font-medium">${selectedPrediction.actual.cost.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Actual Duration:</span>
                          <span className="font-medium">{selectedPrediction.actual.duration} days</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Cost Breakdown */}
              <div>
                <h4 className="font-medium mb-2">Cost Breakdown</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(selectedPrediction.prediction.predictedCost)
                    .filter(([key]) => key !== 'totalCost' && key !== 'breakdown')
                    .map(([key, value]: [string, any]) => (
                      <div key={key} className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-lg font-bold">${value.amount.toLocaleString()}</div>
                        <div className="text-sm text-gray-600 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                        <div className="text-xs text-gray-500">{value.percentage}%</div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Feedback Dialog */}
      <Dialog open={feedbackDialogOpen} onOpenChange={setFeedbackDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Actual Results</DialogTitle>
          </DialogHeader>
          {selectedPrediction && (
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="font-medium">{selectedPrediction.jobTitle}</div>
                <div className="text-sm text-gray-600">
                  Predicted: ${selectedPrediction.prediction.predictedCost.totalCost.toLocaleString()} • {selectedPrediction.prediction.predictedDuration.totalDays} days
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
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

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setFeedbackDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleFeedbackSubmit}>
                  Submit Feedback
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PredictionHistory;