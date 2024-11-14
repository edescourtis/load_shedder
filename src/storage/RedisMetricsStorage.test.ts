import { RedisMetricsStorage } from './RedisMetricsStorage';
import { RedisClientType } from 'redis';
import { MetricsData } from '../metrics/IMetricsProvider';

describe('RedisMetricsStorage', () => {
  let client: RedisClientType;
  let storage: RedisMetricsStorage;

  beforeEach(() => {
    client = {
      set: jest.fn(),
      keys: jest.fn(),
      get: jest.fn(),
    } as unknown as RedisClientType;

    storage = new RedisMetricsStorage(client);
  });

  test('saves metrics with expiration', async () => {
    const instanceId = 'instance-1';
    const metrics: MetricsData = { timestamp: Date.now(), cpuUsage: 75 };

    await storage.saveMetrics(instanceId, metrics);

    expect(client.set).toHaveBeenCalledWith(
      'load_shedding_metrics:instance-1',
      JSON.stringify(metrics),
      { EX: 15 }
    );
  });

  test('aggregates metrics correctly', async () => {
    (client.keys as jest.Mock).mockResolvedValue([
      'load_shedding_metrics:instance-1',
      'load_shedding_metrics:instance-2',
    ]);

    (client.get as jest.Mock).mockImplementation((key: string) => {
      if (key === 'load_shedding_metrics:instance-1') {
        return JSON.stringify({ timestamp: Date.now(), cpuUsage: 80, redisMemoryUsage: 60 });
      }
      if (key === 'load_shedding_metrics:instance-2') {
        return JSON.stringify({ timestamp: Date.now(), cpuUsage: 70, redisMemoryUsage: 50 });
      }
    });

    const aggregatedMetrics = await storage.getMetrics();

    expect(aggregatedMetrics).toEqual({
      cpuUsage: 70,           // Minimum cpuUsage among instances
      redisMemoryUsage: 50,   // Minimum redisMemoryUsage among instances
    });
  });
}); 