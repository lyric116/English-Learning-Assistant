# Progress Log

## 2026-02-25 (complete/p1-05-input-system-unification)

### Completed
- Completed `P1-05` (input component style unification).
- Added shared form-control style tokens in `client/src/components/ui/form-control.ts`.
- Added reusable `Input` component and aligned `Textarea` / `Select` to the same base style contract:
  - consistent border, focus-visible ring, disabled style, spacing
  - optional `error` state support
- Refactored `SettingsDialog`:
  - switched native inputs to shared `Input`
  - added field-level validation and inline error messages for API Key / Base URL / Model
  - added `aria-invalid` state wiring and error-clearing on input change
- This aligns form behavior across settings dialog, flashcards input area, and reading input area.

### Validation Performed
- `cd client && npm run lint` ✅
- `cd client && npm run build` ✅

### Notes For Next Developer
- `P1-05` is complete; form controls now share one style baseline and visible error states.
- Next step is `P1-06` (feedback component style unification).

## 2026-02-25 (complete/p1-04-button-system-unification)

### Completed
- Completed `P1-04` (button style unification).
- Refactored shared `Button` component to standardize:
  - primary / secondary / destructive / ghost variants
  - consistent hover/active/disabled/focus-visible states
  - normalized button heights across `sm/md/lg`
- Introduced `secondary` as the canonical secondary action variant, and migrated page usages from `outline` to `secondary`.
- Removed remaining page-level style override on homepage primary CTA to keep button behavior sourced from the shared component.

### Validation Performed
- `cd client && npm run lint` ✅
- `cd client && npm run build` ✅

### Notes For Next Developer
- `P1-04` is complete; shared button behavior is now centrally controlled in `client/src/components/ui/Button.tsx`.
- Next step is `P1-05` (input component style unification).

## 2026-02-25 (followup/p1-03-all-module-reconciliation)

### Completed
- Performed a full-module re-audit for `P1-03` after user feedback (not limited to Home/Flashcards/Sentence).
- Applied missed readability/visibility fixes in remaining modules:
  - `ReadingPage`: action icons no longer depend on hover-only visibility (now visible in baseline state).
  - `QuizPage`: keyboard hint text no longer hidden by `opacity-0 group-hover` pattern.
- Final scope now covers all five modules:
  - Flashcards, Sentence, Reading, Quiz, Achievements (Achievements verified as no additional contrast fix required).

### Validation Performed
- `cd client && npm run lint` ✅
- `cd client && npm run build` ✅

### Notes For Next Developer
- `P1-03` should be considered fully reconciled at cross-module level.
- Continue with `P1-04` (button style unification).

## 2026-02-25 (complete/p1-03-contrast-readability-audit)

### Completed
- Completed `P1-03` (contrast audit for light/dark readability).
- Raised low-contrast key text in flashcards:
  - front phonetic text from semi-transparent muted to readable muted color
  - flip hint text from weak opacity to readable muted color
  - back-side phonetic and progress counter from low-opacity muted to readable muted color
- Raised low-contrast key text/icon hints on home + sentence analysis:
  - home "coming soon" action text no longer uses reduced opacity
  - home step-arrow separator icon uses stronger muted contrast
  - sentence analysis detail label no longer uses opacity-based dimming

### Validation Performed
- `cd client && npm run lint` ✅
- `cd client && npm run build` ✅

### Notes For Next Developer
- `P1-03` is completed with practical readability fixes on real user-facing pages.
- Next step is `P1-04`.

## 2026-02-25 (complete/p1-02-typography-hierarchy)

### Completed
- Completed `P1-02` (typography hierarchy normalization).
- Added typography token variables and shared classes in `client/src/index.css`:
  - size tokens for display/h1/h2/h3/body-lg/body/body-sm/label
  - line-height tokens (`tight/heading/body/dense`)
  - reusable classes (`.typo-display`, `.typo-h*`, `.typo-body*`, `.typo-label`)
- Replaced scattered text sizing in key pages:
  - Home: hero title/body, feature card title/body, step title/body
  - Reading: article title, EN/ZH paragraph body, vocabulary title/body, favorites title
  - Quiz: selection card title/body, question title, result title, review title
- Added `break-words` to long textual blocks in Reading/Quiz to reduce mobile overflow risk.

### Validation Performed
- `cd client && npm run lint` ✅
- `npm run build` ✅

### Notes For Next Developer
- `P1-02` is completed on top of P1 token baseline.
- Next step is `P1-03` (contrast audit for light/dark readability).

## 2026-02-25 (complete/p1-01-design-tokens)

### Completed
- Completed `P1-01` (global design token foundation).
- Added token system in `client/src/index.css`:
  - spacing (`--ds-space-*`)
  - radius (`--ds-radius-*`)
  - elevation (`--ds-shadow-*`)
  - motion (`--ds-duration-*`, `--ds-ease-standard`)
  - z-index (`--ds-z-*`)
  - semantic surfaces (`--ds-surface-*`)
- Added shared token-driven surface classes:
  - `.ds-card`
  - `.ds-glass-panel`
  - `.home-hero-shell`
  - `.home-feature-card`
  - `.home-step-card`
  - `.app-navbar`
- Applied token usage to required pages:
  - Home page (`client/src/pages/HomePage.tsx`)
  - Business page: Flashcards (`client/src/pages/FlashcardsPage.tsx`)
  - Shared card primitive (`client/src/components/ui/Card.tsx`)
  - Navbar z-layer (`client/src/components/layout/Navbar.tsx`)

### Validation Performed
- `cd client && npm run lint` ✅
- `npm run build` ✅

### Notes For Next Developer
- `P1-01` completed with token definitions + real page usage evidence.
- Next step is `P1-02` (typography hierarchy normalization) on top of the new token baseline.

## 2026-02-25 (complete/p0-04-functional-baseline)

### Completed
- Completed `P0-04` by running end-to-end module-level API flows with real provider config from local `.env`.
- Added concrete success evidence into `code/functional_baseline.md` for all five modules:
  - Flashcards (`/flashcards/extract`) success
  - Sentence (`/sentence/analyze`) success
  - Reading (`/reading/generate`) success
  - Quiz (`/quiz/reading-questions` + `/quiz/vocabulary-questions`) success
  - Achievements (`/report/generate`) success
- Updated tracker pointer:
  - `P0-04` -> `completed`
  - next pending step -> `P1-01`

### Validation Performed
- Elevated runtime checks (real provider config):
  - `POST /api/v1/reading/generate` -> `200` ✅
  - `POST /api/v1/quiz/reading-questions` -> `200` ✅
  - `POST /api/v1/quiz/vocabulary-questions` -> `200` ✅
  - `POST /api/v1/report/generate` -> `200` ✅

### Notes For Next Developer
- Phase 0 core baseline steps are now all completed (`P0-01` ~ `P0-08`).
- Execution should continue from `P1-01` (design tokens).

## 2026-02-25 (bugfix/flashcards-sentence-timeout-and-json-parse)

### Completed
- Fixed AI upstream non-JSON parsing failure that produced server log:
  - `Unexpected token '<', "<!doctype "... is not valid JSON`.
- Improved AI gateway resilience in `server/src/services/ai-service.ts`:
  - Added `safeReadJson()` to safely parse upstream payloads.
  - Added explicit error for non-JSON success responses.
  - Improved non-JSON error body extraction and sanitization.
- Hardened JSON extraction fallback in `server/src/utils/json-parser.ts`:
  - Secondary boundary parse now throws stable domain error (`无法解析 AI 返回的 JSON 数据`) instead of leaking raw `JSON.parse` token errors.
- Mitigated timeout pressure for flashcards/sentence:
  - Raised backend AI timeout default to `90s` (`server/src/config.ts`).
  - Raised frontend request timeout to `95s` (`client/src/lib/api.ts`).
  - Added stricter request-size validation:
    - flashcards text max `8000` chars
    - sentence max `1000` chars
- Extended error status inference for validation-like messages in `server/src/middleware/error-handler.ts`.

### Validation Performed
- `cd server && npm run build` ✅
- `cd client && npm run lint` ✅
- `npm run build` ✅
- Runtime smoke checks against running local server:
  - `GET /api/v1/health` -> `200` ✅
  - `POST /api/v1/flashcards/extract` with oversized text -> `400` + clear length message ✅
  - `POST /api/v1/sentence/analyze` with empty sentence -> `400` + clear validation message ✅
  - `POST /api/v1/ai/test` using local `.env` provider config -> `200` (`success: true`) ✅
  - `POST /api/v1/flashcards/extract` with valid `.env` provider config -> `200` (no timeout) ✅
  - `POST /api/v1/sentence/analyze` with valid `.env` provider config -> `200` (no timeout) ✅

### Notes For Next Developer
- User-reported issue scope: flashcards + sentence timeout and upstream parse instability.
- If real API still times out in production, next tuning options:
  - lower prompt complexity or max tokens for those two modules
  - provider/model-specific timeout override
  - optional single retry strategy only for timeout branch

## 2026-02-25 (plan-reconciliation-and-phase0-advance)

### Completed
- Reconciled `memory_bank/execution_tracker.md` against the full 65-step plan.
  - Explicitly marked `P4-01` as `completed (out-of-order)`.
  - Marked all remaining steps as `completed / partial / pending` one-by-one.
- Continued execution from early-phase pending items:
  - `P0-02` completed: dependency baseline verified with `npm ls --depth=0` at root/client/server.
  - `P0-03` completed: quality baseline rerun and passed.
  - `P0-06` completed: added target user personas document at `code/target_users.md`.
  - `P0-07` completed: added brand guideline document at `code/brand_guidelines.md`.
  - `P0-08` completed: rewrote outdated `CLAUDE.md` to match current React + Express architecture.
- Advanced partial baseline steps with concrete artifacts:
  - `P0-04` remains partial, added baseline matrix at `code/functional_baseline.md`.
  - `P0-05` remains partial, completed elevated runtime checks for `/api/v1/health`, `/api/v1`, and `/api/v1/ai/test` failure branches.

### Validation Performed
- `npm ls --depth=0` (root) ✅
- `cd client && npm ls --depth=0` ✅
- `cd server && npm ls --depth=0` ✅
- `cd client && npm run lint` ✅
- `npm run build` ✅
- Elevated runtime checks:
  - `GET /api/v1/health` -> `200` ✅
  - `GET /api/v1` -> `200` ✅
  - `POST /api/v1/ai/test` with `{}` -> `400` ✅
  - `POST /api/v1/ai/test` with dummy config -> `502` ✅
- Git safety snapshot:
  - `git diff > /tmp/english-learning_wip_2026-02-25.patch` ✅

### Notes For Next Developer
- First incomplete plan item is still `P0-04` (partial). Full manual UI walkthrough + successful AI-path evidence still needed.
- `P0-05` needs one real valid-key success sample to become fully completed.

## 2026-02-25 (feat/mvp-core-closure)

### Completed
- Continued implementation based on current tracker by landing `P4-01` (strict request validation for API layer).
- Added unified backend validator: `server/src/utils/request-validator.ts`.
  - Added `ValidationError` for deterministic 400 responses.
  - Added request validators for all AI-facing endpoints:
    - `flashcards/extract`
    - `sentence/analyze`
    - `reading/generate`
    - `quiz/reading-questions`
    - `quiz/vocabulary-questions`
    - `report/generate`
    - `ai/test`
  - Added normalization/constraints for key fields (required strings, enum checks, integer range checks, array bounds).
- Refactored route handlers to use validator outputs instead of ad-hoc inline checks.
- Updated global error middleware to explicitly recognize `ValidationError` and return HTTP 400.

### Validation Performed
- `cd server && npm run build` ✅
- `cd client && npm run lint` ✅
- `npm run build` ✅

### Notes For Next Developer
- This pass focuses on `P4-01` only; response envelope and error-code unification (`P4-02`) is still pending.
- Validation currently enforces non-empty `vocabulary` array for vocabulary quiz generation; UI already handles backend error and toast feedback.

## 2026-02-24 (feat/mvp-core-closure)

### Completed
- Created implementation branch: `feat/mvp-core-closure`.
- Added tracker file: `memory_bank/execution_tracker.md` with Step `P0-01` completion record.
- Added MVP execution constraints to `memory_bank/implement_plan.md` to align with lyricx confirmation.
- Implemented Settings + AI gateway hardening:
  - Client-side `baseUrl` validation (`protocol`, `auth info`, `local/private network` restrictions).
  - Daily AI call counter and over-limit manual confirmation (default `50/day`).
  - Anonymous local session ID generation and request header propagation.
  - Request timeout handling on client and server (with readable timeout errors).
  - Server-side error message sanitization (no API key/token leakage in logs/errors).
- Implemented basic routing improvements:
  - Added `GET /api/v1` endpoint with route summary.
  - Added API 404 fallback for unknown `/api/v1/*` routes.
  - Added frontend `*` route and `NotFoundPage`.
- Implemented one-module closed loop (Reading -> Quiz -> Storage):
  - Persist current reading context into local storage.
  - Quiz page restores context after refresh.

### Validation Performed
- `cd client && npm run lint` ✅
- `cd client && npm run build` ✅
- `cd server && npm run build` ✅
- `npm run build` (repo root) ✅
- Smoke attempt (`start server + curl /api/v1/health`) ⚠️ blocked in sandbox (`listen EPERM`), not a code regression.

### Notes For Next Developer
- Existing workspace has unrelated changes from owner:
  - deleted: `AGENTS.md`, `agent.md`
  - untracked: `memory_bank/`
- No destructive git operations were used.
