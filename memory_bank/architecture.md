# Architecture Notes (MVP Core Closure)

## Frontend

### `client/src/lib/base-url.ts`
- Centralized client-side `baseUrl` validator.
- Responsibilities:
  - URL parse/format check
  - protocol allowlist (`http/https`)
  - reject embedded credentials
  - reject localhost/private network hosts
- Used by settings save/test flow before requests reach backend.

### `client/src/lib/ai-usage.ts`
- Manages local daily AI usage accounting.
- Responsibilities:
  - reset counter by local date
  - expose `used/remaining/limit`
  - increment usage count on each AI request
  - prompt user confirmation after daily limit is exceeded

### `client/src/lib/session.ts`
- Provides anonymous local session identity for MVP (no login system).
- Generates and persists `anonymous-session-id` in local storage.

### `client/src/lib/api.ts`
- API gateway for all client requests.
- New responsibilities:
  - inject `x-anonymous-session-id`
  - enforce request timeout with readable abort error
  - apply daily AI usage policy for POST AI routes
  - keep auto-injection of `aiConfig` for request body

### `client/src/components/settings/SettingsDialog.tsx`
- User-facing AI config control plane.
- New responsibilities:
  - call `validateBaseUrl` before save/test
  - normalize and trim saved config values
  - expose daily usage hint (`used/limit/remaining`)
  - improved accessibility (`label+id`, explicit `aria-label`)

### `client/src/pages/ReadingPage.tsx`
- Reading module producer side.
- New responsibility:
  - persist current reading context into local storage key `quizCurrentReading` when generating/loading/jumping to quiz.

### `client/src/pages/QuizPage.tsx`
- Quiz module consumer side.
- New responsibility:
  - restore current reading from `quizCurrentReading` when router state is absent (refresh-safe flow).

### `client/src/pages/NotFoundPage.tsx` + `client/src/App.tsx`
- Adds catch-all frontend routing guard.
- Unknown routes now land on a recoverable 404 page with return-home action.

## Backend

### `server/src/config.ts`
- Central config source now includes AI gateway settings:
  - `ai.requestTimeoutMs`
  - `ai.allowPrivateHosts`

### `server/src/services/ai-service.ts`
- Core AI gateway + business orchestration.
- New responsibilities:
  - strict `aiConfig` normalization
  - backend `baseUrl` validation with local/private host restrictions (unless explicitly allowed)
  - timeout-controlled upstream calls
  - upstream error sanitization (redact key/token patterns)
  - safe extraction of upstream error payload

### `server/src/middleware/error-handler.ts`
- Global error boundary.
- New responsibilities:
  - sanitize sensitive fragments before logging/responding
  - status mapping for config errors / timeout / upstream AI failures
  - generic 500 fallback for unknown internal errors

### `server/src/index.ts`
- API composition root.
- New responsibilities:
  - expose API index route (`GET /api/v1`)
  - standardized fallback for unknown API route (`/api/v1` namespace 404)

## Delivery Control Files

### `memory_bank/implement_plan.md`
- Contains phased transformation plan.
- Added MVP-trimmed constraints agreed by lyricx for execution order, quality gate, cost/safety boundary.

### `memory_bank/execution_tracker.md`
- Lightweight runbook-style step tracker.
- Holds per-step status/owner/time for handoff continuity.

### `memory_bank/progress.md`
- Change log with test evidence and known environment limitations.
