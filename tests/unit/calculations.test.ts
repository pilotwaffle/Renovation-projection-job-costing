import { describe, it, expect } from 'vitest';

/**
 * Calculation utilities for budget variance and totals
 */

export function calculateLaborCost(hours: number, rate: number): number {
  return hours * rate;
}

export function calculateEstimatedTotal(
  materialCost: number,
  laborHours: number,
  laborRate: number
): number {
  return materialCost + calculateLaborCost(laborHours, laborRate);
}

export function calculateActualTotal(
  actualMaterialCost: number,
  actualLaborHours: number,
  laborRate: number
): number {
  return actualMaterialCost + calculateLaborCost(actualLaborHours, laborRate);
}

export function calculateVariance(
  actualTotal: number,
  estimatedTotal: number
): number {
  return actualTotal - estimatedTotal;
}

export function calculateVariancePercentage(
  variance: number,
  estimatedTotal: number
): number {
  if (estimatedTotal === 0) return 0;
  return (variance / estimatedTotal) * 100;
}

export function calculateBudgetTotals(items: Array<{
  estimated_material_cost: number;
  estimated_labor_hours: number;
  estimated_labor_rate: number;
  actual_material_cost: number;
  actual_labor_hours: number;
}>) {
  const estimated = items.reduce((sum, item) => {
    return sum + calculateEstimatedTotal(
      item.estimated_material_cost,
      item.estimated_labor_hours,
      item.estimated_labor_rate
    );
  }, 0);

  const actual = items.reduce((sum, item) => {
    return sum + calculateActualTotal(
      item.actual_material_cost,
      item.actual_labor_hours,
      item.estimated_labor_rate
    );
  }, 0);

  const variance = calculateVariance(actual, estimated);
  const variancePercentage = calculateVariancePercentage(variance, estimated);

  return {
    totalEstimated: estimated,
    totalActual: actual,
    totalVariance: variance,
    variancePercentage,
  };
}

describe('Budget Calculations', () => {
  describe('calculateLaborCost', () => {
    it('should calculate labor cost correctly', () => {
      expect(calculateLaborCost(10, 50)).toBe(500);
      expect(calculateLaborCost(0, 50)).toBe(0);
      expect(calculateLaborCost(10, 0)).toBe(0);
    });
  });

  describe('calculateEstimatedTotal', () => {
    it('should calculate estimated total correctly', () => {
      expect(calculateEstimatedTotal(1000, 10, 50)).toBe(1500);
      expect(calculateEstimatedTotal(0, 10, 50)).toBe(500);
      expect(calculateEstimatedTotal(1000, 0, 50)).toBe(1000);
    });
  });

  describe('calculateActualTotal', () => {
    it('should calculate actual total correctly', () => {
      expect(calculateActualTotal(1200, 12, 50)).toBe(1800);
      expect(calculateActualTotal(0, 12, 50)).toBe(600);
      expect(calculateActualTotal(1200, 0, 50)).toBe(1200);
    });
  });

  describe('calculateVariance', () => {
    it('should calculate positive variance (over budget)', () => {
      expect(calculateVariance(1800, 1500)).toBe(300);
    });

    it('should calculate negative variance (under budget)', () => {
      expect(calculateVariance(1400, 1500)).toBe(-100);
    });

    it('should handle zero variance', () => {
      expect(calculateVariance(1500, 1500)).toBe(0);
    });
  });

  describe('calculateVariancePercentage', () => {
    it('should calculate positive variance percentage', () => {
      expect(calculateVariancePercentage(300, 1500)).toBe(20);
    });

    it('should calculate negative variance percentage', () => {
      expect(calculateVariancePercentage(-100, 1500)).toBeCloseTo(-6.67, 2);
    });

    it('should handle zero estimated total', () => {
      expect(calculateVariancePercentage(100, 0)).toBe(0);
    });

    it('should handle zero variance', () => {
      expect(calculateVariancePercentage(0, 1500)).toBe(0);
    });
  });

  describe('calculateBudgetTotals', () => {
    it('should calculate totals for multiple items', () => {
      const items = [
        {
          estimated_material_cost: 1000,
          estimated_labor_hours: 10,
          estimated_labor_rate: 50,
          actual_material_cost: 1200,
          actual_labor_hours: 12,
        },
        {
          estimated_material_cost: 500,
          estimated_labor_hours: 5,
          estimated_labor_rate: 50,
          actual_material_cost: 450,
          actual_labor_hours: 4,
        },
      ];

      const totals = calculateBudgetTotals(items);

      expect(totals.totalEstimated).toBe(2250); // (1000 + 500) + (10*50 + 5*50)
      expect(totals.totalActual).toBe(2450); // (1200 + 450) + (12*50 + 4*50)
      expect(totals.totalVariance).toBe(200);
      expect(totals.variancePercentage).toBeCloseTo(8.89, 2);
    });

    it('should handle empty items array', () => {
      const totals = calculateBudgetTotals([]);

      expect(totals.totalEstimated).toBe(0);
      expect(totals.totalActual).toBe(0);
      expect(totals.totalVariance).toBe(0);
      expect(totals.variancePercentage).toBe(0);
    });
  });
});
