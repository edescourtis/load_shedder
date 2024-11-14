// src/storage/RedisMetricsStorage.ts

import { IMetricsStorage, AggregatedMetrics } from './IMetricsStorage';
import { RedisClientType } from 'redis';
import { MetricsData } from '../metrics/IMetricsProvider';

export class RedisMetricsStorage implements IMetricsStorage {
  private client: RedisClientType;
  private metricsKeyPrefix: string = 'load_shedding_metrics';

  constructor(client: RedisClientType) {
    this.client = client;
  }

  public async saveMetrics(instanceId: string, metrics: MetricsData): Promise<void> {
    const key = `${this.metricsKeyPrefix}:${instanceId}`;
    await this.client.set(key, JSON.stringify(metrics), {
      EX: 15, // Set expiration time in seconds (adjust as needed)
    });
  }

  public async getMetrics(): Promise<AggregatedMetrics> {
    const keys = await this.client.keys(`${this.metricsKeyPrefix}:*`);
    const aggregated: AggregatedMetrics = {};

    for (const key of keys) {
      const metricsString = await this.client.get(key);
      if (metricsString) {
        const metrics: MetricsData = JSON.parse(metricsString);
        for (const [metricName, value] of Object.entries(metrics)) {
          if (metricName !== 'timestamp') {
            if (!aggregated[metricName] || value < aggregated[metricName]) {
              aggregated[metricName] = value;
            }
          }
        }
      }
    }

    return aggregated;
  }
}