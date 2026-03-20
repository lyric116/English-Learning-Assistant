import { createHash } from 'crypto';
import dns from 'dns';
import http from 'http';
import https from 'https';
import { parseJsonResponse } from '../utils/json-parser';
import {
  buildExtractWordsPrompt,
  buildAnalyzeSentencePrompt,
  buildReadingContentPrompt,
  buildReadingQuestionsPrompt,
  buildVocabularyQuestionsPrompt,
  buildLearningReportPrompt,
} from '../utils/prompt-builder';
import {
  estimateFlashcardsMaxTokens,
  estimateReadingMaxTokens,
  estimateSentenceMaxTokens,
} from '../utils/ai-request-planner';
import { config } from '../config';
import { logger } from '../utils/logger';

interface ChatCompletionResponse {
  choices: Array<{ message: { content: string } }>;
}

interface ChatMessage {
  role: 'system' | 'user';
  content: string;
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

interface RequestOptions {
  action: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

interface AgentRequestOptions {
  urlString: string;
  method: 'GET' | 'POST';
  headers: Record<string, string>;
  body?: string;
  timeoutMs: number;
}

const providerQuotaState = new Map<string, ProviderQuotaState>();
const completedRequestCache = new Map<string, { content: string; expiresAt: number }>();
const inflightRequestCache = new Map<string, Promise<string>>();
const hostAddressState = new Map<string, {
  addresses: string[];
  nextIndex: number;
  lastSuccessfulAddress?: string;
}>();
const REQUEST_CACHE_TTL_MS = 10 * 60 * 1000;
const CONNECT_TIMEOUT_MS = 8_000;
const CONNECT_RETRY_ATTEMPTS = 3;
const httpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 32,
});
const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 32,
});
const JSON_ONLY_SYSTEM_PROMPT = [
  '你是英语学习助手。',
  '必须只返回合法 JSON。',
  '不要输出 Markdown、代码块、解释、思考过程或额外字段。',
  '字段内容保持简洁直接。',
].join('');

class AIRequestError extends Error {
  readonly retryable: boolean;
  readonly statusCode?: number;

  constructor(message: string, options: { retryable?: boolean; statusCode?: number } = {}) {
    super(message);
    this.name = 'AIRequestError';
    this.retryable = options.retryable ?? false;
    this.statusCode = options.statusCode;
  }
}

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
  if (!text) return { ok: false, rawText: '' };

  try {
    return { ok: true, data: JSON.parse(text) as T };
  } catch {
    return { ok: false, rawText: text };
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
  const normalized = baseUrl.replace(/\/+$/, '');
  return normalized.endsWith('/chat/completions')
    ? normalized
    : `${normalized}/chat/completions`;
}

function buildModelsEndpoint(baseUrl: string): string {
  const normalized = baseUrl.replace(/\/+$/, '');
  if (normalized.endsWith('/models')) {
    return normalized;
  }
  if (normalized.endsWith('/chat/completions')) {
    return `${normalized.slice(0, -'/chat/completions'.length)}/models`;
  }
  return `${normalized}/models`;
}

function readHost(baseUrl: string): string {
  try {
    return new URL(baseUrl).host;
  } catch {
    return 'unknown';
  }
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

function normalizeModelName(modelName: string): string {
  return modelName.trim().toLowerCase();
}

function isSlowReasoningModel(modelName: string): boolean {
  const normalized = normalizeModelName(modelName);
  if (!normalized) return false;

  return normalized.includes('reasoner')
    || normalized.includes('reasoning')
    || normalized.includes('thinking')
    || normalized.startsWith('gpt-5')
    || normalized === 'o1'
    || normalized.startsWith('o1-')
    || normalized === 'o3'
    || normalized.startsWith('o3-')
    || normalized.includes('r1');
}

function pickTimeoutMs(action: string, modelName: string): number {
  const slowModel = isSlowReasoningModel(modelName);

  switch (action) {
    case 'connection_test':
      return slowModel ? 40_000 : 15_000;
    case 'extract_words':
      return slowModel ? 90_000 : 45_000;
    case 'analyze_sentence':
      return slowModel ? 210_000 : 55_000;
    case 'generate_reading':
      return slowModel ? 210_000 : 60_000;
    case 'generate_reading_questions':
    case 'generate_vocabulary_questions':
      return slowModel ? 90_000 : 45_000;
    case 'generate_learning_report':
      return slowModel ? 120_000 : 60_000;
    default:
      return config.ai.requestTimeoutMs;
  }
}

function buildRequestCacheKey(provider: ProviderCandidate, action: string, prompt: string, maxTokens: number): string {
  const promptHash = createHash('sha1').update(prompt).digest('hex');
  return [
    provider.source,
    provider.name,
    readHost(provider.baseUrl),
    provider.model,
    action,
    String(maxTokens),
    promptHash,
  ].join(':');
}

function readCachedContent(cacheKey: string): string | undefined {
  const hit = completedRequestCache.get(cacheKey);
  if (!hit) return undefined;

  if (Date.now() >= hit.expiresAt) {
    completedRequestCache.delete(cacheKey);
    return undefined;
  }

  return hit.content;
}

function writeCachedContent(cacheKey: string, content: string): void {
  completedRequestCache.set(cacheKey, {
    content,
    expiresAt: Date.now() + REQUEST_CACHE_TTL_MS,
  });
}

function describeErrorCause(error: unknown): string | undefined {
  if (!(error instanceof Error)) return undefined;

  const cause = (error as Error & {
    cause?: unknown;
  }).cause;

  if (!cause) return undefined;
  if (cause instanceof Error) {
    return cause.message;
  }

  if (typeof cause === 'object') {
    const code = typeof (cause as { code?: unknown }).code === 'string'
      ? (cause as { code: string }).code
      : undefined;
    const message = typeof (cause as { message?: unknown }).message === 'string'
      ? (cause as { message: string }).message
      : undefined;

    if (code && message) return `${code}: ${message}`;
    if (code) return code;
    if (message) return message;
  }

  if (typeof cause === 'string') {
    return cause;
  }

  return undefined;
}

function recordSuccessfulAddress(hostname: string, address: string | undefined): void {
  if (!address) return;

  const state = hostAddressState.get(hostname);
  hostAddressState.set(hostname, {
    addresses: state?.addresses ?? [],
    nextIndex: state?.nextIndex ?? 0,
    lastSuccessfulAddress: address,
  });
}

function clearPreferredAddress(hostname: string): void {
  const state = hostAddressState.get(hostname);
  if (!state) return;

  hostAddressState.set(hostname, {
    addresses: state.addresses,
    nextIndex: state.nextIndex,
    lastSuccessfulAddress: undefined,
  });
}

function rotateAddresses(addresses: string[], startIndex: number): string[] {
  if (addresses.length <= 1) return [...addresses];

  const offset = startIndex % addresses.length;
  return [
    ...addresses.slice(offset),
    ...addresses.slice(0, offset),
  ];
}

async function resolveConnectionTargets(hostname: string): Promise<string[]> {
  const state = hostAddressState.get(hostname);
  const preferred = state?.lastSuccessfulAddress ? [state.lastSuccessfulAddress] : [];

  try {
    const resolved = await dns.promises.lookup(hostname, { all: true, family: 4 });
    const addresses = resolved.map(item => item.address).filter(Boolean);
    if (addresses.length === 0) {
      return preferred.length > 0 ? preferred : [hostname];
    }

    const rotated = rotateAddresses(addresses, state?.nextIndex ?? 0);
    hostAddressState.set(hostname, {
      addresses,
      nextIndex: ((state?.nextIndex ?? 0) + 1) % addresses.length,
      lastSuccessfulAddress: state?.lastSuccessfulAddress,
    });

    return Array.from(new Set([...preferred, ...rotated])).slice(0, CONNECT_RETRY_ATTEMPTS);
  } catch {
    return preferred.length > 0 ? preferred : [hostname];
  }
}

function makeHttpResponse(status: number, statusText: string, body: string): Response {
  return new Response(body, {
    status,
    statusText,
    headers: {
      'content-type': 'application/json',
    },
  });
}

function isConnectPhaseError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (error.message.startsWith('connect_timeout:')) return true;

  const code = typeof (error as Error & { code?: unknown }).code === 'string'
    ? (error as Error & { code: string }).code
    : '';

  return code === 'ETIMEDOUT'
    || code === 'ECONNREFUSED'
    || code === 'EHOSTUNREACH'
    || code === 'ENETUNREACH'
    || code === 'ECONNRESET';
}

function buildHostHeader(url: URL): string {
  if (!url.port) return url.hostname;
  return `${url.hostname}:${url.port}`;
}

async function postJsonWithAgent(urlString: string, headers: Record<string, string>, body: string, timeoutMs: number): Promise<Response> {
  return requestWithAgent({
    urlString,
    method: 'POST',
    headers,
    body,
    timeoutMs,
  });
}

async function requestWithAgent(options: AgentRequestOptions): Promise<Response> {
  const url = new URL(options.urlString);
  const isHttps = url.protocol === 'https:';
  const client = isHttps ? https : http;
  const agent = isHttps ? httpsAgent : httpAgent;
  const targets = await resolveConnectionTargets(url.hostname);
  let lastError: Error | undefined;

  for (const target of targets) {
    try {
      return await new Promise<Response>((resolve, reject) => {
        const req = client.request({
          protocol: url.protocol,
          hostname: target,
          servername: isHttps ? url.hostname : undefined,
          port: url.port || (isHttps ? 443 : 80),
          path: `${url.pathname}${url.search}`,
          method: options.method,
          agent,
          headers: {
            Host: buildHostHeader(url),
            ...options.headers,
            ...(options.body ? { 'Content-Length': Buffer.byteLength(options.body).toString() } : {}),
          },
        }, res => {
          const chunks: Buffer[] = [];

          res.on('data', chunk => {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          });

          res.on('end', () => {
            clearTimeout(overallTimer);
            const responseBody = Buffer.concat(chunks).toString('utf8');
            recordSuccessfulAddress(url.hostname, target);
            resolve(makeHttpResponse(
              res.statusCode || 500,
              res.statusMessage || 'Unknown Status',
              responseBody,
            ));
          });
        });

        const overallTimer = setTimeout(() => {
          req.destroy(new Error(`response_timeout:${options.timeoutMs}`));
        }, options.timeoutMs);

        req.on('socket', socket => {
          socket.setKeepAlive(true);

          if (socket.connecting) {
            socket.setTimeout(CONNECT_TIMEOUT_MS);
            socket.once('connect', () => {
              recordSuccessfulAddress(url.hostname, target);
              socket.setTimeout(0);
            });
            socket.once('timeout', () => {
              req.destroy(new Error(`connect_timeout:${CONNECT_TIMEOUT_MS}`));
            });
          } else {
            recordSuccessfulAddress(url.hostname, target);
          }
        });

        req.on('error', error => {
          clearTimeout(overallTimer);
          reject(error);
        });

        if (options.body) {
          req.write(options.body);
        }
        req.end();
      });
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      clearPreferredAddress(url.hostname);

      if (!isConnectPhaseError(lastError)) {
        throw lastError;
      }
    }
  }

  throw lastError ?? new Error(`connect_timeout:${CONNECT_TIMEOUT_MS}`);
}

function isRetryableStatusCode(statusCode: number): boolean {
  return statusCode === 408
    || statusCode === 409
    || statusCode === 425
    || statusCode === 429
    || statusCode >= 500;
}

function toRequestError(error: unknown): AIRequestError {
  if (error instanceof AIRequestError) {
    return error;
  }

  if (error instanceof Error) {
    return new AIRequestError(error.message);
  }

  return new AIRequestError(String(error));
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
  runner: (provider: ProviderCandidate) => Promise<T>,
): Promise<T> {
  const candidates = buildProviderCandidates(primary);
  let lastError: AIRequestError | undefined;
  let attempted = 0;

  for (const provider of candidates) {
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
    if (provider.source === 'fallback') {
      logger.warn('ai.provider.fallback.activated', {
        action,
        provider: provider.name,
        providerHost: readHost(provider.baseUrl),
        model: provider.model,
      });
    }

    try {
      return await runner(provider);
    } catch (error) {
      lastError = toRequestError(error);
      logger.warn('ai.provider.attempt.failed', {
        action,
        provider: provider.name,
        source: provider.source,
        providerHost: readHost(provider.baseUrl),
        model: provider.model,
        retryable: lastError.retryable,
        statusCode: lastError.statusCode,
        error: sanitizeErrorText(lastError.message),
      });

      if (!lastError.retryable) {
        throw lastError;
      }
    }
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
    .filter(item => item.word && item.meaning)
    .slice(0, 8);

  return {
    english,
    chinese,
    vocabulary: normalizedVocabulary,
    title: typeof raw.title === 'string' ? raw.title.trim() : undefined,
  };
}

async function postChatCompletions(aiConfig: AIConfig, body: Record<string, unknown>): Promise<Response> {
  const timeoutMs = typeof body.timeoutMs === 'number'
    ? body.timeoutMs
    : config.ai.requestTimeoutMs;

  try {
    const payload = { ...body };
    delete payload.timeoutMs;
    return await postJsonWithAgent(
      buildCompletionsEndpoint(aiConfig.baseUrl),
      {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aiConfig.apiKey}`,
      },
      JSON.stringify(payload),
      timeoutMs,
    );
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('response_timeout:')) {
      throw new AIRequestError(`AI 请求超时（>${Math.floor(timeoutMs / 1000)}s）`, { retryable: true });
    }
    if (err instanceof Error && err.message.startsWith('connect_timeout:')) {
      throw new AIRequestError(
        `AI 连接超时（单次 >${Math.floor(CONNECT_TIMEOUT_MS / 1000)}s，已重试 ${CONNECT_RETRY_ATTEMPTS} 次）`,
        { retryable: true },
      );
    }
    const fallback = err instanceof Error ? err.message : '未知网络错误';
    const cause = describeErrorCause(err);
    const detail = cause ? `${fallback} | ${cause}` : fallback;
    throw new AIRequestError(`AI 请求失败: ${sanitizeErrorText(detail)}`, { retryable: true });
  }
}

async function sendRequest(prompt: string, options: RequestOptions, aiConfig?: AIConfig): Promise<string> {
  validateAIConfig(aiConfig);
  const messages: ChatMessage[] = [
    { role: 'system', content: JSON_ONLY_SYSTEM_PROMPT },
    { role: 'user', content: prompt },
  ];
  const maxTokens = options.maxTokens ?? 2000;
  const timeoutMs = options.timeoutMs ?? pickTimeoutMs(options.action, aiConfig.model);
  const promptChars = messages.reduce((total, item) => total + item.content.length, 0);

  return withProviderFallback(aiConfig, options.action, async provider => {
    const providerHost = readHost(provider.baseUrl);
    const modelProfile = isSlowReasoningModel(provider.model) ? 'slow_reasoning' : 'standard';
    const cacheKey = buildRequestCacheKey(provider, options.action, prompt, maxTokens);
    const cachedContent = readCachedContent(cacheKey);
    if (cachedContent) {
      logger.info('ai.request.cache_hit', {
        action: options.action,
        providerHost,
        provider: provider.name,
        source: provider.source,
        model: provider.model,
        modelProfile,
      });
      return cachedContent;
    }

    const inflightRequest = inflightRequestCache.get(cacheKey);
    if (inflightRequest) {
      logger.info('ai.request.inflight_reused', {
        action: options.action,
        providerHost,
        provider: provider.name,
        source: provider.source,
        model: provider.model,
        modelProfile,
      });
      return inflightRequest;
    }

    const requestPromise = (async () => {
      const startedAt = Date.now();
      let res: Response;

      logger.info('ai.request.started', {
        action: options.action,
        providerHost,
        provider: provider.name,
        source: provider.source,
        model: provider.model,
        modelProfile,
        promptChars,
        maxTokens,
        timeoutMs,
      });

      try {
        res = await postChatCompletions(provider, {
          model: provider.model,
          messages,
          temperature: options.temperature ?? 0.3,
          max_tokens: maxTokens,
          timeoutMs,
        });
      } catch (error) {
        const requestError = toRequestError(error);
        logger.error('ai.request.failed', {
          action: options.action,
          providerHost,
          provider: provider.name,
          source: provider.source,
          model: provider.model,
          modelProfile,
          durationMs: Date.now() - startedAt,
          retryable: requestError.retryable,
          statusCode: requestError.statusCode,
          error: sanitizeErrorText(requestError.message),
        });
        throw requestError;
      }

      logger.info('ai.request.completed', {
        action: options.action,
        providerHost,
        provider: provider.name,
        source: provider.source,
        model: provider.model,
        modelProfile,
        statusCode: res.status,
        ok: res.ok,
        durationMs: Date.now() - startedAt,
        promptChars,
        maxTokens,
        timeoutMs,
      });

      if (!res.ok) {
        const errBody = await safeReadJson<ErrorBody>(res);
        const snippet = errBody.rawText ? sanitizeErrorText(errBody.rawText.slice(0, 120)) : '';
        const upstreamMessage = getErrorMessageFromBody(errBody.data) || snippet || res.statusText || '未知上游错误';
        throw new AIRequestError(
          `AI 上游服务错误（${res.status}）: ${sanitizeErrorText(upstreamMessage)}`,
          { retryable: isRetryableStatusCode(res.status), statusCode: res.status },
        );
      }

      const dataResult = await safeReadJson<ChatCompletionResponse>(res);
      if (!dataResult.ok || !dataResult.data) {
        throw new AIRequestError('AI 上游返回非 JSON 内容，请检查 Base URL 或模型服务状态');
      }

      const data = dataResult.data;
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new AIRequestError('AI 返回内容为空，请稍后重试', { retryable: true });
      }

      writeCachedContent(cacheKey, content);
      return content;
    })();

    inflightRequestCache.set(cacheKey, requestPromise);
    try {
      return await requestPromise;
    } finally {
      inflightRequestCache.delete(cacheKey);
    }
  });
}

export async function extractWords(text: string, maxWords = 10, level = 'all', aiConfig?: AIConfig) {
  const prompt = buildExtractWordsPrompt(text, maxWords, level);
  const content = await sendRequest(prompt, {
    action: 'extract_words',
    temperature: 0.2,
    maxTokens: estimateFlashcardsMaxTokens(maxWords),
  }, aiConfig);
  return parseJsonResponse(content);
}

export async function analyzeSentence(sentence: string, aiConfig?: AIConfig) {
  const compactMode = isSlowReasoningModel(aiConfig?.model ?? '');
  const prompt = buildAnalyzeSentencePrompt(sentence, compactMode ? { compact: true } : undefined);
  const content = await sendRequest(prompt, {
    action: 'analyze_sentence',
    temperature: compactMode ? 0 : 0.2,
    maxTokens: compactMode ? 850 : estimateSentenceMaxTokens(sentence),
  }, aiConfig);
  return parseJsonResponse(content);
}

export async function generateReadingContent(text: string, options?: Partial<ReadingGenerateOptions>, aiConfig?: AIConfig) {
  const normalizedOptions = normalizeReadingOptions(options);
  const prompt = buildReadingContentPrompt(text, normalizedOptions);
  const content = await sendRequest(prompt, {
    action: 'generate_reading',
    temperature: 0.2,
    maxTokens: estimateReadingMaxTokens(text, normalizedOptions.language),
  }, aiConfig);
  const result = parseJsonResponse(content);
  return normalizeReadingResponse(result);
}

export async function generateReadingQuestions(reading: string, options?: Partial<QuizGenerateOptions>, aiConfig?: AIConfig) {
  const normalizedOptions = normalizeQuizOptions(options);
  const prompt = buildReadingQuestionsPrompt(reading, normalizedOptions);
  const content = await sendRequest(prompt, {
    action: 'generate_reading_questions',
    temperature: 0.2,
    maxTokens: 1100,
  }, aiConfig);
  return parseJsonResponse(content);
}

export async function generateVocabularyQuestions(vocabulary: unknown[], options?: Partial<QuizGenerateOptions>, aiConfig?: AIConfig) {
  const normalizedOptions = normalizeQuizOptions(options);
  const prompt = buildVocabularyQuestionsPrompt(vocabulary, normalizedOptions);
  const content = await sendRequest(prompt, {
    action: 'generate_vocabulary_questions',
    temperature: 0.2,
    maxTokens: 1100,
  }, aiConfig);
  return parseJsonResponse(content);
}

export async function generateLearningReport(reportType: string, learningData: unknown, aiConfig?: AIConfig) {
  const prompt = buildLearningReportPrompt(reportType, learningData);
  const content = await sendRequest(prompt, {
    action: 'generate_learning_report',
    temperature: 0.3,
    maxTokens: 1400,
  }, aiConfig);
  return parseJsonResponse(content);
}

export async function testConnection(aiConfig?: AIConfig): Promise<{ success: boolean; model: string }> {
  validateAIConfig(aiConfig);
  return withProviderFallback(aiConfig, 'connection_test', async provider => {
    const startedAt = Date.now();
    const providerHost = readHost(provider.baseUrl);
    const timeoutMs = pickTimeoutMs('connection_test', provider.model);
    let res: Response;
    let strategy: 'models' | 'chat_completion' = 'models';

    try {
      res = await requestWithAgent({
        urlString: buildModelsEndpoint(provider.baseUrl),
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${provider.apiKey}`,
        },
        timeoutMs: Math.min(timeoutMs, 20_000),
      });

      if (!res.ok && [404, 405, 501].includes(res.status)) {
        strategy = 'chat_completion';
        res = await postChatCompletions(provider, {
          model: provider.model,
          messages: [
            { role: 'system', content: JSON_ONLY_SYSTEM_PROMPT },
            { role: 'user', content: 'Hi' },
          ],
          max_tokens: 5,
          timeoutMs,
        });
      }
    } catch (error) {
      const requestError = toRequestError(error);
      logger.error('ai.connection.failed', {
        providerHost,
        provider: provider.name,
        source: provider.source,
        model: provider.model,
        durationMs: Date.now() - startedAt,
        strategy,
        retryable: requestError.retryable,
        statusCode: requestError.statusCode,
        error: sanitizeErrorText(requestError.message),
      });
      throw requestError;
    }

    logger.info('ai.connection.completed', {
      providerHost,
      provider: provider.name,
      source: provider.source,
      model: provider.model,
      strategy,
      statusCode: res.status,
      ok: res.ok,
      durationMs: Date.now() - startedAt,
    });

    if (!res.ok) {
      const errBody = await safeReadJson<ErrorBody>(res);
      const snippet = errBody.rawText ? sanitizeErrorText(errBody.rawText.slice(0, 120)) : '';
      const upstreamMessage = getErrorMessageFromBody(errBody.data) || snippet || res.statusText || '未知上游错误';
      throw new AIRequestError(
        `连接失败: ${sanitizeErrorText(upstreamMessage)}`,
        { retryable: isRetryableStatusCode(res.status), statusCode: res.status },
      );
    }

    const okBody = await safeReadJson(res);
    if (!okBody.ok) {
      throw new AIRequestError('连接失败: 上游返回非 JSON 内容');
    }
    return { success: true, model: provider.model };
  });
}
