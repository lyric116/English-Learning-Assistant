import { Response } from 'express';

export interface ApiSuccessResponse<T> {
  success: true;
  code: string;
  message: string;
  data: T;
  timestamp: string;
}

export interface ApiErrorResponse {
  success: false;
  code: string;
  message: string;
  timestamp: string;
}

export function sendSuccess<T>(res: Response, data: T, options: { code?: string; message?: string; status?: number } = {}) {
  const payload: ApiSuccessResponse<T> = {
    success: true,
    code: options.code || 'OK',
    message: options.message || 'ok',
    data,
    timestamp: new Date().toISOString(),
  };
  res.status(options.status || 200).json(payload);
}

export function sendError(res: Response, status: number, code: string, message: string) {
  const payload: ApiErrorResponse = {
    success: false,
    code,
    message,
    timestamp: new Date().toISOString(),
  };
  res.status(status).json(payload);
}
