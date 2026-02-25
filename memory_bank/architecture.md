# Architecture Notes (MVP Core Closure)

## Update 2026-02-25: Reading Parameter Extension (`P2-R-01`)

### `client/src/pages/ReadingPage.tsx`
- Role: reading-generation parameter entry and session viewer.
- Changes:
  - added generation controls for:
    - language direction (`en/zh`)
    - topic
    - difficulty
    - length
  - validates selected options before request dispatch
  - stores applied generation config in result/history (`generationConfig`)
  - surfaces active config chips in input and result panels

### `client/src/lib/api.ts`
- Role: client request boundary for reading module.
- Changes:
  - `reading.generate` now supports structured options payload
  - backward-compatible call form retained (`language` string still accepted)

### `client/src/types/index.ts`
- Role: shared domain model for reading data.
- Changes:
  - added reading config unions/types:
    - `ReadingLanguage`
    - `ReadingTopic`
    - `ReadingDifficulty`
    - `ReadingLength`
    - `ReadingGenerationConfig`
  - `ReadingContent` now can carry `generationConfig` metadata

### Architectural Impact
- Reading generation is no longer single-parameter; it now has a typed multi-parameter contract at the client boundary.

## Update 2026-02-25: Sentence Regression Closure (`P2-S-05`)

### `code/sentence_regression_checklist.md`
- Role: sentence module regression execution record.
- Scope captured:
  - input/analyze flow
  - contract normalization stability
  - word hover panel
  - grammar-phrase linkage
  - study-note export + history persistence
  - error feedback and recovery
- Gate evidence:
  - `cd server && npm run build`
  - `cd client && npm run lint`
  - `cd client && npm run build`

### Reliability Impact
- Sentence module step set (`P2-S-01` ~ `P2-S-05`) now has a complete closure artifact chain.
- Future sentence regressions can be audited against a single checklist baseline.

## Update 2026-02-25: Sentence Study Note Export (`P2-S-04`)

### `client/src/pages/SentenceAnalysisPage.tsx`
- Role: sentence analysis export and knowledge capture surface.
- Changes:
  - added `buildStudyNote` formatter to output human-readable note text (not raw JSON)
  - added `exportStudyNote` action:
    - copies note to clipboard
    - persists note snapshot into localStorage (`sentenceNotesHistory`)
  - added note-history UI block in history section:
    - shows exported sentence notes with timestamps
    - supports one-click re-copy and clear-history action
- Architectural impact:
  - sentence analysis now has an explicit “analysis -> note -> reuse” persistence loop.

## Update 2026-02-25: Grammar-Phrase Linkage (`P2-S-03`)

### `client/src/pages/SentenceAnalysisPage.tsx`
- Role: sentence grammar interaction coordinator.
- Changes:
  - added `activeGrammarIndex` state as grammar-linkage source of truth
  - grammar items are now interactive toggles (select/deselect)
  - introduced `linkedPhraseIndexes` derived set:
    - keyword matching across grammar `title/tags` and phrase `text/category/function/explanation`
    - fallback to index linkage when no keyword hit exists
  - phrase list now supports linked-highlight visual state and “已关联” marker
  - added dedicated active-grammar explanation panel with linked phrase chips
- UX impact:
  - users can navigate from abstract grammar points to concrete text fragments in one click.

## Update 2026-02-25: Sentence Word Hover Panel (`P2-S-02`)

### `client/src/pages/SentenceAnalysisPage.tsx`
- Role: sentence analysis interaction surface.
- Changes:
  - added token-normalization utility (`normalizeToken`) and tokenized sentence rendering
  - sentence text now contains interactive tokens (hover/click) mapped to normalized word data
  - introduced `activeWordKey` state + closable detail panel for per-word explanation
  - detail panel exposes `meaning`, `partOfSpeech`, `role` and supports manual close
- Reliability impact:
  - punctuation/case variance no longer breaks per-word matching
  - interaction works with both `text` and `lemma` lookup keys, reducing AI key mismatch risk.

## Update 2026-02-25: Sentence Contract Extension (`P2-S-01`)

### `client/src/types/index.ts`
- Role: sentence domain contract source for frontend.
- Changes:
  - sentence model refactored into explicit sub-types:
    - `SentenceWordInfo`
    - `SentencePhrase` (`category/function`)
    - `SentenceGrammarPoint` (`title/tags`)
    - clause connector + structure pattern fields
- Architectural impact:
  - field naming is now consistent and semantically specific, reducing ad-hoc page parsing.

### `server/src/routes/sentence.ts`
- Role: sentence analysis response normalization boundary.
- Changes:
  - added normalization layer that maps heterogeneous AI keys into one stable response shape
  - supports backward-compatible key mapping:
    - `point -> title`
    - `type -> category` (phrases)
    - `pos -> partOfSpeech`
    - `word/token -> text`, etc.
  - returns safe defaults when fields are missing to prevent client crash-on-null scenarios

### `server/src/utils/prompt-builder.ts`
- Role: sentence task output contract guidance.
- Changes:
  - upgraded prompt schema to request:
    - word-level array (`words`)
    - phrase category/function
    - grammar tags
    - structure pattern + clause connector
- Architectural impact:
  - prompt contract and route normalizer now align, reducing parse fragility.

### `client/src/pages/SentenceAnalysisPage.tsx`
- Role: sentence analysis consumer + local history viewer.
- Changes:
  - added client-side normalizer for API result and legacy local history records
  - added word-level information section rendering
  - switched phrase and grammar rendering to normalized names (`category`, `title`, `tags`)
- Reliability impact:
  - page rendering no longer depends on one exact AI raw key naming style.

## Update 2026-02-25: Flashcards Regression Closure (`P2-F-06`)

### `code/flashcards_regression_checklist.md`
- Role: flashcards module regression execution artifact.
- Scope captured:
  - extraction parameter/contract checks
  - flip/navigation behavior checks
  - tri-state state transition checks
  - TTS trigger checks
  - localStorage persistence checks (`flashcards`, `flashcardSessionSummary`)
- Verification gate linkage:
  - ties module regression sign-off to concrete command evidence:
    - `cd client && npm run lint`
    - `npm run build`

### Reliability Impact
- Flashcards step set (`P2-F-01` to `P2-F-06`) now has an explicit closure record.
- Future regressions can diff against a single checklist artifact instead of scattered notes.

## Update 2026-02-25: Flashcard Session Stats + Achievements Sharing (`P2-F-05`)

### `client/src/types/index.ts`
- Role: shared domain type boundary.
- Changes:
  - added `FlashcardSessionSummary` contract for cross-page flashcard session metrics
  - standardizes fields used in flashcards runtime and achievements/report inputs

### `client/src/pages/FlashcardsPage.tsx`
- Role: flashcard session runtime + metric producer.
- Changes:
  - added session-state tracker (`sessionId/startedAt/extractedCount/reviewedKeys/correct/incorrect`)
  - derives required metrics:
    - `当次学习量` (`studiedCount`)
    - `当次正确率` (`accuracy`)
    - `待复习量` (`dueCount`)
  - persists summary to localStorage key `flashcardSessionSummary`
  - clears summary on empty session reset to prevent stale data reuse

### `client/src/pages/AchievementsPage.tsx`
- Role: report/history consumer for cross-module learning data.
- Changes:
  - reads and renders latest `flashcardSessionSummary` in history section
  - extends report payload (`learningData`) with flashcard session summary
  - updates share-text generator to include flashcard session metrics when present
  - report gate (`hasData`) now recognizes session summary as valid data source
- Architectural impact:
  - flashcard progress is now shareable across module boundaries without server-side persistence
  - report generation can reason over both aggregate flashcard set and the latest study session snapshot

## Update 2026-02-25: Flashcard Review Queue Strategy (`P2-F-04`)

### `client/src/pages/FlashcardsPage.tsx`
- Role: flashcard session queue orchestrator.
- Changes:
  - introduced derived queue layer over stored flashcards
  - queue sort strategy:
    - due-review first
    - status priority (`reviewing -> new -> mastered`)
    - earlier `nextReviewAt` first
  - navigation/progress/chip-list now read from queue order
  - state writes still target original storage index through queue mapping
- Reliability impact:
  - visual order can change by priority without breaking update correctness
  - enables future spaced-repetition scheduling without mutating persisted array order directly

## Update 2026-02-25: Flashcard Tri-State Operations (`P2-F-03`)

### `client/src/pages/FlashcardsPage.tsx`
- Role: flashcard session interaction controller.
- Changes:
  - added three direct learning-state actions:
    - `标记生词`
    - `加入复习`
    - `标记掌握`
  - added performance update function to recompute:
    - `reviewCount`
    - `accuracy`
    - `learningStatus`
    - `nextReviewAt`
  - state changes are persisted into localStorage-backed flashcard set immediately
- UX impact:
  - card metadata and history summary now react in real-time after each state action
  - user gets immediate toast confirmation for each status update

## Update 2026-02-25: Flashcard Extraction Parameter & Contract Upgrade (`P2-F-02`)

### `client/src/pages/FlashcardsPage.tsx`
- Role: flashcard extraction parameter entry and extraction flow orchestrator.
- Changes:
  - added UI control for extraction count (`maxWords`)
  - extraction now sends user-chosen `maxWords` + difficulty level
  - added client-side boundary check for invalid extraction count

### `client/src/lib/api.ts`
- Role: client API contract boundary.
- Changes:
  - flashcard extraction level typed to strict union (`all/cet4/cet6/advanced`)
  - keeps request body aligned with backend-validated extraction payload

### `server/src/utils/request-validator.ts`
- Role: backend extraction payload validation source.
- Changes:
  - flashcard extraction count range tightened from `1..50` to `1..30`
  - keeps extraction payload within practical generation limits

### `server/src/routes/flashcards.ts`
- Role: extraction response contract gateway.
- Changes:
  - added response normalizer for AI extraction output
  - enforces stable word schema on route boundary
  - introduces explicit failures for invalid AI return shape / empty valid extraction results

## Update 2026-02-25: Flashcard Model Extension (`P2-F-01`)

### `client/src/types/index.ts`
- Role: frontend domain contract registry.
- Changes:
  - extended `Word` with learning lifecycle fields:
    - `learningStatus`
    - `nextReviewAt`
    - `accuracy`
    - `reviewCount`
  - added `WordLearningStatus` type alias

### `client/src/pages/FlashcardsPage.tsx`
- Role: flashcard extraction + study runtime.
- Changes:
  - added V2 model guard + normalizer for incoming/stored words
  - added one-shot legacy localStorage migration to keep old datasets readable
  - extraction result path now initializes new lifecycle fields
  - UI now renders lifecycle fields (status/accuracy/review count/next review)
  - history zone now summarizes status distribution and due-review count

### Compatibility Note
- Old `flashcards` localStorage payloads without lifecycle fields are auto-normalized at runtime.
- New payloads are persisted in V2 shape, enabling subsequent spaced-review logic steps.

## Update 2026-02-25: Motion & Responsive Polish (`P1-10`)

### `client/src/index.css`
- Role: global motion/responsive utility host.
- Changes:
  - added `animate-soft-pop` keyframe utility for result reveal
  - `module-section-shell` now uses unified enter animation
  - added `.tap-target` utility with mobile minimum hit-area (`40x40`)

### `client/src/components/layout/ModuleSection.tsx`
- Role: section scaffold animation coordinator.
- Changes:
  - added `index` prop to drive per-section staggered animation delay
  - keeps zone transition rhythm consistent across all module pages

### `client/src/pages/FlashcardsPage.tsx`
### `client/src/pages/SentenceAnalysisPage.tsx`
### `client/src/pages/ReadingPage.tsx`
### `client/src/pages/QuizPage.tsx`
### `client/src/pages/AchievementsPage.tsx`
- Role: business-module interaction surfaces.
- Changes:
  - applied section-level stagger order (`index`)
  - applied result reveal animation (`animate-soft-pop`) to core result blocks
  - applied `.tap-target` to high-frequency icon controls for better mobile touch reliability

## Update 2026-02-25: Five-Module Framework Unification (`P1-09`)

### `client/src/components/layout/ModuleSection.tsx`
- Role: shared module-page zone scaffold.
- Changes:
  - introduces explicit zone semantics (`input/result/history/action`)
  - standardizes zone label, title, and description structure
  - provides one reusable scaffold for cross-module consistency

### `client/src/index.css`
- Role: global style registry for layout primitives.
- Changes:
  - added `module-section-shell` and `module-section-label` styles
  - keeps section spacing and visual identity consistent across all modules

### `client/src/pages/FlashcardsPage.tsx`
- Role: vocabulary flashcard learning workflow.
- Changes:
  - reorganized into four zones with stable order
  - added explicit history summary and session action controls

### `client/src/pages/SentenceAnalysisPage.tsx`
- Role: sentence parsing and grammar explanation workflow.
- Changes:
  - reorganized into four zones with stable order
  - moved recent analyses into dedicated history zone
  - added explicit action zone (rerun/copy/reset/clear history)

### `client/src/pages/ReadingPage.tsx`
- Role: bilingual reading generation workflow.
- Changes:
  - reorganized into four zones with stable order
  - reading favorites grouped into dedicated history zone
  - operation toolbar moved into dedicated action zone

### `client/src/pages/QuizPage.tsx`
- Role: quiz generation/answer/result workflow.
- Changes:
  - reorganized into four zones with stable order
  - added persistent local test-history rendering in history zone
  - added dedicated action zone for stage transitions/navigation

### `client/src/pages/AchievementsPage.tsx`
- Role: report generation and review workflow.
- Changes:
  - reorganized into four zones with stable order
  - local report history now read + reloadable (previously write-only)
  - report actions centralized in dedicated action zone

## Update 2026-02-25: Homepage IA Refresh (`P1-08`)

### `client/src/pages/HomePage.tsx`
- Role: top-level product entry and conversion/navigation gateway.
- Changes:
  - rebuilt hero section with explicit product positioning and two-level CTA hierarchy
  - added quick-signal cards to communicate onboarding speed and loop closure
  - added explicit five-module entry map with direct navigation actions
  - added guided learning path section and scenario-based starting recommendations
- Architectural impact:
  - homepage now carries clear "what this product is" + "what to click next" responsibilities
  - reduces entry ambiguity for first-time mobile and desktop users

## Update 2026-02-25: Navigation & Shell Refactor (`P1-07`)

### `client/src/components/layout/Navbar.tsx`
- Role: global route navigation + theme/settings controls.
- Changes:
  - unified desktop/mobile spacing and active-link behavior
  - mobile navigation now uses overlay + panel collapse pattern
  - all module entries preserved in mobile panel; settings entry available in mobile/desktop paths
  - mobile open state now controls document scroll lock for stable interaction

### `client/src/components/layout/Footer.tsx`
- Role: global bottom navigation and product identity footer.
- Changes:
  - redesigned into shell-consistent surface with quick links to all five modules
  - keeps navigation discoverability beyond top navbar context

### `client/src/components/layout/Layout.tsx`
- Role: page frame composition root.
- Changes:
  - switched to explicit shell/main structure using shared `app-shell` + `app-main` classes
  - centralizes cross-page spacing and max-width behavior

### `client/src/index.css`
- Role: global design token and shell style registry.
- Changes:
  - added shell classes:
    - `app-navbar-shell`
    - `app-shell` (+ dark-mode variant)
    - `app-main` (+ responsive width/padding rules)
  - aligns navbar/footer/layout visual hierarchy under one style contract

## Update 2026-02-25: Feedback System Unification (`P1-06`)

### `client/src/components/ui/LoadingSpinner.tsx`
- Role: canonical loading-state renderer.
- Changes:
  - moved to shared panel-like loading surface with consistent spacing/copy hierarchy

### `client/src/components/ui/EmptyState.tsx`
- Role: canonical no-data/no-result renderer.
- Changes:
  - standardized empty-state container surface and icon/body text treatment

### `client/src/components/ui/Toast.tsx`
- Role: global transient feedback channel.
- Changes:
  - switched from solid blocks to semantic bordered tones with light/dark parity
  - improved responsive container spacing and dismiss button consistency

### `client/src/components/ui/Skeleton.tsx`
- Role: shared placeholder primitive.
- Changes:
  - unified muted shimmer baseline for cross-page consistency

### `client/src/components/ui/FeedbackAlert.tsx`
- Role: reusable inline status/error prompt component.
- Changes:
  - supports `success/error/warning/info` tones
  - provides dismissible inline message surface with semantic role mapping

### `client/src/pages/FlashcardsPage.tsx`
### `client/src/pages/SentenceAnalysisPage.tsx`
### `client/src/pages/ReadingPage.tsx`
### `client/src/pages/QuizPage.tsx`
### `client/src/pages/AchievementsPage.tsx`
- Role: five business modules consuming unified feedback system.
- Changes:
  - each page now stores request error message state and renders `FeedbackAlert` near top-level content
  - preserves existing toast behavior while adding persistent on-page error visibility
  - keeps loading/empty states on shared updated primitives

## Update 2026-02-25: Input System Unification (`P1-05`)

### `client/src/components/ui/form-control.ts`
- Role: centralized style contract for all form-like controls.
- Changes:
  - defines shared base/default/error class sets
  - keeps input/textarea/select visual behavior synchronized

### `client/src/components/ui/Input.tsx`
- Role: reusable single-line form input primitive.
- Changes:
  - built on shared form-control contract
  - supports `error` state for visible invalid styling

### `client/src/components/ui/Textarea.tsx`
- Role: multiline input primitive used by module input panels.
- Changes:
  - migrated to shared form-control contract
  - added `error` prop support while preserving textarea-specific sizing behavior

### `client/src/components/ui/Select.tsx`
- Role: dropdown primitive used across pages/settings.
- Changes:
  - migrated to shared form-control contract
  - added `error` prop support

### `client/src/components/settings/SettingsDialog.tsx`
- Role: AI configuration form with validation and persistence.
- Changes:
  - switched native inputs to shared `Input` component
  - added explicit field-level validation and inline error messaging
  - wired `aria-invalid` for invalid fields and input-change error clearing
  - keeps "test/save" paths using one validation source

### `client/src/pages/FlashcardsPage.tsx` + `client/src/pages/ReadingPage.tsx`
- Role: core module text input flows.
- Architectural impact:
  - these pages now inherit updated shared `Textarea` / `Select` styles automatically
  - no page-level form style duplication needed

## Update 2026-02-25: Button System Unification (`P1-04`)

### `client/src/components/ui/Button.tsx`
- Role: single source of truth for all shared CTA/button interactions.
- Changes:
  - standardized variants: `default` (primary), `secondary`, `destructive`, `ghost`
  - preserved `outline` as compatibility alias while migrating usages to `secondary`
  - unified focus-visible ring, hover/active transitions, and disabled behavior
  - normalized heights for `sm/md/lg` to remove page-level size drift

### `client/src/pages/ReadingPage.tsx`
- Role: reading workflow actions (view toggle, speak, favorite, generate quiz).
- Changes:
  - migrated secondary actions from `outline` to shared `secondary` variant
  - keeps all button interactions aligned with global button system

### `client/src/pages/QuizPage.tsx`
- Role: quiz result/review actions.
- Changes:
  - migrated review/reset actions from `outline` to shared `secondary` variant

### `client/src/components/settings/AIConfigBanner.tsx`
- Role: AI setup entry-point action.
- Changes:
  - migrated configuration entry button from `outline` to shared `secondary` variant

### `client/src/components/settings/SettingsDialog.tsx`
- Role: settings control actions (test/save/clear).
- Changes:
  - migrated connection test action from `outline` to shared `secondary` variant

### `client/src/pages/HomePage.tsx`
- Role: top-level conversion CTA.
- Changes:
  - removed page-specific transition override; CTA now fully inherits shared button behavior

## Update 2026-02-25: `P1-03` Reconciliation Across All Modules

### `client/src/pages/ReadingPage.tsx`
- Role: bilingual reading flow with favorites and vocabulary actions.
- Changes:
  - action icon buttons (`remove favorite`, `speak vocabulary`) are now visible in baseline state instead of hover-only
  - improves readability/discoverability on touch devices and non-hover contexts

### `client/src/pages/QuizPage.tsx`
- Role: quiz answering flow with keyboard hint guidance.
- Changes:
  - fixed hidden keyboard hint text (`按 1-4`) by removing ineffective hover-only opacity rule
  - ensures hint remains readable for all interaction modes

### `client/src/pages/AchievementsPage.tsx`
- Role: report generation and progress visualization.
- Audit result:
  - no additional contrast remediation required in this pass; existing primary text/button contrast remained acceptable

## Update 2026-02-25: Contrast Readability Audit (`P1-03`)

### `client/src/pages/FlashcardsPage.tsx`
- Role: flashcard learning's primary readability surface (front/back card + progress indicator).
- Changes:
  - upgraded phonetic/hint/progress texts from low-opacity muted colors to readable muted colors
  - kept hierarchy intact while removing weak-contrast text states that were hard to read in both themes

### `client/src/pages/HomePage.tsx`
- Role: entry hub for all learning modules and onboarding sequence.
- Changes:
  - "即将推出" action text now uses readable muted text without additional opacity dimming
  - step-connector arrow icon contrast increased to remain visible on light/dark backgrounds

### `client/src/pages/SentenceAnalysisPage.tsx`
- Role: detailed grammar analysis output surface.
- Changes:
  - component detail label moved from opacity-dimmed text to readable muted text
  - preserves visual hierarchy while reducing readability risk in dense analysis cards

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
