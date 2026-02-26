# Release Preflight Checklist

Date: 2026-02-26  
Owner: Codex

## 1. Code Quality Gate
- [ ] `cd server && npm run build`
- [ ] `cd server && npm run test`
- [ ] `cd server && npm run test:e2e-flow`
- [ ] `cd client && npm run lint`
- [ ] `cd client && npm run build`
- [ ] `cd client && npm run test`

## 2. Configuration & Security
- [ ] `.env` does not contain placeholder invalid keys in production deployment.
- [ ] `ALLOWED_AI_HOSTS` is set for production.
- [ ] `ALLOW_PRIVATE_AI_HOSTS` remains disabled in production.
- [ ] Rate limit config aligns with expected traffic (`RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX_REQUESTS`).

## 3. Data & Migration Safety
- [ ] Run migration once on target DB: `cd server && npm run db:migrate`.
- [ ] Verify no migration checksum drift in `schema_migrations`.
- [ ] Confirm backfill route not repeatedly triggered in startup flow (`migration-backfill-v1` idempotency mark).

## 4. Observability Readiness
- [ ] Confirm response headers include `x-trace-id`.
- [ ] Confirm logs include:
  - `http.request.complete`
  - `ai.request.completed` / `ai.request.failed`
  - `http.request.failed`
- [ ] Verify one failure case can be traced end-to-end with same `traceId`.

## 5. Manual Smoke (Production-like)
- [ ] Flashcards extract and history replay.
- [ ] Sentence analyze and history replay.
- [ ] Reading generate -> quiz generate -> report generate chain.
- [ ] Achievements report share copy works.
- [ ] Error path shows code-aware message (e.g. timeout/upstream failure).
