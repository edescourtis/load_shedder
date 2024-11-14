import { ThresholdSheddingStrategy, SheddingThresholds } from './ThresholdSheddingStrategy';
import { AggregatedMetrics } from '../storage/IMetricsStorage';

describe('ThresholdSheddingStrategy', () => {
  const thresholds: SheddingThresholds = {
    cpuUsage: {
      levels: [
        [90, 80],
        [70, 50],
        [50, 20],
      ],
    },
  };

  let strategy: ThresholdSheddingStrategy;

  beforeEach(() => {
    strategy = new ThresholdSheddingStrategy(thresholds);
  });

  test('calculates correct shedding percentage based on cpuUsage', () => {
    const metrics: AggregatedMetrics = {
      cpuUsage: 75,
    };

    const percentage = strategy.calculateSheddingPercentage(metrics);

    expect(percentage).toBe(50);
  });

  test('returns 0 shedding percentage when metric is below thresholds', () => {
    const metrics: AggregatedMetrics = {
      cpuUsage: 30,
    };

    const percentage = strategy.calculateSheddingPercentage(metrics);

    expect(percentage).toBe(0);
  });

  test('returns maximum shedding percentage', () => {
    const metrics: AggregatedMetrics = {
      cpuUsage: 95,
    };

    const percentage = strategy.calculateSheddingPercentage(metrics);

    expect(percentage).toBe(80);
  });

  test('handles multiple metrics and chooses the highest shedding percentage', () => {
    const multiThresholds: SheddingThresholds = {
      cpuUsage: {
        levels: [
          [90, 80],
          [70, 50],
          [50, 20],
        ],
      },
      redisMemoryUsage: {
        levels: [
          [150, 50],
          [100, 30],
        ],
      },
    };

    const strategy = new ThresholdSheddingStrategy(multiThresholds);

    const metrics: AggregatedMetrics = {
      cpuUsage: 85,
      redisMemoryUsage: 120,
    };

    const percentage = strategy.calculateSheddingPercentage(metrics);

    expect(percentage).toBe(50); // Highest among calculated percentages
  });
}); 