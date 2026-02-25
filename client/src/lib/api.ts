import type { AIConfig } from '@/types';
import { STORAGE_KEY } from './ai-providers';
import { recordAiCall, shouldAllowCallOverLimit } from './ai-usage';
import { getAnonymousSessionId } from './session';

const API_BASE = '/api/v1';
const REQUEST_TIMEOUT_MS = 95_000;

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
    extract: (text: string, maxWords?: number, level?: string) =>
      request('/flashcards/extract', {
        method: 'POST',
        body: JSON.stringify({ text, maxWords, level }),
      }),
  },
  sentence: {
    analyze: (sentence: string) =>
      request('/sentence/analyze', {
        method: 'POST',
        body: JSON.stringify({ sentence }),
      }),
  },
  reading: {
    generate: (text: string, language?: string) =>
      request('/reading/generate', {
        method: 'POST',
        body: JSON.stringify({ text, language }),
      }),
  },
  quiz: {
    readingQuestions: (reading: string, questionCount?: number) =>
      request('/quiz/reading-questions', {
        method: 'POST',
        body: JSON.stringify({ reading, questionCount }),
      }),
    vocabularyQuestions: (vocabulary: unknown[], questionCount?: number) =>
      request('/quiz/vocabulary-questions', {
        method: 'POST',
        body: JSON.stringify({ vocabulary, questionCount }),
      }),
  },
  report: {
    generate: (reportType: string, learningData: unknown) =>
      request('/report/generate', {
        method: 'POST',
        body: JSON.stringify({ reportType, learningData }),
      }),
  },
  health: () => request<{ status: string }>('/health'),
  ai: {
    test: (aiConfig: AIConfig) =>
      request<{ success: boolean; model: string }>('/ai/test', {
        method: 'POST',
        body: JSON.stringify({ aiConfig }),
      }),
  },
};
