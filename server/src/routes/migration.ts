import { Router, Request, Response, NextFunction } from 'express';
import { learningDataRepository } from '../repositories/learning-data-repository';
import { sendSuccess } from '../utils/response';
import { getRequestOwner, requestOwnerMiddleware } from '../middleware/request-owner';

export const migrationRouter = Router();
migrationRouter.use(requestOwnerMiddleware);

migrationRouter.get('/status', (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = learningDataRepository.getBackfillStatus(getRequestOwner(req));
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
});

migrationRouter.post('/backfill', (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = (req.body && typeof req.body === 'object') ? req.body as Record<string, unknown> : {};
    const result = learningDataRepository.runBackfill(
      getRequestOwner(req),
      {
        flashcards: Array.isArray(payload.flashcards) ? payload.flashcards as never[] : [],
        sentenceHistory: Array.isArray(payload.sentenceHistory) ? payload.sentenceHistory as never[] : [],
        readingHistory: Array.isArray(payload.readingHistory) ? payload.readingHistory as never[] : [],
        testHistory: Array.isArray(payload.testHistory) ? payload.testHistory as never[] : [],
        reportHistory: Array.isArray(payload.reportHistory) ? payload.reportHistory as never[] : [],
      },
    );
    sendSuccess(res, { ok: true, synced: result });
  } catch (err) {
    next(err);
  }
});
