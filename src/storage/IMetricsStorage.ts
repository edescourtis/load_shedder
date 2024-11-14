// src/storage/IMetricsStorage.ts

import { MetricsData } from '../metrics/IMetricsProvider';

export interface IMetricsStorage {
  saveMetrics(instanceId: string, metrics: MetricsData): Promise<void>;
  getMetrics(): Promise<AggregatedMetrics>;
}

export interface AggregatedMetrics {
  [metricName: string]: number;
}