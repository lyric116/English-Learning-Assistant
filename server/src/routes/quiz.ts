import { Router, Request, Response, NextFunction } from 'express';
import { generateReadingQuestions, generateVocabularyQuestions } from '../services/ai-service';
import { validateReadingQuestionsPayload, validateVocabularyQuestionsPayload } from '../utils/request-validator';

export const quizRouter = Router();

quizRouter.post('/reading-questions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reading, questionCount, aiConfig } = validateReadingQuestionsPayload(req.body);
    const result = await generateReadingQuestions(reading, questionCount, aiConfig);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

quizRouter.post('/vocabulary-questions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { vocabulary, questionCount, aiConfig } = validateVocabularyQuestionsPayload(req.body);
    const result = await generateVocabularyQuestions(vocabulary, questionCount, aiConfig);
    res.json(result);
  } catch (err) {
    next(err);
  }
});
