const SESSION_KEY = 'anonymous-session-id';

function generateFallbackId(): string {
  return `anon-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getAnonymousSessionId(): string {
  const existing = localStorage.getItem(SESSION_KEY);
  if (existing) return existing;

  const next = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : generateFallbackId();

  localStorage.setItem(SESSION_KEY, next);
  return next;
}
