export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export interface ValidatedAIConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

interface FlashcardsExtractPayload {
  text: string;
  maxWords: number;
  level: 'all' | 'cet4' | 'cet6' | 'advanced';
  aiConfig?: ValidatedAIConfig;
}

interface SentenceAnalyzePayload {
  sentence: string;
  aiConfig?: ValidatedAIConfig;
}

interface ReadingGeneratePayload {
  text: string;
  language: 'en' | 'zh';
  topic: 'general' | 'work' | 'travel' | 'technology' | 'culture' | 'education';
  difficulty: 'easy' | 'medium' | 'hard';
  length: 'short' | 'medium' | 'long';
  aiConfig?: ValidatedAIConfig;
}

interface ReadingQuestionsPayload {
  reading: string;
  questionCount: number;
  difficulty: 'easy' | 'medium' | 'hard';
  timedMode: boolean;
  timeLimitMinutes: number;
  aiConfig?: ValidatedAIConfig;
}

interface VocabularyQuestionsPayload {
  vocabulary: unknown[];
  questionCount: number;
  difficulty: 'easy' | 'medium' | 'hard';
  timedMode: boolean;
  timeLimitMinutes: number;
  aiConfig?: ValidatedAIConfig;
}

interface ReportGeneratePayload {
  reportType: 'weekly' | 'exam_sprint' | 'workplace_boost' | 'monthly' | 'term';
  learningData: Record<string, unknown>;
  aiConfig?: ValidatedAIConfig;
}

interface AiTestPayload {
  aiConfig: ValidatedAIConfig;
}

type ObjectRecord = Record<string, unknown>;

const MAX_FLASHCARDS_TEXT_LENGTH = 8_000;
const MIN_FLASHCARDS_WORDS = 1;
const MAX_FLASHCARDS_WORDS = 30;
const MAX_SENTENCE_LENGTH = 1_000;
const MAX_READING_LENGTH = 200_000;
const MAX_API_KEY_LENGTH = 2_048;
const MAX_MODEL_LENGTH = 200;
const MAX_BASE_URL_LENGTH = 500;

function ensureObject(value: unknown, fieldName = '请求体'): ObjectRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ValidationError(`${fieldName}必须是 JSON 对象`);
  }
  return value as ObjectRecord;
}

function readRequiredString(
  obj: ObjectRecord,
  key: string,
  label: string,
  maxLength: number,
): string {
  const value = obj[key];
  if (typeof value !== 'string') {
    throw new ValidationError(`${label}必须是字符串`);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw new ValidationError(`${label}不能为空`);
  }

  if (trimmed.length > maxLength) {
    throw new ValidationError(`${label}长度不能超过 ${maxLength} 个字符`);
  }

  return trimmed;
}

function readOptionalInteger(
  obj: ObjectRecord,
  key: string,
  defaultValue: number,
  label: string,
  min: number,
  max: number,
): number {
  const value = obj[key];
  if (value === undefined) return defaultValue;

  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new ValidationError(`${label}必须是整数`);
  }

  if (value < min || value > max) {
    throw new ValidationError(`${label}必须在 ${min} 到 ${max} 之间`);
  }

  return value;
}

function readOptionalEnum<T extends string>(
  obj: ObjectRecord,
  key: string,
  defaultValue: T,
  label: string,
  allowedValues: readonly T[],
): T {
  const value = obj[key];
  if (value === undefined) return defaultValue;

  if (typeof value !== 'string') {
    throw new ValidationError(`${label}必须是字符串`);
  }

  if (!allowedValues.includes(value as T)) {
    throw new ValidationError(`${label}不支持: ${value}`);
  }

  return value as T;
}

function readOptionalBoolean(
  obj: ObjectRecord,
  key: string,
  defaultValue: boolean,
  label: string,
): boolean {
  const value = obj[key];
  if (value === undefined) return defaultValue;
  if (typeof value !== 'boolean') {
    throw new ValidationError(`${label}必须是布尔值`);
  }
  return value;
}

function readRequiredEnum<T extends string>(
  obj: ObjectRecord,
  key: string,
  label: string,
  allowedValues: readonly T[],
): T {
  const value = obj[key];
  if (typeof value !== 'string') {
    throw new ValidationError(`${label}必须是字符串`);
  }

  if (!allowedValues.includes(value as T)) {
    throw new ValidationError(`${label}不支持: ${value}`);
  }

  return value as T;
}

function readRequiredArray(
  obj: ObjectRecord,
  key: string,
  label: string,
  minLength: number,
  maxLength: number,
): unknown[] {
  const value = obj[key];
  if (!Array.isArray(value)) {
    throw new ValidationError(`${label}必须是数组`);
  }

  if (value.length < minLength || value.length > maxLength) {
    throw new ValidationError(`${label}数量必须在 ${minLength} 到 ${maxLength} 之间`);
  }

  return value;
}

function readOptionalAiConfig(obj: ObjectRecord): ValidatedAIConfig | undefined {
  const value = obj.aiConfig;
  if (value === undefined) return undefined;

  const ai = ensureObject(value, 'aiConfig');
  return {
    apiKey: readRequiredString(ai, 'apiKey', 'AI API Key', MAX_API_KEY_LENGTH),
    baseUrl: readRequiredString(ai, 'baseUrl', 'AI Base URL', MAX_BASE_URL_LENGTH),
    model: readRequiredString(ai, 'model', 'AI 模型', MAX_MODEL_LENGTH),
  };
}

export function validateFlashcardsExtractPayload(body: unknown): FlashcardsExtractPayload {
  const obj = ensureObject(body);

  const text = readRequiredString(obj, 'text', '文本内容', MAX_FLASHCARDS_TEXT_LENGTH);
  const maxWords = readOptionalInteger(obj, 'maxWords', 10, '提词数量', MIN_FLASHCARDS_WORDS, MAX_FLASHCARDS_WORDS);
  const level = readOptionalEnum(obj, 'level', 'all', '词汇难度', ['all', 'cet4', 'cet6', 'advanced'] as const);
  const aiConfig = readOptionalAiConfig(obj);

  return { text, maxWords, level, aiConfig };
}

export function validateSentenceAnalyzePayload(body: unknown): SentenceAnalyzePayload {
  const obj = ensureObject(body);

  const sentence = readRequiredString(obj, 'sentence', '句子', MAX_SENTENCE_LENGTH);
  const aiConfig = readOptionalAiConfig(obj);

  return { sentence, aiConfig };
}

export function validateReadingGeneratePayload(body: unknown): ReadingGeneratePayload {
  const obj = ensureObject(body);

  const text = readRequiredString(obj, 'text', '文本内容', MAX_READING_LENGTH);
  const language = readOptionalEnum(obj, 'language', 'en', '语言方向', ['en', 'zh'] as const);
  const topic = readOptionalEnum(
    obj,
    'topic',
    'general',
    '阅读主题',
    ['general', 'work', 'travel', 'technology', 'culture', 'education'] as const,
  );
  const difficulty = readOptionalEnum(
    obj,
    'difficulty',
    'medium',
    '阅读难度',
    ['easy', 'medium', 'hard'] as const,
  );
  const length = readOptionalEnum(
    obj,
    'length',
    'medium',
    '阅读篇幅',
    ['short', 'medium', 'long'] as const,
  );
  const aiConfig = readOptionalAiConfig(obj);

  return { text, language, topic, difficulty, length, aiConfig };
}

export function validateReadingQuestionsPayload(body: unknown): ReadingQuestionsPayload {
  const obj = ensureObject(body);

  const reading = readRequiredString(obj, 'reading', '阅读内容', MAX_READING_LENGTH);
  const questionCount = readOptionalInteger(obj, 'questionCount', 5, '题目数量', 1, 20);
  const difficulty = readOptionalEnum(obj, 'difficulty', 'medium', '题目难度', ['easy', 'medium', 'hard'] as const);
  const timedMode = readOptionalBoolean(obj, 'timedMode', false, '限时模式');
  const timeLimitMinutes = readOptionalInteger(obj, 'timeLimitMinutes', 15, '限时分钟', 1, 60);
  const aiConfig = readOptionalAiConfig(obj);

  return { reading, questionCount, difficulty, timedMode, timeLimitMinutes, aiConfig };
}

export function validateVocabularyQuestionsPayload(body: unknown): VocabularyQuestionsPayload {
  const obj = ensureObject(body);

  const vocabulary = readRequiredArray(obj, 'vocabulary', '词汇列表', 1, 500);
  const questionCount = readOptionalInteger(obj, 'questionCount', 5, '题目数量', 1, 20);
  const difficulty = readOptionalEnum(obj, 'difficulty', 'medium', '题目难度', ['easy', 'medium', 'hard'] as const);
  const timedMode = readOptionalBoolean(obj, 'timedMode', false, '限时模式');
  const timeLimitMinutes = readOptionalInteger(obj, 'timeLimitMinutes', 15, '限时分钟', 1, 60);
  const aiConfig = readOptionalAiConfig(obj);

  return { vocabulary, questionCount, difficulty, timedMode, timeLimitMinutes, aiConfig };
}

export function validateReportGeneratePayload(body: unknown): ReportGeneratePayload {
  const obj = ensureObject(body);

  const reportType = readRequiredEnum(
    obj,
    'reportType',
    '报告类型',
    ['weekly', 'exam_sprint', 'workplace_boost', 'monthly', 'term'] as const,
  );

  const learningData = ensureObject(obj.learningData, '学习数据');
  const aiConfig = readOptionalAiConfig(obj);

  return { reportType, learningData, aiConfig };
}

export function validateAiTestPayload(body: unknown): AiTestPayload {
  const obj = ensureObject(body);
  const aiConfig = readOptionalAiConfig(obj);

  if (!aiConfig) {
    throw new ValidationError('请提供 aiConfig 配置');
  }

  return { aiConfig };
}
