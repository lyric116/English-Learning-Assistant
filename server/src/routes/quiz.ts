import { Router, Request, Response, NextFunction } from 'express';
import { generateReadingQuestions, generateVocabularyQuestions } from '../services/ai-service';
import { validateReadingQuestionsPayload, validateVocabularyQuestionsPayload } from '../utils/request-validator';
import { learningDataRepository } from '../repositories/learning-data-repository';

export const quizRouter = Router();

quizRouter.post('/reading-questions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      reading,
      questionCount,
      difficulty,
      timedMode,
      timeLimitMinutes,
      aiConfig,
    } = validateReadingQuestionsPayload(req.body);
    const result = await generateReadingQuestions(
      reading,
      { questionCount, difficulty, timedMode, timeLimitMinutes },
      aiConfig,
    );
    learningDataRepository.persistQuizGeneration(req.header('x-anonymous-session-id') || undefined, {
      quizType: 'reading',
      questionCount,
      difficulty,
      timedMode,
      timeLimitMinutes,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

quizRouter.post('/vocabulary-questions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      vocabulary,
      questionCount,
      difficulty,
      timedMode,
      timeLimitMinutes,
      aiConfig,
    } = validateVocabularyQuestionsPayload(req.body);
    const result = await generateVocabularyQuestions(
      vocabulary,
      { questionCount, difficulty, timedMode, timeLimitMinutes },
      aiConfig,
    );
    learningDataRepository.persistQuizGeneration(req.header('x-anonymous-session-id') || undefined, {
      quizType: 'vocabulary',
      questionCount,
      difficulty,
      timedMode,
      timeLimitMinutes,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});
