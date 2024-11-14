// src/shedding/ThresholdSheddingStrategy.ts

import { ISheddingStrategy } from './ISheddingStrategy';
import { AggregatedMetrics } from '../storage/IMetricsStorage';

export interface SheddingThresholds {
  [metricName: string]: MetricThreshold;
}

export interface MetricThreshold {
  levels: [number, number][]; // [thresholdValue, sheddingPercentage]
}

export class ThresholdSheddingStrategy implements ISheddingStrategy {
  constructor(private readonly thresholds: SheddingThresholds) {}

  /**
   * Calculates the shedding percentage based on aggregated metrics.
   * @param metrics - The aggregated metrics.
   * @returns The calculated shedding percentage.
   */
  public calculateSheddingPercentage(metrics: AggregatedMetrics): number {
    let maxPercentage = 0;

    for (const [metricName, value] of Object.entries(metrics)) {
      const threshold = this.thresholds[metricName];
      if (threshold) {
        const metricPercentage = this.calculateMetricShedding(value, threshold);
        maxPercentage = Math.max(maxPercentage, metricPercentage);
        console.debug(
          `Metric: ${metricName}, Value: ${value}, Metric Percentage: ${metricPercentage}%`
        );
      }
    }

    return Math.min(maxPercentage, 100);
  }

  /**
   * Calculates the shedding percentage for a single metric.
   * @param value - The value of the metric.
   * @param threshold - The threshold levels for the metric.
   * @returns The shedding percentage for the metric.
   */
  private calculateMetricShedding(value: number, threshold: MetricThreshold): number {
    for (const [level, shedPercentage] of threshold.levels) {
      if (value >= level) {
        return shedPercentage;
      }
    }
    return 0;
  }
}