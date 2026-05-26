export const BACKFILL_MARK_KEY = 'migration-backfill-v1';

export interface BackfillPayload {
  flashcards: unknown[];
  sentenceHistory: unknown[];
  readingHistory: unknown[];
  testHistory: unknown[];
  reportHistory: unknown[];
}

export function readLocalArray(storage: Pick<Storage, 'getItem'>, key: string): unknown[] {
  try {
    const raw = storage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function collectBackfillPayload(storage: Pick<Storage, 'getItem'>): BackfillPayload {
  return {
    flashcards: readLocalArray(storage, 'flashcards'),
    sentenceHistory: readLocalArray(storage, 'sentenceHistory'),
    readingHistory: readLocalArray(storage, 'readingHistory'),
    testHistory: readLocalArray(storage, 'testHistory'),
    reportHistory: readLocalArray(storage, 'reportHistory'),
  };
}

export function hasBackfillData(payload: BackfillPayload): boolean {
  return payload.flashcards.length
    + payload.sentenceHistory.length
    + payload.readingHistory.length
    + payload.testHistory.length
    + payload.reportHistory.length > 0;
}

