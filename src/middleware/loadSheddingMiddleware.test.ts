import { Request, Response } from 'express';
import { loadSheddingMiddleware } from './loadSheddingMiddleware';
import { LoadShedder } from '../shedding/LoadShedder';
import { IMetricsStorage } from '../storage/IMetricsStorage';
import { ISheddingStrategy } from '../shedding/ISheddingStrategy';

/**
 * MockRequest allowing customization of properties for testing.
 */
interface MockRequest extends Request {
  ip: string;
}

describe('loadSheddingMiddleware', () => {
  let loadShedder: LoadShedder;
  let metricsStorageMock: IMetricsStorage;
  let sheddingStrategyMock: ISheddingStrategy;

  beforeEach(() => {
    metricsStorageMock = {
      saveMetrics: jest.fn(),
      getMetrics: jest.fn(),
    };

    sheddingStrategyMock = {
      calculateSheddingPercentage: jest.fn().mockReturnValue(0),
    };

    loadShedder = new LoadShedder(metricsStorageMock, sheddingStrategyMock);
    jest.spyOn(loadShedder, 'shouldProcessRequest').mockReturnValue(true);
  });

  test('handles request with undefined IP', () => {
    const req = {
      ip: '',
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
    } as unknown as MockRequest;

    const res = {} as Response;
    const next = jest.fn();

    loadSheddingMiddleware(loadShedder)(req, res, next);

    expect(next).toHaveBeenCalled();
  });
}); 