// src/middleware/loadSheddingMiddleware.ts

import { Request, Response, NextFunction } from 'express';
import { LoadShedder } from '../shedding/LoadShedder';

export function loadSheddingMiddleware(loadShedder: LoadShedder) {
  return (req: Request, res: Response, next: NextFunction) => {
    let identifier = req.headers['x-user-id'] || req.ip || req.socket.remoteAddress;

    if (Array.isArray(identifier)) {
      identifier = identifier[0];
    }

    if (!identifier || typeof identifier !== 'string' || identifier.trim().length === 0) {
      res.status(400).send('Valid identifier is required');
      console.warn('Request rejected: Missing valid identifier');
      return;
    }

    identifier = identifier.trim();

    if (loadShedder.shouldProcessRequest(identifier)) {
      next();
    } else {
      res.status(503).send('Service Unavailable - Load shedding in effect');
      console.warn(`Request from ${identifier} was shed`);
    }
  };
}