import { Router, Request, Response, NextFunction } from 'express';
import { extractWords } from '../services/ai-service';
import { validateFlashcardsExtractPayload } from '../utils/request-validator';
import { learningDataRepository } from '../repositories/learning-data-repository';

export const flashcardsRouter = Router();

interface ExtractedWord {
  word: string;
  phonetic: string;
  definition: string;
  etymology: string;
  example: string;
  exampleTranslation: string;
}

function normalizeExtractedWords(payload: unknown, maxWords: number): ExtractedWord[] {
  if (!Array.isArray(payload)) {
    throw new Error('抽词失败：AI 返回格式无效（需要数组）');
  }

  const normalized = payload
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map(item => ({
      word: String(item.word ?? '').trim(),
      phonetic: String(item.phonetic ?? '').trim(),
      definition: String(item.definition ?? '').trim(),
      etymology: String(item.etymology ?? '').trim(),
      example: String(item.example ?? '').trim(),
      exampleTranslation: String(item.exampleTranslation ?? '').trim(),
    }))
    .filter(item => item.word && item.definition);

  if (normalized.length === 0) {
    throw new Error('抽词失败：未提取到有效单词');
  }

  return normalized.slice(0, maxWords);
}

function parseLimit(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) return fallback;
  return Math.max(1, Math.min(parsed, 500));
}

flashcardsRouter.post('/extract', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { text, maxWords, level, aiConfig } = validateFlashcardsExtractPayload(req.body);
    const result = await extractWords(text, maxWords, level, aiConfig);
    const normalizedResult = normalizeExtractedWords(result, maxWords);
    learningDataRepository.persistFlashcards(req.header('x-anonymous-session-id') || undefined, normalizedResult);
    res.json(normalizedResult);
  } catch (err) {
    next(err);
  }
});

flashcardsRouter.get('/history', (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = parseLimit(req.query.limit, 120);
    const result = learningDataRepository.getFlashcards(req.header('x-anonymous-session-id') || undefined, limit);
    res.json(result);
  } catch (err) {
    next(err);
  }
});
