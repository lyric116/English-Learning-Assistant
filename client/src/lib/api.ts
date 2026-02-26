import type { AIConfig } from '@/types';
import { STORAGE_KEY } from './ai-providers';
import { recordAiCall, shouldAllowCallOverLimit } from './ai-usage';
import { getAnonymousSessionId } from './session';

const API_BASE = '/api/v1';
const REQUEST_TIMEOUT_MS = 95_000;
type FlashcardLevel = 'all' | 'cet4' | 'cet6' | 'advanced';
type ReadingLanguage = 'en' | 'zh';
type ReadingTopic = 'general' | 'work' | 'travel' | 'technology' | 'culture' | 'education';
type ReadingDifficulty = 'easy' | 'medium' | 'hard';
type ReadingLength = 'short' | 'medium' | 'long';
type QuizDifficulty = 'easy' | 'medium' | 'hard';
type ReadingGenerateOptions = {
  language?: ReadingLanguage;
  topic?: ReadingTopic;
  difficulty?: ReadingDifficulty;
  length?: ReadingLength;
};
type QuizGenerateOptions = {
  questionCount?: number;
  difficulty?: QuizDifficulty;
  timedMode?: boolean;
  timeLimitMinutes?: number;
};

function isAiRequest(url: string, method: string): boolean {
  return method === 'POST' && url !== '/health';
}

function getAIConfig(): AIConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const cfg = JSON.parse(raw) as AIConfig;
    return cfg.apiKey ? cfg : null;
  } catch {
    return null;
  }
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const finalOptions = { ...options };
  const method = (finalOptions.method || 'GET').toUpperCase();

  // Auto-inject aiConfig into POST body
  if (method === 'POST' && typeof finalOptions.body === 'string') {
    const aiConfig = getAIConfig();
    if (aiConfig) {
      try {
        const body = JSON.parse(finalOptions.body) as Record<string, unknown>;
        if (!('aiConfig' in body)) {
          finalOptions.body = JSON.stringify({ ...body, aiConfig });
        }
      } catch {
        // Ignore non-JSON request bodies
      }
    }
  }

  if (isAiRequest(url, method)) {
    const allowed = shouldAllowCallOverLimit();
    if (!allowed) {
      throw new Error('已取消本次 AI 调用');
    }
    recordAiCall();
  }

  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const headers = new Headers(finalOptions.headers);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  headers.set('x-anonymous-session-id', getAnonymousSessionId());

  try {
    const res = await fetch(`${API_BASE}${url}`, {
      ...finalOptions,
      method,
      headers,
      signal: controller.signal,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || '请求失败');
    }

    return res.json();
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error(`请求超时（>${REQUEST_TIMEOUT_MS / 1000}s），请稍后重试`);
    }
    throw err;
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}

export const api = {
  flashcards: {
    extract: (text: string, maxWords?: number, level?: FlashcardLevel) =>
      request('/flashcards/extract', {
        method: 'POST',
        body: JSON.stringify({ text, maxWords, level }),
      }),
    history: (limit = 120) =>
      request(`/flashcards/history?limit=${encodeURIComponent(String(limit))}`),
  },
  sentence: {
    analyze: (sentence: string) =>
      request('/sentence/analyze', {
        method: 'POST',
        body: JSON.stringify({ sentence }),
      }),
    history: (limit = 20) =>
      request(`/sentence/history?limit=${encodeURIComponent(String(limit))}`),
  },
  reading: {
    generate: (text: string, languageOrOptions?: ReadingLanguage | ReadingGenerateOptions) => {
      const options = typeof languageOrOptions === 'string'
        ? { language: languageOrOptions }
        : (languageOrOptions ?? {});
      return request('/reading/generate', {
        method: 'POST',
        body: JSON.stringify({ text, ...options }),
      });
    },
    history: (limit = 20) =>
      request(`/reading/history?limit=${encodeURIComponent(String(limit))}`),
  },
  quiz: {
    readingQuestions: (reading: string, options?: number | QuizGenerateOptions) => {
      const payload = typeof options === 'number' ? { questionCount: options } : (options ?? {});
      return request('/quiz/reading-questions', {
        method: 'POST',
        body: JSON.stringify({ reading, ...payload }),
      });
    },
    vocabularyQuestions: (vocabulary: unknown[], options?: number | QuizGenerateOptions) => {
      const payload = typeof options === 'number' ? { questionCount: options } : (options ?? {});
      return request('/quiz/vocabulary-questions', {
        method: 'POST',
        body: JSON.stringify({ vocabulary, ...payload }),
      });
    },
    syncHistory: (result: unknown) =>
      request('/quiz/history/sync', {
        method: 'POST',
        body: JSON.stringify(result),
      }),
    history: (limit = 20) =>
      request(`/quiz/history?limit=${encodeURIComponent(String(limit))}`),
  },
  report: {
    generate: (reportType: string, learningData: unknown) =>
      request('/report/generate', {
        method: 'POST',
        body: JSON.stringify({ reportType, learningData }),
      }),
    history: (limit = 20) =>
      request(`/report/history?limit=${encodeURIComponent(String(limit))}`),
  },
  health: () => request<{ status: string }>('/health'),
  ai: {
    test: (aiConfig: AIConfig) =>
      request<{ success: boolean; model: string }>('/ai/test', {
        method: 'POST',
        body: JSON.stringify({ aiConfig }),
      }),
  },
  migration: {
    status: () =>
      request<Record<string, number>>('/migration/status'),
    backfill: (payload: unknown) =>
      request<{ ok: boolean; synced: Record<string, number> }>('/migration/backfill', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },
};
