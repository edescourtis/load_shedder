import { RedisMetricsProvider } from './RedisMetricsProvider';
import { mock, MockProxy } from 'jest-mock-extended';
import { RedisClientType } from 'redis';

describe('RedisMetricsProvider', () => {
  let clientMock: MockProxy<RedisClientType>;
  let provider: RedisMetricsProvider;

  beforeEach(() => {
    clientMock = mock<RedisClientType>();
    provider = new RedisMetricsProvider(clientMock);
  });

  test('collects metrics correctly', async () => {
    clientMock.info.mockResolvedValue('used_memory:104857600'); // 100 MB
    jest.spyOn(provider as any, 'getCommandLatency').mockResolvedValue(5);

    const metrics = await provider.collectMetrics();

    expect(metrics).toEqual({
      timestamp: expect.any(Number),
      redisMemoryUsage: 100,
      redisCommandLatency: 5,
    });
  });

  test('parses memory usage from info', async () => {
    clientMock.info.mockResolvedValue('used_memory:52428800'); // 50 MB

    const memoryUsage = await (provider as any).getMemoryUsage();

    expect(memoryUsage).toBe(50);
  });

  test('measures command latency', async () => {
    clientMock.ping.mockResolvedValue('PONG');

    const latency = await (provider as any).getCommandLatency();

    expect(latency).toBeGreaterThanOrEqual(0);
  });
}); 