import { Router, Request, Response, NextFunction } from 'express';
import { generateReadingQuestions, generateVocabularyQuestions } from '../services/ai-service';
import { validateReadingQuestionsPayload, validateVocabularyQuestionsPayload } from '../utils/request-validator';
import { learningDataRepository } from '../repositories/learning-data-repository';

export const quizRouter = Router();

function parseLimit(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) return fallback;
  return Math.max(1, Math.min(parsed, 200));
}

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

quizRouter.post('/history/sync', (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = req.body as Record<string, unknown>;
    const type = payload.type === 'reading' || payload.type === 'vocabulary' ? payload.type : 'reading';
    const score = typeof payload.score === 'number' ? Math.max(0, Math.min(100, Math.round(payload.score))) : 0;
    const questionCount = typeof payload.questionCount === 'number' ? Math.max(0, Math.round(payload.questionCount)) : 0;
    const difficulty = payload.difficulty === 'easy' || payload.difficulty === 'medium' || payload.difficulty === 'hard'
      ? payload.difficulty
      : 'medium';
    const timedMode = Boolean(payload.timedMode);
    const timeLimitMinutes = typeof payload.timeLimitMinutes === 'number' ? Math.max(1, Math.round(payload.timeLimitMinutes)) : undefined;
    const timeSpentSeconds = typeof payload.timeSpentSeconds === 'number' ? Math.max(0, Math.round(payload.timeSpentSeconds)) : undefined;
    const date = typeof payload.date === 'string' && payload.date ? payload.date : new Date().toISOString();
    const readingTitle = typeof payload.readingTitle === 'string' && payload.readingTitle
      ? payload.readingTitle
      : '未知阅读';

    learningDataRepository.persistQuizResult(req.header('x-anonymous-session-id') || undefined, {
      type,
      score,
      date,
      readingTitle,
      questionCount,
      difficulty,
      timedMode,
      timeLimitMinutes,
      timeSpentSeconds,
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

quizRouter.get('/history', (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = parseLimit(req.query.limit, 20);
    const result = learningDataRepository.getQuizHistory(req.header('x-anonymous-session-id') || undefined, limit);
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
