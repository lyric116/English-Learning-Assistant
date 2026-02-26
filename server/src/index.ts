import express from 'express';
import { config } from './config';
import { corsMiddleware } from './middleware/cors';
import { rateLimiter } from './middleware/rate-limiter';
import { errorHandler } from './middleware/error-handler';
import { flashcardsRouter } from './routes/flashcards';
import { sentenceRouter } from './routes/sentence';
import { readingRouter } from './routes/reading';
import { quizRouter } from './routes/quiz';
import { reportRouter } from './routes/report';
import { migrationRouter } from './routes/migration';
import { testConnection } from './services/ai-service';
import { validateAiTestPayload } from './utils/request-validator';

const app = express();

app.use(corsMiddleware);
app.use(express.json({ limit: '10mb' }));
app.use('/api/v1', rateLimiter);

// Health check
app.get('/api/v1/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API base route
app.get('/api/v1', (_req, res) => {
  res.json({
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
    res.json(result);
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
  res.status(404).json({ error: 'API 路由不存在' });
});

app.use(errorHandler);

if (process.env.VERCEL !== '1') {
  app.listen(config.port, () => {
    console.log(`Server running on http://localhost:${config.port}`);
  });
}

export default app;
