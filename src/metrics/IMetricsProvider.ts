// src/metrics/IMetricsProvider.ts

export interface IMetricsProvider {
  collectMetrics(): Promise<MetricsData>;
}

export interface MetricsData {
  timestamp: number;
  [key: string]: any;
}