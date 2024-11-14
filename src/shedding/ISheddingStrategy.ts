// src/shedding/ISheddingStrategy.ts

import { AggregatedMetrics } from '../storage/IMetricsStorage';

export interface ISheddingStrategy {
  calculateSheddingPercentage(metrics: AggregatedMetrics): number;
}