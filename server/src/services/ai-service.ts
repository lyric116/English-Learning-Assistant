import { parseJsonResponse } from '../utils/json-parser';
import {
  buildExtractWordsPrompt,
  buildAnalyzeSentencePrompt,
  buildReadingContentPrompt,
  buildReadingQuestionsPrompt,
  buildVocabularyQuestionsPrompt,
  buildLearningReportPrompt,
} from '../utils/prompt-builder';
import { config } from '../config';

interface ChatCompletionResponse {
  choices: Array<{ message: { content: string } }>;
}

interface AIConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

interface ErrorBody {
  error?: { message?: string };
}

interface SafeJsonResult<T = unknown> {
  ok: boolean;
  data?: T;
  rawText?: string;
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
  return `${baseUrl.replace(/\/+$/, '')}/chat/completions`;
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

async function postChatCompletions(aiConfig: AIConfig, body: Record<string, unknown>): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.ai.requestTimeoutMs);

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
      throw new Error(`AI 请求超时（>${Math.floor(config.ai.requestTimeoutMs / 1000)}s）`);
    }
    const fallback = err instanceof Error ? err.message : '未知网络错误';
    throw new Error(`AI 请求失败: ${sanitizeErrorText(fallback)}`);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function sendRequest(prompt: string, options: { temperature?: number; maxTokens?: number } = {}, aiConfig?: AIConfig): Promise<string> {
  validateAIConfig(aiConfig);

  const res = await postChatCompletions(aiConfig, {
      model: aiConfig.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2000,
  });

  if (!res.ok) {
    const errBody = await safeReadJson<ErrorBody>(res);
    const snippet = errBody.rawText ? sanitizeErrorText(errBody.rawText.slice(0, 120)) : '';
    const upstreamMessage = getErrorMessageFromBody(errBody.data) || snippet || res.statusText || '未知上游错误';
    throw new Error(`AI 上游服务错误（${res.status}）: ${sanitizeErrorText(upstreamMessage)}`);
  }

  const dataResult = await safeReadJson<ChatCompletionResponse>(res);
  if (!dataResult.ok || !dataResult.data) {
    throw new Error('AI 上游返回非 JSON 内容，请检查 Base URL 或模型服务状态');
  }

  const data = dataResult.data;
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('AI 返回内容为空，请稍后重试');
  }
  return content;
}

export async function extractWords(text: string, maxWords = 10, level = 'all', aiConfig?: AIConfig) {
  const prompt = buildExtractWordsPrompt(text, maxWords, level);
  const content = await sendRequest(prompt, { temperature: 0.7, maxTokens: 1000 }, aiConfig);
  return parseJsonResponse(content);
}

export async function analyzeSentence(sentence: string, aiConfig?: AIConfig) {
  const prompt = buildAnalyzeSentencePrompt(sentence);
  const content = await sendRequest(prompt, { temperature: 0.6, maxTokens: 2000 }, aiConfig);
  return parseJsonResponse(content);
}

export async function generateReadingContent(text: string, language = 'en', aiConfig?: AIConfig) {
  const prompt = buildReadingContentPrompt(text, language);
  const content = await sendRequest(prompt, { temperature: 0.7, maxTokens: 2000 }, aiConfig);
  const result = parseJsonResponse<{ english: string; chinese: string; vocabulary: unknown[] }>(content);
  if (!result.english || !result.chinese || !Array.isArray(result.vocabulary)) {
    throw new Error('AI返回的数据格式不正确');
  }
  return result;
}

export async function generateReadingQuestions(reading: string, questionCount = 5, aiConfig?: AIConfig) {
  const prompt = buildReadingQuestionsPrompt(reading, questionCount);
  const content = await sendRequest(prompt, { temperature: 0.6, maxTokens: 1500 }, aiConfig);
  return parseJsonResponse(content);
}

export async function generateVocabularyQuestions(vocabulary: unknown[], questionCount = 5, aiConfig?: AIConfig) {
  const prompt = buildVocabularyQuestionsPrompt(vocabulary, questionCount);
  const content = await sendRequest(prompt, { temperature: 0.7, maxTokens: 1500 }, aiConfig);
  return parseJsonResponse(content);
}

export async function generateLearningReport(reportType: string, learningData: unknown, aiConfig?: AIConfig) {
  const prompt = buildLearningReportPrompt(reportType, learningData);
  const content = await sendRequest(prompt, { temperature: 0.7, maxTokens: 1500 }, aiConfig);
  return parseJsonResponse(content);
}

export async function testConnection(aiConfig?: AIConfig): Promise<{ success: boolean; model: string }> {
  validateAIConfig(aiConfig);

  const res = await postChatCompletions(aiConfig, {
      model: aiConfig.model,
      messages: [{ role: 'user', content: 'Hi' }],
      max_tokens: 5,
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
  return { success: true, model: aiConfig.model };
}
