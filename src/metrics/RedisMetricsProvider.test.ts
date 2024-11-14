import { RedisMetricsProvider } from './RedisMetricsProvider';
import { RedisClientType } from 'redis';

describe('RedisMetricsProvider', () => {
  let client: RedisClientType;
  let provider: RedisMetricsProvider;

  beforeEach(() => {
    client = {
      info: jest.fn(),
      ping: jest.fn(),
    } as unknown as RedisClientType;

    provider = new RedisMetricsProvider(client);
  });

  test('collects metrics correctly', async () => {
    (client.info as jest.Mock).mockResolvedValue('used_memory:104857600'); // 100 MB
    jest.spyOn(provider as any, 'getCommandLatency').mockResolvedValue(5);

    const metrics = await provider.collectMetrics();

    expect(metrics).toEqual({
      timestamp: expect.any(Number),
      redisMemoryUsage: 100,
      redisCommandLatency: 5,
    });
  });

  test('parses memory usage from info', async () => {
    (client.info as jest.Mock).mockResolvedValue('used_memory:52428800'); // 50 MB

    const memoryUsage = await (provider as any).getMemoryUsage();

    expect(memoryUsage).toBe(50);
  });

  test('measures command latency', async () => {
    (client.ping as jest.Mock).mockResolvedValue('PONG');

    const latency = await (provider as any).getCommandLatency();

    expect(latency).toBeGreaterThanOrEqual(0);
  });
}); 