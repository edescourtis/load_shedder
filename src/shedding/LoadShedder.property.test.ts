import { LoadShedder } from './LoadShedder';
import { ISheddingStrategy } from './ISheddingStrategy';
import { IMetricsStorage } from '../storage/IMetricsStorage';
import fc from 'fast-check';

describe('LoadShedder Property-Based Tests', () => {
  let metricsStorageMock: IMetricsStorage;
  let sheddingStrategyMock: ISheddingStrategy;
  let loadShedder: LoadShedder;

  beforeEach(() => {
    metricsStorageMock = {
      saveMetrics: jest.fn(),
      getMetrics: jest.fn(),
    };

    sheddingStrategyMock = {
      calculateSheddingPercentage: jest.fn(),
    };

    loadShedder = new LoadShedder(metricsStorageMock, sheddingStrategyMock);
  });

  test('shouldProcessRequest behaves according to shedding percentage', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        fc.fullUnicodeString(),
        (sheddingPercentage, identifier) => {
          fc.pre(identifier.length > 0); // Skip empty identifiers if not allowed
          loadShedder['sheddingPercentage'] = sheddingPercentage;

          const hashValue = loadShedder['hashIdentifier'](identifier) % 100;
          const expectedResult = hashValue >= sheddingPercentage;
          const actualResult = loadShedder.shouldProcessRequest(identifier);

          expect(actualResult).toBe(expectedResult);
        }
      )
    );
  });

  test('should handle extreme shedding percentages and special identifiers', () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.constant(0), fc.constant(100)),
        fc.oneof(fc.constant(''), fc.fullUnicodeString()),
        (sheddingPercentage, identifier) => {
          loadShedder['sheddingPercentage'] = sheddingPercentage;

          const actualResult = loadShedder.shouldProcessRequest(identifier);

          if (sheddingPercentage === 0) {
            expect(actualResult).toBe(true);
          } else if (sheddingPercentage === 100) {
            expect(actualResult).toBe(false);
          }
        }
      )
    );
  });
});

describe('LoadShedder Hash Function Property Tests', () => {
  const loadShedder = new LoadShedder(undefined as any, undefined as any);

  test('hashIdentifier produces values between 0 and 99', () => {
    fc.assert(
      fc.property(fc.string(), (identifier) => {
        const hashValue = loadShedder['hashIdentifier'](identifier) % 100;
        expect(hashValue).toBeGreaterThanOrEqual(0);
        expect(hashValue).toBeLessThan(100);
      })
    );
  });

  test('hashIdentifier is deterministic', () => {
    fc.assert(
      fc.property(fc.string(), (identifier) => {
        const hash1 = loadShedder['hashIdentifier'](identifier);
        const hash2 = loadShedder['hashIdentifier'](identifier);
        expect(hash1).toBe(hash2);
      })
    );
  });
}); 