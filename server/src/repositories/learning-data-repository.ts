import { randomUUID } from 'crypto';
import { logger } from '../utils/logger';
import { SqliteClient } from './sqlite-client';

interface FlashcardRecord {
  word: string;
  phonetic: string;
  definition: string;
  etymology: string;
  example: string;
  exampleTranslation: string;
  learningStatus?: 'new' | 'reviewing' | 'mastered';
  nextReviewAt?: number;
  accuracy?: number;
  reviewCount?: number;
}

interface ReadingPersistPayload {
  language: 'en' | 'zh';
  topic: string;
  difficulty: string;
  length: string;
  title?: string;
  english: string;
  chinese: string;
  vocabulary: unknown[];
}

interface QuizGenerationPayload {
  quizType: 'reading' | 'vocabulary';
  questionCount: number;
  difficulty: string;
  timedMode: boolean;
  timeLimitMinutes: number;
}

type LearningReportPayload = Record<string, unknown>;

interface SentenceHistoryRecord {
  sentence: string;
  result: unknown;
  timestamp: number;
}

function normalizeOwnerId(rawOwnerId: string | undefined): string {
  const trimmed = (rawOwnerId || '').trim();
  return trimmed || 'anonymous-default';
}

function readReportField(payload: LearningReportPayload, key: string): string {
  const value = payload[key];
  return typeof value === 'string' ? value : '';
}

function extractGrammarTags(payload: unknown): string[] {
  if (!payload || typeof payload !== 'object') return [];
  const root = payload as Record<string, unknown>;
  const points = root.grammarPoints;
  if (!Array.isArray(points)) return [];

  const tags = points.flatMap(item => {
    if (!item || typeof item !== 'object') return [];
    const itemTags = (item as Record<string, unknown>).tags;
    if (!Array.isArray(itemTags)) return [];

    return itemTags
      .filter(tag => typeof tag === 'string')
      .map(tag => tag.trim())
      .filter(Boolean);
  });

  return Array.from(new Set(tags)).slice(0, 20);
}

class LearningDataRepository {
  private readonly sqlite = new SqliteClient();
  private readonly enabled = process.env.ENABLE_DB_PERSISTENCE !== '0';
  private available = false;

  constructor() {
    if (!this.enabled) {
      logger.warn('repository.disabled', { reason: 'ENABLE_DB_PERSISTENCE=0' });
      return;
    }

    try {
      this.sqlite.execute('SELECT 1;');
      this.available = true;
      logger.info('repository.ready', { dbPath: this.sqlite.getDatabasePath() });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn('repository.unavailable', {
        dbPath: this.sqlite.getDatabasePath(),
        error: message,
      });
    }
  }

  private execute(module: string, action: string, script: string): void {
    if (!this.enabled || !this.available) return;

    try {
      this.sqlite.execute(script);
      logger.info('repository.write.ok', { module, action });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn('repository.write.failed', { module, action, error: message });
    }
  }

  private query<T>(module: string, action: string, statement: string): T[] {
    if (!this.enabled || !this.available) return [];

    try {
      const result = this.sqlite.queryJson<T>(statement);
      logger.info('repository.read.ok', { module, action, rows: result.length });
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn('repository.read.failed', { module, action, error: message });
      return [];
    }
  }

  getFlashcards(ownerIdRaw: string | undefined, limit = 120): FlashcardRecord[] {
    const ownerId = normalizeOwnerId(ownerIdRaw);
    const ownerType = 'anonymous';
    const safeLimit = Number.isInteger(limit) ? Math.max(1, Math.min(limit, 500)) : 120;
    const query = `
      SELECT
        word,
        phonetic,
        definition,
        etymology,
        example,
        example_translation AS exampleTranslation,
        learning_status AS learningStatus,
        CAST(COALESCE(strftime('%s', next_review_at), strftime('%s', 'now')) AS INTEGER) * 1000 AS nextReviewAt,
        CAST(COALESCE(accuracy, 0) AS REAL) AS accuracy,
        CAST(COALESCE(review_count, 0) AS INTEGER) AS reviewCount
      FROM flashcards
      WHERE owner_type = ${SqliteClient.sqlLiteral(ownerType)}
        AND owner_id = ${SqliteClient.sqlLiteral(ownerId)}
      ORDER BY updated_at DESC
      LIMIT ${safeLimit};
    `;
    return this.query<FlashcardRecord>('flashcards', 'select_history', query);
  }

  getSentenceHistory(ownerIdRaw: string | undefined, limit = 20): SentenceHistoryRecord[] {
    const ownerId = normalizeOwnerId(ownerIdRaw);
    const ownerType = 'anonymous';
    const safeLimit = Number.isInteger(limit) ? Math.max(1, Math.min(limit, 200)) : 20;
    const query = `
      SELECT
        sentence_text AS sentence,
        analysis_json AS analysisJson,
        CAST(COALESCE(strftime('%s', created_at), strftime('%s', 'now')) AS INTEGER) * 1000 AS timestamp
      FROM sentence_analyses
      WHERE owner_type = ${SqliteClient.sqlLiteral(ownerType)}
        AND owner_id = ${SqliteClient.sqlLiteral(ownerId)}
      ORDER BY created_at DESC
      LIMIT ${safeLimit};
    `;

    const rows = this.query<{ sentence: string; analysisJson: string; timestamp: number }>('sentence', 'select_history', query);
    return rows.map(item => {
      let parsed: unknown = {};
      try {
        parsed = item.analysisJson ? JSON.parse(item.analysisJson) : {};
      } catch {
        parsed = {};
      }
      return {
        sentence: item.sentence,
        result: parsed,
        timestamp: item.timestamp,
      };
    });
  }

  persistFlashcards(ownerIdRaw: string | undefined, words: FlashcardRecord[]): void {
    if (!Array.isArray(words) || words.length === 0) return;

    const ownerId = normalizeOwnerId(ownerIdRaw);
    const ownerType = 'anonymous';

    const statements = words.map(item => {
      const learningStatus = item.learningStatus || 'new';
      const accuracy = typeof item.accuracy === 'number' ? Math.max(0, item.accuracy) : 0;
      const reviewCount = typeof item.reviewCount === 'number' ? Math.max(0, item.reviewCount) : 0;
      const nextReviewAt = typeof item.nextReviewAt === 'number'
        ? new Date(item.nextReviewAt).toISOString()
        : null;

      return `
      INSERT INTO flashcards (
        id, owner_type, owner_id, word, phonetic, definition, etymology, example, example_translation,
        learning_status, accuracy, review_count, next_review_at, source_text_hash, created_at, updated_at
      ) VALUES (
        ${SqliteClient.sqlLiteral(randomUUID())},
        ${SqliteClient.sqlLiteral(ownerType)},
        ${SqliteClient.sqlLiteral(ownerId)},
        ${SqliteClient.sqlLiteral(item.word)},
        ${SqliteClient.sqlLiteral(item.phonetic)},
        ${SqliteClient.sqlLiteral(item.definition)},
        ${SqliteClient.sqlLiteral(item.etymology)},
        ${SqliteClient.sqlLiteral(item.example)},
        ${SqliteClient.sqlLiteral(item.exampleTranslation)},
        ${SqliteClient.sqlLiteral(learningStatus)},
        ${SqliteClient.sqlLiteral(accuracy)},
        ${SqliteClient.sqlLiteral(reviewCount)},
        ${SqliteClient.sqlLiteral(nextReviewAt)},
        NULL,
        datetime('now'),
        datetime('now')
      )
      ON CONFLICT(owner_type, owner_id, word) DO UPDATE SET
        phonetic = excluded.phonetic,
        definition = excluded.definition,
        etymology = excluded.etymology,
        example = excluded.example,
        example_translation = excluded.example_translation,
        learning_status = excluded.learning_status,
        accuracy = excluded.accuracy,
        review_count = excluded.review_count,
        next_review_at = excluded.next_review_at,
        updated_at = datetime('now');
    `;
    });

    this.execute('flashcards', 'upsert_words', statements.join('\n'));
  }

  persistSentenceAnalysis(ownerIdRaw: string | undefined, sentence: string, analysis: unknown): void {
    const ownerId = normalizeOwnerId(ownerIdRaw);
    const ownerType = 'anonymous';
    const tags = extractGrammarTags(analysis);

    const script = `
      INSERT INTO sentence_analyses (
        id, owner_type, owner_id, sentence_text, analysis_json, grammar_tags, created_at, updated_at
      ) VALUES (
        ${SqliteClient.sqlLiteral(randomUUID())},
        ${SqliteClient.sqlLiteral(ownerType)},
        ${SqliteClient.sqlLiteral(ownerId)},
        ${SqliteClient.sqlLiteral(sentence)},
        ${SqliteClient.sqlLiteral(JSON.stringify(analysis))},
        ${SqliteClient.sqlLiteral(JSON.stringify(tags))},
        datetime('now'),
        datetime('now')
      );
    `;

    this.execute('sentence', 'insert_analysis', script);
  }

  persistReadingContent(ownerIdRaw: string | undefined, payload: ReadingPersistPayload): void {
    const ownerId = normalizeOwnerId(ownerIdRaw);
    const ownerType = 'anonymous';

    const script = `
      INSERT INTO reading_contents (
        id, owner_type, owner_id, title, english_text, chinese_text, topic, difficulty,
        length, language, vocabulary_json, created_at, updated_at
      ) VALUES (
        ${SqliteClient.sqlLiteral(randomUUID())},
        ${SqliteClient.sqlLiteral(ownerType)},
        ${SqliteClient.sqlLiteral(ownerId)},
        ${SqliteClient.sqlLiteral(payload.title || '')},
        ${SqliteClient.sqlLiteral(payload.english)},
        ${SqliteClient.sqlLiteral(payload.chinese)},
        ${SqliteClient.sqlLiteral(payload.topic)},
        ${SqliteClient.sqlLiteral(payload.difficulty)},
        ${SqliteClient.sqlLiteral(payload.length)},
        ${SqliteClient.sqlLiteral(payload.language)},
        ${SqliteClient.sqlLiteral(JSON.stringify(payload.vocabulary || []))},
        datetime('now'),
        datetime('now')
      );
    `;

    this.execute('reading', 'insert_content', script);
  }

  persistQuizGeneration(ownerIdRaw: string | undefined, payload: QuizGenerationPayload): void {
    const ownerId = normalizeOwnerId(ownerIdRaw);
    const ownerType = 'anonymous';

    const script = `
      INSERT INTO quiz_attempts (
        id, owner_type, owner_id, quiz_type, difficulty, question_count, timed_mode,
        time_limit_minutes, time_spent_seconds, score, accuracy, reading_id, created_at
      ) VALUES (
        ${SqliteClient.sqlLiteral(randomUUID())},
        ${SqliteClient.sqlLiteral(ownerType)},
        ${SqliteClient.sqlLiteral(ownerId)},
        ${SqliteClient.sqlLiteral(payload.quizType)},
        ${SqliteClient.sqlLiteral(payload.difficulty)},
        ${SqliteClient.sqlLiteral(payload.questionCount)},
        ${SqliteClient.sqlLiteral(payload.timedMode)},
        ${SqliteClient.sqlLiteral(payload.timeLimitMinutes)},
        NULL,
        0,
        0,
        NULL,
        datetime('now')
      );
    `;

    this.execute('quiz', 'insert_generation_snapshot', script);
  }

  persistLearningReport(ownerIdRaw: string | undefined, templateType: string, report: LearningReportPayload): void {
    const ownerId = normalizeOwnerId(ownerIdRaw);
    const ownerType = 'anonymous';

    const script = `
      INSERT INTO learning_reports (
        id, owner_type, owner_id, template_type, title, period, summary, report_json, share_text, created_at
      ) VALUES (
        ${SqliteClient.sqlLiteral(randomUUID())},
        ${SqliteClient.sqlLiteral(ownerType)},
        ${SqliteClient.sqlLiteral(ownerId)},
        ${SqliteClient.sqlLiteral(templateType)},
        ${SqliteClient.sqlLiteral(readReportField(report, 'title'))},
        ${SqliteClient.sqlLiteral(readReportField(report, 'period'))},
        ${SqliteClient.sqlLiteral(readReportField(report, 'summary'))},
        ${SqliteClient.sqlLiteral(JSON.stringify(report))},
        ${SqliteClient.sqlLiteral(readReportField(report, 'summary'))},
        datetime('now')
      );
    `;

    this.execute('achievements', 'insert_report', script);
  }
}

export const learningDataRepository = new LearningDataRepository();
