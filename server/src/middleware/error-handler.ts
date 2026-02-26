import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../utils/request-validator';
import { sendError } from '../utils/response';
import { logger } from '../utils/logger';

function redactSensitive(text: string): string {
  const sanitized = text
    .replace(/sk-[A-Za-z0-9_-]+/g, '[REDACTED_KEY]')
    .replace(/Bearer\s+[A-Za-z0-9._~+/\-=]+/gi, 'Bearer [REDACTED_TOKEN]')
    .replace(/"apiKey"\s*:\s*"[^"]+"/gi, '"apiKey":"[REDACTED_KEY]"')
    .replace(/api[_-]?key=[^&\s]+/gi, 'apiKey=[REDACTED_KEY]');

  return sanitized.length > 240 ? `${sanitized.slice(0, 240)}...` : sanitized;
}

function inferStatus(message: string): number {
  if (message.includes('请先在页面设置') || message.includes('Base URL')) return 400;
  if (message.includes('不能为空') || message.includes('必须是') || message.includes('不支持')) return 400;
  if (message.includes('超时')) return 504;
  if (message.includes('AI 上游服务错误') || message.includes('连接失败') || message.includes('AI 请求失败')) return 502;
  return 500;
}

function inferErrorCode(status: number, message: string): string {
  if (status === 400) return 'BAD_REQUEST';
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  if (status === 429) return 'RATE_LIMITED';
  if (status === 504) return 'UPSTREAM_TIMEOUT';
  if (status === 502) return 'UPSTREAM_FAILURE';
  if (status >= 500) return 'INTERNAL_ERROR';
  if (message.includes('JSON')) return 'INVALID_JSON';
  return 'UNKNOWN_ERROR';
}

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  const sanitizedMessage = redactSensitive(err.message || '未知错误');
  if (err instanceof ValidationError) {
    logger.warn('http.request.validation_failed', {
      method: req.method,
      path: req.originalUrl || req.url,
      error: sanitizedMessage,
    });
    sendError(res, 400, 'VALIDATION_ERROR', sanitizedMessage);
    return;
  }

  const status = inferStatus(sanitizedMessage);
  const code = inferErrorCode(status, sanitizedMessage);
  logger.error('http.request.failed', {
    method: req.method,
    path: req.originalUrl || req.url,
    statusCode: status,
    code,
    error: sanitizedMessage,
  });

  if (status === 500) {
    sendError(res, 500, code, '服务器内部错误，请稍后重试');
    return;
  }

  sendError(res, status, code, sanitizedMessage);
}
