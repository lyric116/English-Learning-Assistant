export interface AuthUser {
  id: string;
  email: string;
  displayName?: string;
  status: string;
}

export interface AnonymousImportCounts {
  flashcards: number;
  sentenceHistory: number;
  readingHistory: number;
  quizHistory: number;
  reportHistory: number;
  reportShares: number;
}

export interface AuthSession {
  token: string;
  expiresAt: string;
  user: AuthUser;
  importedAnonymousData?: AnonymousImportCounts;
}

export const AUTH_SESSION_KEY = 'auth-session-v1';

const LEARNING_CACHE_KEYS = [
  'flashcards',
  'flashcardSessionSummary',
  'sentenceHistory',
  'readingHistory',
  'readingFavorites',
  'quizCurrentReading',
  'testHistory',
  'wrongQuestionBook',
  'reportHistory',
  'migration-backfill-v1',
];

function isAuthSession(value: unknown): value is AuthSession {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<AuthSession>;
  return typeof item.token === 'string'
    && item.token.length > 0
    && typeof item.expiresAt === 'string'
    && !!item.user
    && typeof item.user === 'object'
    && typeof item.user.id === 'string'
    && typeof item.user.email === 'string';
}

export function getAuthSession(storage: Pick<Storage, 'getItem'> = localStorage): AuthSession | null {
  try {
    const raw = storage.getItem(AUTH_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return isAuthSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function getAuthToken(storage: Pick<Storage, 'getItem'> = localStorage): string | null {
  return getAuthSession(storage)?.token ?? null;
}

export function saveAuthSession(session: AuthSession, storage: Pick<Storage, 'setItem'> = localStorage): void {
  storage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
}

export function clearAuthSession(storage: Pick<Storage, 'removeItem'> = localStorage): void {
  storage.removeItem(AUTH_SESSION_KEY);
}

export function clearLocalLearningCache(storage: Pick<Storage, 'removeItem'> = localStorage): void {
  LEARNING_CACHE_KEYS.forEach(key => storage.removeItem(key));
}
