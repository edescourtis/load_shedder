import { RedisMetricsStorage } from './RedisMetricsStorage';
import { RedisClientType } from 'redis';
import fc from 'fast-check';

describe('RedisMetricsStorage Property-Based Tests', () => {
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

  test('aggregates metrics by selecting minimum values', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            instanceId: fc.string({ minLength: 1 })
              .filter((s) => s.trim().length > 0),
            metrics: fc.dictionary(
              fc.string({ minLength: 1 })
                .filter((s) => s.trim().length > 0),
              fc.oneof(
                fc.constant(null),
                fc.float({ min: 0, max: 1000 })
                  .filter(n => !isNaN(n) && isFinite(n))
              )
            ),
          }),
          { minLength: 1 }
        ),
        async (instances) => {
          const keys = instances.map((instance) => `load_shedding_metrics:${instance.instanceId}`);
          (client.keys as jest.Mock).mockResolvedValue(keys);

          (client.get as jest.Mock).mockImplementation(async (key: string) => {
            const instance = instances.find(
              (inst) => `load_shedding_metrics:${inst.instanceId}` === key
            );
            if (!instance) return null;
            
            const metrics = instance.metrics;
            const validMetrics = Object.fromEntries(
              Object.entries(metrics)
                .filter(([_, value]) => value !== null && !isNaN(value) && isFinite(value))
            );
            
            return Object.keys(validMetrics).length > 0
              ? JSON.stringify({ timestamp: Date.now(), ...validMetrics })
              : null;
          });

          const aggregatedMetrics = await storage.getMetrics();

          // Calculate expected metrics
          const expectedMetrics: Record<string, number> = {};
          const allMetrics = instances.map(inst => inst.metrics);
          const allKeys = [...new Set(allMetrics.flatMap(Object.keys))];

          for (const key of allKeys) {
            const values = allMetrics
              .map(metrics => metrics[key])
              .filter((val): val is number => 
                val !== null && 
                typeof val === 'number' && 
                !isNaN(val) && 
                isFinite(val)
              );
            
            if (values.length > 0) {
              expectedMetrics[key] = Math.min(...values);
            }
          }

          expect(aggregatedMetrics).toEqual(expectedMetrics);
        }
      )
    );
  });
}); 