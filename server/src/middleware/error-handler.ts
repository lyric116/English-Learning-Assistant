import { Request, Response, NextFunction } from 'express';

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
  if (message.includes('超时')) return 504;
  if (message.includes('AI 上游服务错误') || message.includes('连接失败') || message.includes('AI 请求失败')) return 502;
  return 500;
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  const sanitizedMessage = redactSensitive(err.message || '未知错误');
  const status = inferStatus(sanitizedMessage);
  console.error('[Error]', sanitizedMessage);

  if (status === 500) {
    res.status(500).json({ error: '服务器内部错误，请稍后重试' });
    return;
  }

  res.status(status).json({ error: sanitizedMessage });
}
