import { Router, Request, Response, NextFunction } from 'express';
import { generateLearningReport } from '../services/ai-service';
import { validateReportGeneratePayload } from '../utils/request-validator';
import { learningDataRepository } from '../repositories/learning-data-repository';
import { sendSuccess } from '../utils/response';

export const reportRouter = Router();

function parseLimit(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) return fallback;
  return Math.max(1, Math.min(parsed, 200));
}

reportRouter.post('/generate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reportType, learningData, aiConfig } = validateReportGeneratePayload(req.body);
    const result = await generateLearningReport(reportType, learningData, aiConfig);
    learningDataRepository.persistLearningReport(
      req.header('x-anonymous-session-id') || undefined,
      reportType,
      result as Record<string, unknown>,
    );
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
});

reportRouter.get('/history', (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = parseLimit(req.query.limit, 20);
    const result = learningDataRepository.getReportHistory(req.header('x-anonymous-session-id') || undefined, limit);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
});
