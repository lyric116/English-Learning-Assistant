import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { logger } from '../utils/logger';
import { runWithRequestContext } from '../utils/request-context';

function normalizeTraceId(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, 128);
}

export function requestTracingMiddleware(req: Request, res: Response, next: NextFunction): void {
  const traceId = normalizeTraceId(req.headers['x-trace-id']) || randomUUID();
  const startedAt = Date.now();

  runWithRequestContext(traceId, () => {
    res.setHeader('x-trace-id', traceId);

    res.on('finish', () => {
      logger.info('http.request.complete', {
        traceId,
        method: req.method,
        path: req.originalUrl || req.url,
        statusCode: res.statusCode,
        durationMs: Date.now() - startedAt,
      });
    });

    next();
  });
}
