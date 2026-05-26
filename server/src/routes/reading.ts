import { Router, Request, Response, NextFunction } from 'express';
import { generateReadingContent } from '../services/ai-service';
import { validateReadingGeneratePayload } from '../utils/request-validator';
import { learningDataRepository } from '../repositories/learning-data-repository';
import { sendSuccess } from '../utils/response';
import { getRequestOwner, requestOwnerMiddleware } from '../middleware/request-owner';

export const readingRouter = Router();
readingRouter.use(requestOwnerMiddleware);

function parseLimit(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) return fallback;
  return Math.max(1, Math.min(parsed, 200));
}

readingRouter.post('/generate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      text,
      generationMode,
      language,
      topic,
      difficulty,
      length,
      aiConfig,
    } = validateReadingGeneratePayload(req.body);
    const result = await generateReadingContent(
      text,
      { generationMode, language, topic, difficulty, length },
      aiConfig,
    );
    learningDataRepository.persistReadingContent(getRequestOwner(req), {
      language,
      topic,
      difficulty,
      length,
      title: result.title,
      english: result.english,
      chinese: result.chinese,
      vocabulary: result.vocabulary,
    });
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
});

readingRouter.get('/history', (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = parseLimit(req.query.limit, 20);
    const result = learningDataRepository.getReadingHistory(getRequestOwner(req), limit);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
});
