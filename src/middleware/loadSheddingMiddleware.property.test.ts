import { loadSheddingMiddleware } from './loadSheddingMiddleware';
import { LoadShedder } from '../shedding/LoadShedder';
import { Request, Response, NextFunction } from 'express';
import fc from 'fast-check';
import { IMetricsStorage } from '../storage/IMetricsStorage';
import { ISheddingStrategy } from '../shedding/ISheddingStrategy';

describe('loadSheddingMiddleware Property-Based Tests', () => {
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
  });

  test('middleware processes requests correctly based on identifier', () => {
    fc.assert(
      fc.property(
        fc.record({
          headers: fc.dictionary(fc.string(), fc.string()),
          ip: fc.string(),
          socket: fc.record({ remoteAddress: fc.string() }),
        }),
        fc.boolean(),
        (reqProps, shouldProcess) => {
          jest.spyOn(loadShedder, 'shouldProcessRequest').mockReturnValue(shouldProcess);

          const req = {
            ip: reqProps.ip,
            socket: reqProps.socket,
            headers: {
              'x-user-id': 'test-identifier',
              ...reqProps.headers,
            },
          } as unknown as Request;

          const res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn().mockReturnThis(),
          } as unknown as Response;

          const next = jest.fn();

          loadSheddingMiddleware(loadShedder)(req, res, next);

          if (shouldProcess) {
            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
          } else {
            expect(res.status).toHaveBeenCalledWith(503);
            expect(res.send).toHaveBeenCalledWith('Service Unavailable - Load shedding in effect');
          }
        }
      )
    );
  });

  test('middleware handles missing identifiers gracefully', () => {
    fc.assert(
      fc.property(
        fc.record({
          ip: fc.oneof(fc.constant(''), fc.constant(undefined)),
          socket: fc.record({ remoteAddress: fc.oneof(fc.constant(''), fc.constant(undefined)) }),
        }),
        (reqProps) => {
          const req = {
            ...reqProps,
            headers: {},
            get: jest.fn(),
            header: jest.fn(),
            accepts: jest.fn(),
            acceptsCharsets: jest.fn(),
            acceptsEncodings: jest.fn(),
            acceptsLanguages: jest.fn(),
            range: jest.fn(),
          } as unknown as Request;

          const res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn().mockReturnThis(),
          } as unknown as Response;

          const next = jest.fn();

          loadSheddingMiddleware(loadShedder)(req, res, next);

          expect(res.status).toHaveBeenCalledWith(400);
          expect(res.send).toHaveBeenCalledWith('Valid identifier is required');
          expect(next).not.toHaveBeenCalled();
        }
      )
    );
  });
}); 