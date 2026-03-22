import { parseJsonResponse } from '../utils/json-parser';
import {
  buildExtractWordsPrompt,
  buildAnalyzeSentencePrompt,
  buildReadingContentPrompt,
  buildReadingQuestionsPrompt,
  buildVocabularyQuestionsPrompt,
  buildLearningReportPrompt,
  summarizeLearningDataForReport,
} from '../utils/prompt-builder';
import { config } from '../config';
import { logger } from '../utils/logger';

interface ChatCompletionResponse {
  choices: Array<{ message: { content: string }; finish_reason?: string | null }>;
}

interface AIConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

interface ReadingGenerateOptions {
  language: 'en' | 'zh';
  topic: 'general' | 'work' | 'travel' | 'technology' | 'culture' | 'education';
  difficulty: 'easy' | 'medium' | 'hard';
  length: 'short' | 'medium' | 'long';
}

interface QuizGenerateOptions {
  questionCount: number;
  difficulty: 'easy' | 'medium' | 'hard';
  timedMode: boolean;
  timeLimitMinutes: number;
}

interface ErrorBody {
  error?: { message?: string };
}

interface SafeJsonResult<T = unknown> {
  ok: boolean;
  data?: T;
  rawText?: string;
  textLength: number;
}

interface ProviderCandidate extends AIConfig {
  name: string;
  source: 'primary' | 'fallback';
  dailyQuota: number;
}

interface ProviderQuotaState {
  date: string;
  count: number;
}

interface ProviderAttemptContext {
  attempt: number;
  totalCandidates: number;
  remainingMs: number;
  timeoutMs: number;
}

const providerQuotaState = new Map<string, ProviderQuotaState>();
const MIN_PROVIDER_ATTEMPT_TIMEOUT_MS = 8_000;
const MIN_FLASHCARDS_MAX_TOKENS = 700;
const MAX_FLASHCARDS_MAX_TOKENS = 1_400;
const SENTENCE_ANALYZE_MAX_TOKENS = 1_600;
const MAX_QUIZ_READING_PROMPT_CHARS = 6_000;
const MAX_QUIZ_VOCAB_PROMPT_ITEMS = 80;

function isPrivateOrLocalhost(hostname: string): boolean {
  const host = hostname.toLowerCase();

  if (host === 'localhost' || host === '::1' || host.endsWith('.local')) {
    return true;
  }

  // IPv4 private/loopback/link-local ranges
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    const [a, b] = host.split('.').map(Number);
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
  }

  // IPv6 local ranges
  if (host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80')) {
    return true;
  }

  return false;
}

function sanitizeErrorText(text: string): string {
  const sanitized = text
    .replace(/sk-[A-Za-z0-9_-]+/g, '[REDACTED_KEY]')
    .replace(/Bearer\s+[A-Za-z0-9._~+/\-=]+/gi, 'Bearer [REDACTED_TOKEN]')
    .replace(/"apiKey"\s*:\s*"[^"]+"/gi, '"apiKey":"[REDACTED_KEY]"');

  return sanitized.length > 240 ? `${sanitized.slice(0, 240)}...` : sanitized;
}

function getErrorMessageFromBody(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') return undefined;

  const maybeMessage = (body as ErrorBody).error?.message;
  return typeof maybeMessage === 'string' ? maybeMessage : undefined;
}

async function safeReadJson<T = unknown>(res: Response): Promise<SafeJsonResult<T>> {
  const text = await res.text();
  if (!text) return { ok: false, rawText: '', textLength: 0 };

  try {
    return { ok: true, data: JSON.parse(text) as T, textLength: text.length };
  } catch {
    return { ok: false, rawText: text, textLength: text.length };
  }
}

function validateBaseUrl(baseUrl: string): string {
  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    throw new Error('Base URL 格式无效');
  }

  if (parsed.username || parsed.password) {
    throw new Error('Base URL 不允许包含认证信息');
  }

  const protocol = parsed.protocol.toLowerCase();
  if (protocol !== 'https:' && protocol !== 'http:') {
    throw new Error('Base URL 仅支持 HTTP/HTTPS');
  }

  const isProd = config.nodeEnv === 'production';
  if (isProd && protocol !== 'https:') {
    throw new Error('生产环境仅允许 HTTPS Base URL');
  }

  const host = parsed.hostname.toLowerCase();
  if (!config.ai.allowPrivateHosts && isPrivateOrLocalhost(host)) {
    throw new Error('Base URL 不允许访问本地或内网地址');
  }

  const allowedHosts = (process.env.ALLOWED_AI_HOSTS || '')
    .split(',')
    .map(v => v.trim().toLowerCase())
    .filter(Boolean);

  if (allowedHosts.length > 0 && !allowedHosts.includes(host)) {
    throw new Error('当前 Base URL 不在允许列表中');
  }

  return baseUrl.replace(/\/+$/, '');
}

function buildCompletionsEndpoint(baseUrl: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/chat/completions`;
}

function readHost(baseUrl: string): string {
  try {
    return new URL(baseUrl).host;
  } catch {
    return 'unknown';
  }
}

function estimateByteLength(value: unknown): number {
  try {
    return Buffer.byteLength(typeof value === 'string' ? value : JSON.stringify(value), 'utf8');
  } catch {
    return 0;
  }
}

function estimateCharLength(value: unknown): number {
  try {
    return (typeof value === 'string' ? value : JSON.stringify(value)).length;
  } catch {
    return 0;
  }
}

function shouldDisableThinking(model: string): boolean {
  return /^glm-4\.(5|7)/i.test(model);
}

function buildChatCompletionBody(
  provider: AIConfig,
  prompt: string,
  options: { temperature?: number; maxTokens?: number; extraBody?: Record<string, unknown> },
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model: provider.model,
    messages: [{ role: 'user', content: prompt }],
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 2000,
  };

  if (shouldDisableThinking(provider.model)) {
    body.thinking = { type: 'disabled' };
  }

  if (options.extraBody) {
    Object.assign(body, options.extraBody);
  }
  return body;
}

function currentDateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function quotaCacheKey(provider: ProviderCandidate): string {
  return `${provider.source}:${provider.name}:${readHost(provider.baseUrl)}:${provider.model}`;
}

function reserveQuota(provider: ProviderCandidate): boolean {
  const key = quotaCacheKey(provider);
  const today = currentDateKey();
  const state = providerQuotaState.get(key);

  if (!state || state.date !== today) {
    providerQuotaState.set(key, { date: today, count: 1 });
    return true;
  }

  if (state.count >= provider.dailyQuota) {
    return false;
  }

  state.count += 1;
  providerQuotaState.set(key, state);
  return true;
}

function pickAttemptTimeoutMs(remainingMs: number, providersLeft: number): number {
  if (!Number.isFinite(remainingMs) || remainingMs <= 0) return 0;
  const fairShare = Math.floor(remainingMs / Math.max(1, providersLeft));
  const planned = Math.max(MIN_PROVIDER_ATTEMPT_TIMEOUT_MS, fairShare);
  return Math.min(remainingMs, planned);
}

function normalizePromptText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function clipPromptText(text: string, maxChars: number): string {
  const normalized = normalizePromptText(text);
  if (normalized.length <= maxChars) return normalized;

  const marker = '\n...[内容已截断]...\n';
  const headLength = Math.floor((maxChars - marker.length) * 0.75);
  const tailLength = Math.max(0, maxChars - marker.length - headLength);
  return `${normalized.slice(0, headLength)}${marker}${normalized.slice(-tailLength)}`;
}

function compactVocabularyForPrompt(vocabulary: unknown[]): Array<Record<string, string>> {
  return vocabulary
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object' && !Array.isArray(item))
    .map(item => ({
      word: typeof item.word === 'string' ? item.word.trim() : '',
      meaning: typeof item.meaning === 'string' ? item.meaning.trim() : '',
      phonetic: typeof item.phonetic === 'string' ? item.phonetic.trim() : '',
      example: typeof item.example === 'string' ? item.example.trim() : '',
    }))
    .filter(item => item.word || item.meaning)
    .slice(0, MAX_QUIZ_VOCAB_PROMPT_ITEMS);
}

function resolveQuizMaxTokens(questionCount: number): number {
  return Math.min(1_200, Math.max(500, questionCount * 120));
}

function resolveFlashcardsMaxTokens(maxWords: number): number {
  return Math.min(MAX_FLASHCARDS_MAX_TOKENS, Math.max(MIN_FLASHCARDS_MAX_TOKENS, maxWords * 130));
}

function isLikelyTruncatedStructuredContent(content: string): boolean {
  const trimmed = content.trim();
  if (!trimmed) return false;
  if (!trimmed.endsWith('}') && !trimmed.endsWith(']')) return true;

  const openBraces = (trimmed.match(/{/g) || []).length;
  const closeBraces = (trimmed.match(/}/g) || []).length;
  const openBrackets = (trimmed.match(/\[/g) || []).length;
  const closeBrackets = (trimmed.match(/]/g) || []).length;
  return openBraces !== closeBraces || openBrackets !== closeBrackets;
}

function buildProviderCandidates(primary: AIConfig): ProviderCandidate[] {
  const primaryCandidate: ProviderCandidate = {
    ...primary,
    name: 'primary',
    source: 'primary',
    dailyQuota: config.ai.primaryDailyQuota,
  };

  const candidates: ProviderCandidate[] = [primaryCandidate];
  for (const fallback of config.ai.fallbackProviders) {
    try {
      const normalizedBaseUrl = validateBaseUrl(fallback.baseUrl);
      candidates.push({
        apiKey: fallback.apiKey,
        baseUrl: normalizedBaseUrl,
        model: fallback.model,
        name: fallback.name,
        source: 'fallback',
        dailyQuota: fallback.dailyQuota,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'fallback 配置无效';
      logger.warn('ai.provider.fallback.invalid', {
        provider: fallback.name,
        error: sanitizeErrorText(message),
      });
    }
  }

  return candidates;
}

async function withProviderFallback<T>(
  primary: AIConfig,
  action: string,
  runner: (provider: ProviderCandidate, context: ProviderAttemptContext) => Promise<T>,
  totalBudgetMs = config.ai.requestTimeoutMs,
): Promise<T> {
  const candidates = buildProviderCandidates(primary);
  let lastError: Error | undefined;
  let attempted = 0;
  const deadlineAt = Date.now() + Math.max(1, totalBudgetMs);
  let timedOut = false;

  for (const [index, provider] of candidates.entries()) {
    const remainingMs = deadlineAt - Date.now();
    if (remainingMs <= 0) {
      timedOut = true;
      logger.warn('ai.provider.deadline.exhausted', {
        action,
        attempted,
        totalBudgetMs,
      });
      break;
    }

    if (!reserveQuota(provider)) {
      logger.warn('ai.provider.quota.exhausted', {
        action,
        provider: provider.name,
        source: provider.source,
        providerHost: readHost(provider.baseUrl),
        model: provider.model,
        dailyQuota: provider.dailyQuota,
      });
      continue;
    }

    attempted += 1;
    const timeoutMs = pickAttemptTimeoutMs(remainingMs, candidates.length - index);
    if (provider.source === 'fallback') {
      logger.warn('ai.provider.fallback.activated', {
        action,
        provider: provider.name,
        providerHost: readHost(provider.baseUrl),
        model: provider.model,
        attempt: attempted,
        timeoutMs,
        remainingMs,
      });
    }

    try {
      return await runner(provider, {
        attempt: attempted,
        totalCandidates: candidates.length,
        remainingMs,
        timeoutMs,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误';
      lastError = error instanceof Error ? error : new Error(String(error));
      logger.warn('ai.provider.attempt.failed', {
        action,
        provider: provider.name,
        source: provider.source,
        providerHost: readHost(provider.baseUrl),
        model: provider.model,
        attempt: attempted,
        timeoutMs,
        remainingMs,
        error: sanitizeErrorText(message),
      });
    }
  }

  if (timedOut) {
    throw new Error(`AI 请求超时（>${Math.floor(totalBudgetMs / 1000)}s）`);
  }

  if (attempted === 0) {
    throw new Error('AI 服务配额已达上限，请稍后再试');
  }

  if (lastError) throw lastError;
  throw new Error('AI 服务暂时不可用，请稍后重试');
}

function validateAIConfig(aiConfig?: AIConfig): asserts aiConfig is AIConfig {
  if (!aiConfig) {
    throw new Error('请先在页面设置中配置 AI 服务（API Key、Base URL、Model）');
  }

  const apiKey = aiConfig?.apiKey?.trim();
  const baseUrl = aiConfig?.baseUrl?.trim();
  const model = aiConfig?.model?.trim();

  if (!apiKey || !baseUrl || !model) {
    throw new Error('请先在页面设置中配置 AI 服务（API Key、Base URL、Model）');
  }

  aiConfig.apiKey = apiKey;
  aiConfig.model = model;
  aiConfig.baseUrl = validateBaseUrl(baseUrl);
}

function normalizeReadingOptions(options?: Partial<ReadingGenerateOptions>): ReadingGenerateOptions {
  return {
    language: options?.language ?? 'en',
    topic: options?.topic ?? 'general',
    difficulty: options?.difficulty ?? 'medium',
    length: options?.length ?? 'medium',
  };
}

function normalizeQuizOptions(options?: Partial<QuizGenerateOptions>): QuizGenerateOptions {
  return {
    questionCount: options?.questionCount ?? 5,
    difficulty: options?.difficulty ?? 'medium',
    timedMode: options?.timedMode ?? false,
    timeLimitMinutes: options?.timeLimitMinutes ?? 15,
  };
}

function normalizeReadingResponse(payload: unknown) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('阅读生成失败：AI 返回格式无效');
  }

  const raw = payload as Record<string, unknown>;
  const english = typeof raw.english === 'string' ? raw.english.trim() : '';
  const chinese = typeof raw.chinese === 'string' ? raw.chinese.trim() : '';

  if (!english || !chinese) {
    throw new Error('阅读生成失败：缺少双语正文字段（english/chinese）');
  }

  const vocabulary = Array.isArray(raw.vocabulary) ? raw.vocabulary : [];
  const normalizedVocabulary = vocabulary
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map(item => ({
      word: typeof item.word === 'string' ? item.word.trim() : '',
      phonetic: typeof item.phonetic === 'string' ? item.phonetic.trim() : undefined,
      meaning: typeof item.meaning === 'string' ? item.meaning.trim() : '',
      example: typeof item.example === 'string' ? item.example.trim() : undefined,
    }))
    .filter(item => item.word && item.meaning);

  return {
    english,
    chinese,
    vocabulary: normalizedVocabulary,
    title: typeof raw.title === 'string' ? raw.title.trim() : undefined,
  };
}

async function postChatCompletions(
  aiConfig: AIConfig,
  body: Record<string, unknown>,
  timeoutMs = config.ai.requestTimeoutMs,
): Promise<Response> {
  const effectiveTimeoutMs = Math.max(1_000, timeoutMs);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), effectiveTimeoutMs);

  try {
    return await fetch(buildCompletionsEndpoint(aiConfig.baseUrl), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aiConfig.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`AI 请求超时（>${Math.floor(effectiveTimeoutMs / 1000)}s）`);
    }
    const fallback = err instanceof Error ? err.message : '未知网络错误';
    throw new Error(`AI 请求失败: ${sanitizeErrorText(fallback)}`);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function sendRequest(
  action: string,
  prompt: string,
  options: { temperature?: number; maxTokens?: number; extraBody?: Record<string, unknown> } = {},
  aiConfig?: AIConfig,
): Promise<string> {
  validateAIConfig(aiConfig);
  return withProviderFallback(aiConfig, action, async (provider, attemptContext) => {
    const startedAt = Date.now();
    const providerHost = readHost(provider.baseUrl);
    const body = buildChatCompletionBody(provider, prompt, options);
    let res: Response;

    logger.info('ai.request.started', {
      action,
      providerHost,
      provider: provider.name,
      source: provider.source,
      model: provider.model,
      promptChars: prompt.length,
      requestBytes: estimateByteLength(body),
      temperature: options.temperature ?? 0.7,
      maxTokens: options.maxTokens ?? 2000,
      attempt: attemptContext.attempt,
      attemptTotal: attemptContext.totalCandidates,
      timeoutMs: attemptContext.timeoutMs,
      remainingMs: attemptContext.remainingMs,
    });

    try {
      res = await postChatCompletions(provider, body, attemptContext.timeoutMs);
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误';
      logger.error('ai.request.failed', {
        action,
        providerHost,
        provider: provider.name,
        source: provider.source,
        model: provider.model,
        durationMs: Date.now() - startedAt,
        attempt: attemptContext.attempt,
        timeoutMs: attemptContext.timeoutMs,
        error: sanitizeErrorText(message),
      });
      throw error;
    }

    logger.info('ai.request.completed', {
      action,
      providerHost,
      provider: provider.name,
      source: provider.source,
      model: provider.model,
      statusCode: res.status,
      ok: res.ok,
      durationMs: Date.now() - startedAt,
      attempt: attemptContext.attempt,
      timeoutMs: attemptContext.timeoutMs,
    });

    if (!res.ok) {
      const errBody = await safeReadJson<ErrorBody>(res);
      logger.info('ai.response.body.completed', {
        action,
        providerHost,
        provider: provider.name,
        source: provider.source,
        model: provider.model,
        responseChars: errBody.textLength,
        totalDurationMs: Date.now() - startedAt,
      });
      const snippet = errBody.rawText ? sanitizeErrorText(errBody.rawText.slice(0, 120)) : '';
      const upstreamMessage = getErrorMessageFromBody(errBody.data) || snippet || res.statusText || '未知上游错误';
      throw new Error(`AI 上游服务错误（${res.status}）: ${sanitizeErrorText(upstreamMessage)}`);
    }

    const bodyStartedAt = Date.now();
    const dataResult = await safeReadJson<ChatCompletionResponse>(res);
    logger.info('ai.response.body.completed', {
      action,
      providerHost,
      provider: provider.name,
      source: provider.source,
      model: provider.model,
      responseChars: dataResult.textLength,
      bodyReadMs: Date.now() - bodyStartedAt,
      totalDurationMs: Date.now() - startedAt,
    });
    if (!dataResult.ok || !dataResult.data) {
      throw new Error('AI 上游返回非 JSON 内容，请检查 Base URL 或模型服务状态');
    }

    const data = dataResult.data;
    const finishReason = data.choices?.[0]?.finish_reason;
    if (finishReason) {
      logger.info('ai.response.choice.completed', {
        action,
        providerHost,
        provider: provider.name,
        source: provider.source,
        model: provider.model,
        finishReason,
      });
    }
    const content = data.choices?.[0]?.message?.content;
    if (finishReason === 'length' && (!content || !String(content).trim())) {
      throw new Error('AI 上游输出被截断（finish_reason=length），请减少输出量或更换模型');
    }
    if (!content) {
      throw new Error('AI 返回内容为空，请稍后重试');
    }
    return content;
  });
}

function parseStructuredContent<T>(action: string, content: string): T {
  try {
    return parseJsonResponse<T>(content);
  } catch (error) {
    logger.warn('ai.response.parse_failed', {
      action,
      contentChars: content.length,
      contentSnippet: sanitizeErrorText(content.slice(0, 240)),
    });
    if (isLikelyTruncatedStructuredContent(content)) {
      throw new Error('AI 上游输出被截断（JSON 未完成），请减少输出量或更换模型');
    }
    throw error;
  }
}

export async function extractWords(text: string, maxWords = 10, level = 'all', aiConfig?: AIConfig) {
  const prompt = buildExtractWordsPrompt(normalizePromptText(text), maxWords, level);
  const content = await sendRequest(
    'flashcards_extract',
    prompt,
    { temperature: 0.3, maxTokens: resolveFlashcardsMaxTokens(maxWords) },
    aiConfig,
  );
  return parseStructuredContent('flashcards_extract', content);
}

export async function analyzeSentence(sentence: string, aiConfig?: AIConfig) {
  const prompt = buildAnalyzeSentencePrompt(normalizePromptText(sentence));
  const content = await sendRequest(
    'sentence_analyze',
    prompt,
    { temperature: 0.2, maxTokens: SENTENCE_ANALYZE_MAX_TOKENS },
    aiConfig,
  );
  return parseStructuredContent('sentence_analyze', content);
}

export async function generateReadingContent(text: string, options?: Partial<ReadingGenerateOptions>, aiConfig?: AIConfig) {
  const normalizedOptions = normalizeReadingOptions(options);
  const prompt = buildReadingContentPrompt(normalizePromptText(text), normalizedOptions);
  const content = await sendRequest('reading_generate', prompt, { temperature: 0.7, maxTokens: 1_200 }, aiConfig);
  const result = parseStructuredContent('reading_generate', content);
  return normalizeReadingResponse(result);
}

export async function generateReadingQuestions(reading: string, options?: Partial<QuizGenerateOptions>, aiConfig?: AIConfig) {
  const normalizedOptions = normalizeQuizOptions(options);
  const clippedReading = clipPromptText(reading, MAX_QUIZ_READING_PROMPT_CHARS);
  const prompt = buildReadingQuestionsPrompt(clippedReading, normalizedOptions);
  const content = await sendRequest(
    'quiz_reading_questions',
    prompt,
    { temperature: 0.6, maxTokens: resolveQuizMaxTokens(normalizedOptions.questionCount) },
    aiConfig,
  );
  return parseStructuredContent('quiz_reading_questions', content);
}

export async function generateVocabularyQuestions(vocabulary: unknown[], options?: Partial<QuizGenerateOptions>, aiConfig?: AIConfig) {
  const normalizedOptions = normalizeQuizOptions(options);
  const compactVocabulary = compactVocabularyForPrompt(vocabulary);
  const prompt = buildVocabularyQuestionsPrompt(compactVocabulary, normalizedOptions);
  const content = await sendRequest(
    'quiz_vocabulary_questions',
    prompt,
    { temperature: 0.7, maxTokens: resolveQuizMaxTokens(normalizedOptions.questionCount) },
    aiConfig,
  );
  return parseStructuredContent('quiz_vocabulary_questions', content);
}

export async function generateLearningReport(reportType: string, learningData: unknown, aiConfig?: AIConfig) {
  const compactLearningData = summarizeLearningDataForReport(learningData);
  logger.info('ai.report.input.compacted', {
    rawBytes: estimateByteLength(learningData),
    compactBytes: estimateByteLength(compactLearningData),
    rawChars: estimateCharLength(learningData),
    compactChars: estimateCharLength(compactLearningData),
  });
  const prompt = buildLearningReportPrompt(reportType, compactLearningData);
  const content = await sendRequest('report_generate', prompt, { temperature: 0.7, maxTokens: 900 }, aiConfig);
  return parseStructuredContent('report_generate', content);
}

export async function testConnection(aiConfig?: AIConfig): Promise<{ success: boolean; model: string }> {
  validateAIConfig(aiConfig);
  return withProviderFallback(aiConfig, 'connection_test', async (provider, attemptContext) => {
    const startedAt = Date.now();
    const providerHost = readHost(provider.baseUrl);
    const body = buildChatCompletionBody(provider, 'Hi', { maxTokens: 5 });
    let res: Response;

    try {
      res = await postChatCompletions(provider, body, attemptContext.timeoutMs);
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误';
      logger.error('ai.connection.failed', {
        providerHost,
        provider: provider.name,
        source: provider.source,
        model: provider.model,
        durationMs: Date.now() - startedAt,
        attempt: attemptContext.attempt,
        timeoutMs: attemptContext.timeoutMs,
        error: sanitizeErrorText(message),
      });
      throw error;
    }

    logger.info('ai.connection.completed', {
      providerHost,
      provider: provider.name,
      source: provider.source,
      model: provider.model,
      statusCode: res.status,
      ok: res.ok,
      durationMs: Date.now() - startedAt,
      attempt: attemptContext.attempt,
      timeoutMs: attemptContext.timeoutMs,
    });

    if (!res.ok) {
      const errBody = await safeReadJson<ErrorBody>(res);
      const snippet = errBody.rawText ? sanitizeErrorText(errBody.rawText.slice(0, 120)) : '';
      const upstreamMessage = getErrorMessageFromBody(errBody.data) || snippet || res.statusText || '未知上游错误';
      throw new Error(`连接失败: ${sanitizeErrorText(upstreamMessage)}`);
    }

    const okBody = await safeReadJson(res);
    if (!okBody.ok) {
      throw new Error('连接失败: 上游返回非 JSON 内容');
    }
    return { success: true, model: provider.model };
  });
}
