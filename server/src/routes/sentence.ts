import { Router, Request, Response, NextFunction } from 'express';
import { analyzeSentence } from '../services/ai-service';
import { validateSentenceAnalyzePayload } from '../utils/request-validator';

export const sentenceRouter = Router();

sentenceRouter.post('/analyze', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sentence, aiConfig } = validateSentenceAnalyzePayload(req.body);
    const result = await analyzeSentence(sentence, aiConfig);
    res.json(result);
  } catch (err) {
    next(err);
  }
});
