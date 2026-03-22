import express from 'express';
import { config } from './config';
import { corsMiddleware } from './middleware/cors';
import { rateLimiter } from './middleware/rate-limiter';
import { errorHandler } from './middleware/error-handler';
import { requestTracingMiddleware } from './middleware/request-tracing';
import { flashcardsRouter } from './routes/flashcards';
import { sentenceRouter } from './routes/sentence';
import { readingRouter } from './routes/reading';
import { quizRouter } from './routes/quiz';
import { reportRouter } from './routes/report';
import { migrationRouter } from './routes/migration';
import { testConnection } from './services/ai-service';
import { validateAiTestPayload } from './utils/request-validator';
import { sendError, sendSuccess } from './utils/response';
import { logger } from './utils/logger';

const app = express();

app.use(corsMiddleware);
app.use(express.json({ limit: '10mb' }));
app.use(requestTracingMiddleware);
app.use('/api/v1', rateLimiter);

// Health check
app.get('/api/v1/health', (_req, res) => {
  sendSuccess(res, { status: 'ok' });
});

// API base route
app.get('/api/v1', (_req, res) => {
  sendSuccess(res, {
    service: 'english-learning-api',
    status: 'ok',
    version: 'v1',
    endpoints: [
      'GET /api/v1/health',
      'POST /api/v1/ai/test',
      'POST /api/v1/flashcards/extract',
      'POST /api/v1/sentence/analyze',
      'POST /api/v1/reading/generate',
      'POST /api/v1/quiz/reading-questions',
      'POST /api/v1/quiz/vocabulary-questions',
      'POST /api/v1/report/generate',
      'POST /api/v1/report/share',
      'GET /api/v1/report/share/:shareId',
      'POST /api/v1/report/share/:shareId/events',
      'GET /api/v1/migration/status',
      'POST /api/v1/migration/backfill',
    ],
  });
});

// AI connection test
app.post('/api/v1/ai/test', async (req, res, next) => {
  try {
    const { aiConfig } = validateAiTestPayload(req.body);
    const result = await testConnection(aiConfig);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
});

// Routes
app.use('/api/v1/flashcards', flashcardsRouter);
app.use('/api/v1/sentence', sentenceRouter);
app.use('/api/v1/reading', readingRouter);
app.use('/api/v1/quiz', quizRouter);
app.use('/api/v1/report', reportRouter);
app.use('/api/v1/migration', migrationRouter);
app.use('/api/v1', (_req, res) => {
  sendError(res, 404, 'NOT_FOUND', 'API 路由不存在');
});

app.use(errorHandler);

if (process.env.VERCEL !== '1') {
  const server = app.listen(config.port, () => {
    logger.info('server.started', { port: config.port, env: config.nodeEnv });
  });

  server.on('error', error => {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'EADDRINUSE') {
      logger.error('server.listen.failed', {
        port: config.port,
        code: err.code,
        message: `端口 ${config.port} 已被占用。请停止旧进程，或使用 PORT=<新端口> npm run dev 启动。`,
      });
      process.exit(1);
    }

    logger.error('server.listen.failed', {
      port: config.port,
      code: err.code || 'UNKNOWN',
      message: err.message || '监听端口失败',
    });
    process.exit(1);
  });
}

export default app;
