import { Router, Request, Response, NextFunction } from 'express';
import { generateReadingContent } from '../services/ai-service';
import { validateReadingGeneratePayload } from '../utils/request-validator';
import { learningDataRepository } from '../repositories/learning-data-repository';

export const readingRouter = Router();

readingRouter.post('/generate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      text,
      language,
      topic,
      difficulty,
      length,
      aiConfig,
    } = validateReadingGeneratePayload(req.body);
    const result = await generateReadingContent(
      text,
      { language, topic, difficulty, length },
      aiConfig,
    );
    learningDataRepository.persistReadingContent(req.header('x-anonymous-session-id') || undefined, {
      language,
      topic,
      difficulty,
      length,
      title: result.title,
      english: result.english,
      chinese: result.chinese,
      vocabulary: result.vocabulary,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});
