import { Router, Request, Response, NextFunction } from 'express';
import { analyzeSentence } from '../services/ai-service';
import { validateSentenceAnalyzePayload } from '../utils/request-validator';
import { learningDataRepository } from '../repositories/learning-data-repository';

export const sentenceRouter = Router();

interface SentenceStructure {
  type: string;
  explanation: string;
  pattern: string;
}

interface SentenceClause {
  text: string;
  type: string;
  function: string;
  connector: string;
}

interface SentenceTense {
  name: string;
  explanation: string;
}

interface SentenceComponent {
  text: string;
  type: string;
  explanation: string;
}

interface SentenceWordInfo {
  text: string;
  lemma: string;
  partOfSpeech: string;
  meaning: string;
  role: string;
}

interface SentencePhrase {
  text: string;
  category: string;
  function: string;
  explanation: string;
}

interface SentenceGrammarPoint {
  title: string;
  explanation: string;
  tags: string[];
}

interface NormalizedSentenceAnalysis {
  structure: SentenceStructure;
  clauses: SentenceClause[];
  tense: SentenceTense[];
  components: SentenceComponent[];
  words: SentenceWordInfo[];
  phrases: SentencePhrase[];
  grammarPoints: SentenceGrammarPoint[];
}

function readStringField(source: Record<string, unknown>, keys: string[], fallback = ''): string {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return fallback;
}

function readTags(source: Record<string, unknown>): string[] {
  const tagValue = source.tags ?? source.tag ?? source.labels ?? source.label;
  if (Array.isArray(tagValue)) {
    return tagValue
      .map(item => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean);
  }
  if (typeof tagValue === 'string') {
    return tagValue
      .split(/[，,|/]/)
      .map(item => item.trim())
      .filter(Boolean);
  }
  return [];
}

function toObjectArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object');
}

function normalizeSentenceAnalysis(payload: unknown): NormalizedSentenceAnalysis {
  const root = payload && typeof payload === 'object'
    ? payload as Record<string, unknown>
    : {};
  const structureSource = root.structure && typeof root.structure === 'object'
    ? root.structure as Record<string, unknown>
    : {};

  const structure: SentenceStructure = {
    type: readStringField(structureSource, ['type', 'sentenceType'], '未识别句型'),
    explanation: readStringField(structureSource, ['explanation', 'description', 'detail'], '未提供结构解释'),
    pattern: readStringField(structureSource, ['pattern', 'formula', 'template']),
  };

  const clauses = toObjectArray(root.clauses).map(item => ({
    text: readStringField(item, ['text', 'content']),
    type: readStringField(item, ['type', 'clauseType']),
    function: readStringField(item, ['function', 'role']),
    connector: readStringField(item, ['connector', 'marker']),
  })).filter(item => item.text || item.type || item.function || item.connector);

  const tense = toObjectArray(root.tense ?? root.tenses).map(item => ({
    name: readStringField(item, ['name', 'tense']),
    explanation: readStringField(item, ['explanation', 'detail', 'description']),
  })).filter(item => item.name || item.explanation);

  const components = toObjectArray(root.components).map(item => ({
    text: readStringField(item, ['text', 'content']),
    type: readStringField(item, ['type', 'componentType']),
    explanation: readStringField(item, ['explanation', 'detail']),
  })).filter(item => item.text || item.type || item.explanation);

  const wordsSource = root.words ?? root.wordDetails ?? root.tokens;
  const words = toObjectArray(wordsSource).map(item => ({
    text: readStringField(item, ['text', 'word', 'token']),
    lemma: readStringField(item, ['lemma', 'baseForm', 'root', 'word']),
    partOfSpeech: readStringField(item, ['partOfSpeech', 'pos', 'type']),
    meaning: readStringField(item, ['meaning', 'definition', 'explanation']),
    role: readStringField(item, ['role', 'function', 'usage']),
  })).filter(item => item.text || item.lemma || item.meaning);

  const phrases = toObjectArray(root.phrases).map(item => ({
    text: readStringField(item, ['text', 'phrase']),
    category: readStringField(item, ['category', 'type']),
    function: readStringField(item, ['function', 'role', 'usage']),
    explanation: readStringField(item, ['explanation', 'detail', 'meaning']),
  })).filter(item => item.text || item.category || item.explanation);

  const grammarPoints = toObjectArray(root.grammarPoints ?? root.grammar).map(item => ({
    title: readStringField(item, ['title', 'point', 'name']),
    explanation: readStringField(item, ['explanation', 'detail', 'description']),
    tags: readTags(item),
  })).filter(item => item.title || item.explanation || item.tags.length > 0);

  return {
    structure,
    clauses,
    tense,
    components,
    words,
    phrases,
    grammarPoints,
  };
}

sentenceRouter.post('/analyze', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sentence, aiConfig } = validateSentenceAnalyzePayload(req.body);
    const result = await analyzeSentence(sentence, aiConfig);
    const normalizedResult = normalizeSentenceAnalysis(result);
    learningDataRepository.persistSentenceAnalysis(
      req.header('x-anonymous-session-id') || undefined,
      sentence,
      normalizedResult,
    );
    res.json(normalizedResult);
  } catch (err) {
    next(err);
  }
});
