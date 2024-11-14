import { LoadShedder } from '../shedding/LoadShedder';
import { IMetricsStorage } from '../storage/IMetricsStorage';
import { ISheddingStrategy } from '../shedding/ISheddingStrategy';

describe('LoadShedder', () => {
  let metricsStorageMock: IMetricsStorage;
  let sheddingStrategyMock: ISheddingStrategy;
  let loadShedder: LoadShedder;

  beforeEach(() => {
    metricsStorageMock = {
      saveMetrics: jest.fn(),
      getMetrics: jest.fn(),
    };

    sheddingStrategyMock = {
      calculateSheddingPercentage: jest.fn().mockReturnValue(0),
    };

    loadShedder = new LoadShedder(metricsStorageMock, sheddingStrategyMock);
  });

  test('processes request when hash value is >= shedding percentage', () => {
    const identifier = 'test-user';
    loadShedder['sheddingPercentage'] = 50;

    // Mock hashIdentifier to return a value >= sheddingPercentage
    jest.spyOn<any, any>(loadShedder, 'hashIdentifier').mockReturnValue(70);

    const result = loadShedder.shouldProcessRequest(identifier);

    expect(result).toBe(true); // Now, hashValue is 70, which is >= 50
  });

  test('does not process request when hash value is < shedding percentage', () => {
    const identifier = 'another-user';
    loadShedder['sheddingPercentage'] = 80;

    // Mock hashIdentifier to return a value < sheddingPercentage
    jest.spyOn<any, any>(loadShedder, 'hashIdentifier').mockReturnValue(60);

    const result = loadShedder.shouldProcessRequest(identifier);

    expect(result).toBe(false); // Now, hashValue is 60, which is < 80
  });
}); 