# Architecture Notes (MVP Core Closure)

## Update 2026-02-25: Typography Hierarchy (`P1-02`)

### `client/src/index.css`
- Added typography token layer:
  - font-size tokens (`display/h1/h2/h3/body-lg/body/body-sm/label`)
  - line-height tokens (`tight/heading/body/dense`)
- Added reusable typography classes:
  - `.typo-display`
  - `.typo-h1`, `.typo-h2`, `.typo-h3`
  - `.typo-body-lg`, `.typo-body`, `.typo-body-sm`
  - `.typo-label`
- Result: title/body semantics are now centralized instead of page-level ad-hoc text classes.

### `client/src/pages/HomePage.tsx`
- Hero, feature cards, and onboarding blocks now consume standardized typography classes.
- This page becomes the reference implementation for marketing/info hierarchy.

### `client/src/pages/ReadingPage.tsx`
- Reading title, bilingual paragraph body, and vocabulary section typography are standardized.
- Added `break-words` on long text blocks to improve small-screen robustness.

### `client/src/pages/QuizPage.tsx`
- Question titles, result titles, and review headers now use the standardized hierarchy.
- Improves consistency between practice and result phases.

## Update 2026-02-25: Design Token Foundation (`P1-01`)

### `client/src/index.css`
- Added centralized design tokens under `:root` / `.dark`:
  - spacing, radius, shadows, motion timing, z-index, semantic surfaces.
- Added token-driven shared classes (`.ds-card`, `.ds-glass-panel`, `.home-*`, `.app-navbar`).
- Existing flashcard primitives were partially switched from hard-coded values to token values (radius/shadow/transition/z-index/progress animation).

### `client/src/components/ui/Card.tsx`
- Card primitive now includes `ds-card`, making tokenized radius/shadow/transition available app-wide without page-level duplication.

### `client/src/pages/HomePage.tsx`
- Home hero, feature cards, and onboarding section now consume token-driven classes (`home-hero-shell`, `home-feature-card`, `home-step-card`, `ds-glass-panel`).
- Confirms the token layer is used by the homepage per plan requirement.

### `client/src/pages/FlashcardsPage.tsx`
- Input panel now uses `ds-glass-panel`.
- Together with tokenized flashcard CSS primitives, this confirms business-module token adoption.

### `client/src/components/layout/Navbar.tsx`
- Added `app-navbar` hook class for z-index token wiring.

## Update 2026-02-25: Functional Baseline Closure (`P0-04`)

### `code/functional_baseline.md`
- Upgraded from partial baseline notes to full cross-module evidence log.
- File now acts as the Phase 0 verification artifact for:
  - flashcards
  - sentence analysis
  - reading generation
  - quiz generation (reading + vocabulary)
  - achievements report generation
- Each module includes success-path API evidence and observed latency to support future regression comparison.

## Update 2026-02-25: Timeout & Upstream JSON Parse Bugfix

### `server/src/services/ai-service.ts`
- Added `safeReadJson()` abstraction to decouple transport response reading from strict JSON parsing.
- File responsibilities were extended with:
  - safe fallback when upstream returns non-JSON payload (HTML/text)
  - normalized error extraction for non-2xx responses
  - explicit non-JSON success-response guard (`AI 上游返回非 JSON 内容...`)
- Result: prevents raw `Unexpected token '<'` propagation and keeps error surface domain-specific.

### `server/src/utils/json-parser.ts`
- JSON boundary fallback now catches secondary parse failures and returns one stable business error.
- Result: avoids leaking raw parser token errors from malformed model output.

### `server/src/config.ts`
- Default AI request timeout raised from `45s` to `90s`.
- Rationale: reduce false timeout failures on heavier prompts (flashcards/sentence).

### `client/src/lib/api.ts`
- Client request timeout raised to `95s` to align with backend timeout and avoid client-abort-before-server-return races.

### `server/src/utils/request-validator.ts`
- Added tighter payload-size guardrails for timeout-prone modules:
  - flashcards text: max `8000`
  - sentence: max `1000`
- Result: pathological long inputs fail fast with readable 400 errors instead of long-running timeouts.

### `server/src/middleware/error-handler.ts`
- Validation-like message patterns (`不能为空` / `必须是` / `不支持`) now consistently map to 400.

## Update 2026-02-25: Phase-0 Planning Artifacts & Doc Alignment

### `code/target_users.md`
- New product-definition artifact for `P0-06`.
- Responsibilities:
  - define 3 concrete personas (exam / workplace / long-term learner)
  - define usage frequency assumptions per persona
  - define measurable success metrics for MVP tracking

### `code/brand_guidelines.md`
- New brand governance artifact for `P0-07`.
- Responsibilities:
  - standardize product positioning, tone, and CTA language
  - define color/visual baseline for upcoming UI refactors
  - constrain unsafe/misleading copy patterns

### `code/functional_baseline.md`
- New baseline runbook artifact for `P0-04/P0-05`.
- Responsibilities:
  - capture current module-by-module baseline status
  - preserve API smoke evidence and known environment blockers
  - provide an actionable handoff checklist for completing pending baseline steps

### `CLAUDE.md`
- Rewritten from obsolete vanilla-frontend instructions to current full-stack architecture.
- Responsibilities:
  - document actual runtime and build model (`dev:server` + `dev:client`)
  - map current frontend/backend/service boundaries
  - keep assistant contributors aligned with active technical stack

## Update 2026-02-25: Request Validation Layer (`P4-01`)

### `server/src/utils/request-validator.ts`
- New centralized validation boundary for HTTP request bodies.
- Responsibilities:
  - define `ValidationError` (client input fault)
  - parse and normalize common fields (`string/int/enum/array/object`)
  - validate and normalize optional/required `aiConfig`
  - export route-level validators with explicit contracts
- Why it matters:
  - moves input integrity checks out of route handlers
  - prevents malformed payloads from entering AI service calls
  - keeps validation rules reusable and testable

### `server/src/routes/flashcards.ts`
- Role update: now only orchestrates
  1) validate request via `validateFlashcardsExtractPayload`
  2) call `extractWords`
  3) return result / forward error
- No route-local business validation remains.

### `server/src/routes/sentence.ts`
- Uses `validateSentenceAnalyzePayload` before `analyzeSentence`.
- Route role is now pure transport + orchestration.

### `server/src/routes/reading.ts`
- Uses `validateReadingGeneratePayload` before `generateReadingContent`.
- Standardizes `language` and `text` contract before service layer.

### `server/src/routes/quiz.ts`
- Uses:
  - `validateReadingQuestionsPayload`
  - `validateVocabularyQuestionsPayload`
- Enforces bounds for `questionCount` and array constraints for vocabulary input.

### `server/src/routes/report.ts`
- Uses `validateReportGeneratePayload`.
- Ensures `reportType` and `learningData` shape are valid before AI report generation.

### `server/src/index.ts`
- `POST /api/v1/ai/test` now uses `validateAiTestPayload`.
- Keeps AI connectivity check behavior consistent with other endpoints' validation discipline.

### `server/src/middleware/error-handler.ts`
- Now recognizes `ValidationError` explicitly and returns HTTP 400.
- Reduces status inference ambiguity for input errors.

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
