// src/metrics/RedisMetricsProvider.ts

import { IMetricsProvider, MetricsData } from './IMetricsProvider';
import { RedisClientType } from 'redis';

export class RedisMetricsProvider implements IMetricsProvider {
  private client: RedisClientType;

  constructor(client: RedisClientType) {
    this.client = client;
  }

  public async collectMetrics(): Promise<MetricsData> {
    const memoryUsage = await this.getMemoryUsage();
    const commandLatency = await this.getCommandLatency();

    return {
      timestamp: Date.now(),
      redisMemoryUsage: memoryUsage,
      redisCommandLatency: commandLatency,
    };
  }

  private async getMemoryUsage(): Promise<number> {
    const info = await this.client.info('memory');
    const memoryUsageMatch = info.match(/used_memory:(\d+)/);
    if (memoryUsageMatch) {
      const usedMemoryBytes = parseInt(memoryUsageMatch[1], 10);
      const usedMemoryMB = usedMemoryBytes / 1024 / 1024;
      return usedMemoryMB;
    }
    return 0;
  }

  private async getCommandLatency(): Promise<number> {
    const start = process.hrtime();
    await this.client.ping();
    const diff = process.hrtime(start);
    const latencyMs = diff[0] * 1000 + diff[1] / 1e6;
    return latencyMs;
  }
}