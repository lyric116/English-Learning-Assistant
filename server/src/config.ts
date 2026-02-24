import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  rateLimit: {
    windowMs: 60 * 1000,
    max: 20,
  },
  ai: {
    requestTimeoutMs: parseInt(process.env.AI_REQUEST_TIMEOUT_MS || '45000', 10),
    allowPrivateHosts: process.env.ALLOW_PRIVATE_AI_HOSTS === '1',
  },
};
