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
    const aggregated: AggregatedMetrics = {};
    try {
      const keys = await this.client.keys(`${this.metricsKeyPrefix}:*`);
      for (const key of keys) {
        try {
          const metricsString = await this.client.get(key);
          if (metricsString) {
            const metrics: MetricsData = JSON.parse(metricsString);
            for (const [metricName, value] of Object.entries(metrics)) {
              if (metricName !== 'timestamp') {
                if (
                  !Object.prototype.hasOwnProperty.call(aggregated, metricName) ||
                  value < aggregated[metricName]
                ) {
                  aggregated[metricName] = value;
                }
              }
            }
          }
        } catch (error) {
          console.error(`Error parsing metrics for key ${key}:`, error);
        }
      }
    } catch (error) {
      console.error('Error fetching keys from Redis:', error);
    }
    return aggregated;
  }
}