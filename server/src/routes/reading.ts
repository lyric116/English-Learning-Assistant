import { Router, Request, Response, NextFunction } from 'express';
import { generateReadingContent } from '../services/ai-service';
import { validateReadingGeneratePayload } from '../utils/request-validator';

export const readingRouter = Router();

readingRouter.post('/generate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { text, language, aiConfig } = validateReadingGeneratePayload(req.body);
    const result = await generateReadingContent(text, language, aiConfig);
    res.json(result);
  } catch (err) {
    next(err);
  }
});
