import rateLimit from 'express-rate-limit';
import { config } from '../config';

export const rateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    success: false,
    code: 'RATE_LIMITED',
    message: 'API请求过于频繁，请稍后再试',
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
});
