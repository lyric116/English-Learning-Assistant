import { Router, Request, Response, NextFunction } from 'express';
import { extractWords } from '../services/ai-service';
import { validateFlashcardsExtractPayload } from '../utils/request-validator';

export const flashcardsRouter = Router();

flashcardsRouter.post('/extract', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { text, maxWords, level, aiConfig } = validateFlashcardsExtractPayload(req.body);
    const result = await extractWords(text, maxWords, level, aiConfig);
    res.json(result);
  } catch (err) {
    next(err);
  }
});
