import { RedisMetricsStorage } from './RedisMetricsStorage';
import { RedisClientType } from 'redis';
import fc from 'fast-check';

interface InstanceData {
  instanceId: string;
  metrics: Record<string, number>;
}

describe('RedisMetricsStorage Property-Based Tests', () => {
  let redisClientMock: jest.Mocked<RedisClientType>;
  let storage: RedisMetricsStorage;

  beforeEach(() => {
    redisClientMock = {
      keys: jest.fn(),
      get: jest.fn(),
      set: jest.fn(),
    } as unknown as jest.Mocked<RedisClientType>;
    storage = new RedisMetricsStorage(redisClientMock);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('aggregates metrics by selecting minimum values', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uniqueArray<InstanceData, string>(
          fc.record({
            instanceId: fc.string().filter((id: string) => id.trim() !== ''),
            metrics: fc.dictionary(
              fc.string().filter((name: string) => {
                return name.trim() !== '' && !['valueOf', 'toString', 'hasOwnProperty'].includes(name);
              }),
              fc.nat()
            ),
          }),
          {
            selector: (instance: InstanceData) => instance.instanceId,
          }
        ),
        async (instances: InstanceData[]) => {
          const keyValues: Record<string, Record<string, number>> = {};
          for (const instance of instances) {
            const key = `load_shedding_metrics:${instance.instanceId}`;
            keyValues[key] = instance.metrics;
          }

          const keys = Object.keys(keyValues);
          redisClientMock.keys.mockResolvedValue(keys);

          redisClientMock.get.mockImplementation(
            async (...args: unknown[]): Promise<string | null> => {
              let key: string | Buffer;

              if (typeof args[0] === 'string' || Buffer.isBuffer(args[0])) {
                key = args[0];
              } else if (args.length > 1 && (typeof args[1] === 'string' || Buffer.isBuffer(args[1]))) {
                key = args[1];
              } else {
                throw new Error('Invalid arguments for redisClientMock.get');
              }

              const keyString = key.toString();
              return keyValues[keyString] ? JSON.stringify(keyValues[keyString]) : null;
            }
          );

          const aggregatedMetrics = await storage.getMetrics();

          // Build expected metrics
          const expectedMetrics: Record<string, number> = {};
          for (const instance of instances) {
            for (const metricName in instance.metrics) {
              if (Object.prototype.hasOwnProperty.call(instance.metrics, metricName)) {
                const value = instance.metrics[metricName];

                if (
                  !Object.prototype.hasOwnProperty.call(expectedMetrics, metricName) ||
                  value < expectedMetrics[metricName]
                ) {
                  expectedMetrics[metricName] = value;
                }
              }
            }
          }

          // Expect the aggregated metrics to equal the expected ones
          expect(aggregatedMetrics).toEqual(expectedMetrics);
        }
      ),
      { verbose: true }
    );
  });
}); 