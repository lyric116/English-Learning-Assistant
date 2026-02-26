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

interface ReadingHistoryRecord {
  title?: string;
  english: string;
  chinese: string;
  vocabulary: unknown[];
  timestamp: number;
  generationConfig?: {
    language: 'en' | 'zh';
    topic: string;
    difficulty: string;
    length: string;
  };
}

interface QuizHistoryRecord {
  type: 'reading' | 'vocabulary';
  score: number;
  date: string;
  readingTitle: string;
  questionCount?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  timedMode?: boolean;
  timeLimitMinutes?: number;
  timeSpentSeconds?: number;
}

interface BackfillPayload {
  flashcards?: FlashcardRecord[];
  sentenceHistory?: SentenceHistoryRecord[];
  readingHistory?: ReadingHistoryRecord[];
  testHistory?: QuizHistoryRecord[];
  reportHistory?: Array<LearningReportPayload & { templateType?: string }>;
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

  getReadingHistory(ownerIdRaw: string | undefined, limit = 20): ReadingHistoryRecord[] {
    const ownerId = normalizeOwnerId(ownerIdRaw);
    const ownerType = 'anonymous';
    const safeLimit = Number.isInteger(limit) ? Math.max(1, Math.min(limit, 200)) : 20;
    const query = `
      SELECT
        title,
        english_text AS english,
        chinese_text AS chinese,
        vocabulary_json AS vocabularyJson,
        language,
        topic,
        difficulty,
        length,
        CAST(COALESCE(strftime('%s', created_at), strftime('%s', 'now')) AS INTEGER) * 1000 AS timestamp
      FROM reading_contents
      WHERE owner_type = ${SqliteClient.sqlLiteral(ownerType)}
        AND owner_id = ${SqliteClient.sqlLiteral(ownerId)}
      ORDER BY created_at DESC
      LIMIT ${safeLimit};
    `;
    const rows = this.query<{
      title?: string;
      english: string;
      chinese: string;
      vocabularyJson: string;
      language: 'en' | 'zh';
      topic: string;
      difficulty: string;
      length: string;
      timestamp: number;
    }>('reading', 'select_history', query);

    return rows.map(item => {
      let vocabulary: unknown[] = [];
      try {
        const parsed = JSON.parse(item.vocabularyJson || '[]');
        vocabulary = Array.isArray(parsed) ? parsed : [];
      } catch {
        vocabulary = [];
      }
      return {
        title: item.title || undefined,
        english: item.english,
        chinese: item.chinese,
        vocabulary,
        timestamp: item.timestamp,
        generationConfig: {
          language: item.language,
          topic: item.topic,
          difficulty: item.difficulty,
          length: item.length,
        },
      };
    });
  }

  getQuizHistory(ownerIdRaw: string | undefined, limit = 20): QuizHistoryRecord[] {
    const ownerId = normalizeOwnerId(ownerIdRaw);
    const ownerType = 'anonymous';
    const safeLimit = Number.isInteger(limit) ? Math.max(1, Math.min(limit, 200)) : 20;
    const query = `
      SELECT
        quiz_type AS type,
        CAST(COALESCE(score, 0) AS REAL) AS score,
        datetime(created_at) AS date,
        COALESCE(reading_title, '') AS readingTitle,
        question_count AS questionCount,
        difficulty,
        CAST(COALESCE(timed_mode, 0) AS INTEGER) AS timedMode,
        time_limit_minutes AS timeLimitMinutes,
        time_spent_seconds AS timeSpentSeconds
      FROM quiz_attempts
      WHERE owner_type = ${SqliteClient.sqlLiteral(ownerType)}
        AND owner_id = ${SqliteClient.sqlLiteral(ownerId)}
      ORDER BY created_at DESC
      LIMIT ${safeLimit};
    `;
    const rows = this.query<{
      type: 'reading' | 'vocabulary';
      score: number;
      date: string;
      readingTitle: string;
      questionCount: number;
      difficulty?: 'easy' | 'medium' | 'hard';
      timedMode: number;
      timeLimitMinutes?: number;
      timeSpentSeconds?: number;
    }>('quiz', 'select_history', query);

    return rows.map(item => ({
      type: item.type,
      score: Math.round(item.score),
      date: item.date,
      readingTitle: item.readingTitle || '未知阅读',
      questionCount: item.questionCount,
      difficulty: item.difficulty,
      timedMode: item.timedMode === 1,
      timeLimitMinutes: item.timeLimitMinutes,
      timeSpentSeconds: item.timeSpentSeconds,
    }));
  }

  getReportHistory(ownerIdRaw: string | undefined, limit = 20): Array<LearningReportPayload & { timestamp?: number }> {
    const ownerId = normalizeOwnerId(ownerIdRaw);
    const ownerType = 'anonymous';
    const safeLimit = Number.isInteger(limit) ? Math.max(1, Math.min(limit, 200)) : 20;
    const query = `
      SELECT
        report_json AS reportJson,
        CAST(COALESCE(strftime('%s', created_at), strftime('%s', 'now')) AS INTEGER) * 1000 AS timestamp
      FROM learning_reports
      WHERE owner_type = ${SqliteClient.sqlLiteral(ownerType)}
        AND owner_id = ${SqliteClient.sqlLiteral(ownerId)}
      ORDER BY created_at DESC
      LIMIT ${safeLimit};
    `;
    const rows = this.query<{ reportJson: string; timestamp: number }>('achievements', 'select_history', query);

    return rows.map(item => {
      let parsed: LearningReportPayload = {};
      try {
        const json = JSON.parse(item.reportJson || '{}');
        parsed = (json && typeof json === 'object') ? json as LearningReportPayload : {};
      } catch {
        parsed = {};
      }
      return { ...parsed, timestamp: item.timestamp };
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
        time_limit_minutes, time_spent_seconds, score, accuracy, reading_id, reading_title, created_at
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
        ${SqliteClient.sqlLiteral('')},
        datetime('now')
      );
    `;

    this.execute('quiz', 'insert_generation_snapshot', script);
  }

  persistQuizResult(ownerIdRaw: string | undefined, payload: QuizHistoryRecord): void {
    const ownerId = normalizeOwnerId(ownerIdRaw);
    const ownerType = 'anonymous';
    const script = `
      INSERT INTO quiz_attempts (
        id, owner_type, owner_id, quiz_type, difficulty, question_count, timed_mode,
        time_limit_minutes, time_spent_seconds, score, accuracy, reading_id, reading_title, created_at
      ) VALUES (
        ${SqliteClient.sqlLiteral(randomUUID())},
        ${SqliteClient.sqlLiteral(ownerType)},
        ${SqliteClient.sqlLiteral(ownerId)},
        ${SqliteClient.sqlLiteral(payload.type)},
        ${SqliteClient.sqlLiteral(payload.difficulty || 'medium')},
        ${SqliteClient.sqlLiteral(payload.questionCount || 0)},
        ${SqliteClient.sqlLiteral(Boolean(payload.timedMode))},
        ${SqliteClient.sqlLiteral(payload.timeLimitMinutes ?? null)},
        ${SqliteClient.sqlLiteral(payload.timeSpentSeconds ?? null)},
        ${SqliteClient.sqlLiteral(payload.score)},
        ${SqliteClient.sqlLiteral(payload.score)},
        NULL,
        ${SqliteClient.sqlLiteral(payload.readingTitle || '')},
        ${SqliteClient.sqlLiteral(payload.date || new Date().toISOString())}
      );
    `;
    this.execute('quiz', 'insert_result', script);
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

  getBackfillStatus(ownerIdRaw: string | undefined): Record<string, number> {
    const ownerId = normalizeOwnerId(ownerIdRaw);
    const ownerType = 'anonymous';
    const counts = (table: string) => `
      (SELECT COUNT(*) FROM ${table}
        WHERE owner_type = ${SqliteClient.sqlLiteral(ownerType)}
          AND owner_id = ${SqliteClient.sqlLiteral(ownerId)})`;
    const query = `
      SELECT
        ${counts('flashcards')} AS flashcards,
        ${counts('sentence_analyses')} AS sentence_analyses,
        ${counts('reading_contents')} AS reading_contents,
        ${counts('quiz_attempts')} AS quiz_attempts,
        ${counts('learning_reports')} AS learning_reports;
    `;
    const rows = this.query<Record<string, number>>('migration', 'status_counts', query);
    return rows[0] || {
      flashcards: 0,
      sentence_analyses: 0,
      reading_contents: 0,
      quiz_attempts: 0,
      learning_reports: 0,
    };
  }

  runBackfill(ownerIdRaw: string | undefined, payload: BackfillPayload): Record<string, number> {
    const flashcards = Array.isArray(payload.flashcards) ? payload.flashcards.slice(0, 500) : [];
    const sentenceHistory = Array.isArray(payload.sentenceHistory) ? payload.sentenceHistory.slice(0, 300) : [];
    const readingHistory = Array.isArray(payload.readingHistory) ? payload.readingHistory.slice(0, 300) : [];
    const testHistory = Array.isArray(payload.testHistory) ? payload.testHistory.slice(0, 300) : [];
    const reportHistory = Array.isArray(payload.reportHistory) ? payload.reportHistory.slice(0, 200) : [];

    if (flashcards.length > 0) {
      this.persistFlashcards(ownerIdRaw, flashcards);
    }
    sentenceHistory.forEach(item => {
      if (typeof item.sentence === 'string') {
        this.persistSentenceAnalysis(ownerIdRaw, item.sentence, item.result);
      }
    });
    readingHistory.forEach(item => {
      if (typeof item.english === 'string' && typeof item.chinese === 'string') {
        this.persistReadingContent(ownerIdRaw, {
          language: item.generationConfig?.language || 'en',
          topic: item.generationConfig?.topic || 'general',
          difficulty: item.generationConfig?.difficulty || 'medium',
          length: item.generationConfig?.length || 'medium',
          title: item.title,
          english: item.english,
          chinese: item.chinese,
          vocabulary: Array.isArray(item.vocabulary) ? item.vocabulary : [],
        });
      }
    });
    testHistory.forEach(item => {
      if (item.type === 'reading' || item.type === 'vocabulary') {
        this.persistQuizResult(ownerIdRaw, item);
      }
    });
    reportHistory.forEach(item => {
      this.persistLearningReport(ownerIdRaw, item.templateType || 'weekly', item);
    });

    return {
      flashcards: flashcards.length,
      sentenceHistory: sentenceHistory.length,
      readingHistory: readingHistory.length,
      testHistory: testHistory.length,
      reportHistory: reportHistory.length,
    };
  }
}

export const learningDataRepository = new LearningDataRepository();
