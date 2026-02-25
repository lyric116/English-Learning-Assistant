# Architecture Notes (MVP Core Closure)

## Update 2026-02-25: Repository Layer Abstraction (`P3-05`)

### `server/src/repositories/sqlite-client.ts`
- Role: low-level SQLite execution adapter.
- Capabilities:
  - resolves DB path and sqlite binary
  - executes SQL scripts with foreign-key pragma
  - provides shared SQL literal escaping helper

### `server/src/repositories/learning-data-repository.ts`
- Role: module-oriented data access layer.
- Exposes write methods:
  - `persistFlashcards`
  - `persistSentenceAnalysis`
  - `persistReadingContent`
  - `persistQuizGeneration`
  - `persistLearningReport`
- Behavior:
  - normalizes owner context (`x-anonymous-session-id`)
  - swallows persistence failures to avoid blocking AI main flow
  - emits structured success/failure logs for traceability

### `server/src/utils/logger.ts`
- Role: structured log emitter for repository operations.
- Provides `info/warn/error` JSON log wrappers with timestamp and payload context.

### Route Wiring
- `server/src/routes/flashcards.ts`
- `server/src/routes/sentence.ts`
- `server/src/routes/reading.ts`
- `server/src/routes/quiz.ts`
- `server/src/routes/report.ts`
- Each route now calls one repository write operation after successful AI output normalization.

### Architectural Impact
- Route layer now has explicit separation from persistence details, and all five modules share one traceable data-access boundary for incremental migration.

## Update 2026-02-25: Migration Mechanism (`P3-04`)

### `server/scripts/migrate.js`
- Role: schema migration runner.
- Changes:
  - executes ordered SQL migrations from `server/migrations/`
  - initializes and maintains `schema_migrations` metadata table
  - enforces checksum consistency for applied files
  - supports idempotent re-run (applied files are skipped)
  - supports environment-driven DB target via `SQLITE_DB_PATH`

### `server/migrations/001_init_schema.sql`
- Role: first baseline schema migration.
- Contents:
  - users/sessions tables
  - five-module persistence tables
  - cross-module ownership fields (`owner_type`, `owner_id`)
  - query-oriented index baseline

### `server/package.json`
- Added migration commands:
  - `db:migrate`
  - `db:migrate:test`

### Architectural Impact
- Backend now has executable, repeatable schema evolution infrastructure, enabling controlled rollout for upcoming repository-layer and persistence migration steps.

## Update 2026-02-25: Database Model Design (`P3-03`)

### `code/database_model_design.md`
- Role: persistence schema baseline for Phase 3 backend migration.
- Contents:
  - unified ownership model (`owner_type + owner_id`) for anonymous/user coexistence
  - table schema definitions for all five modules plus session/user layers
  - index strategy per table aligned to high-frequency query paths
  - module query-to-index mapping and retention guidance

### Architectural Impact
- Establishes a concrete data persistence contract for migration scripts (`P3-04`) and repository abstraction (`P3-05`), reducing schema drift risk across implementation phases.

## Update 2026-02-25: Session Token Flow Design (`P3-02`)

### `code/session_token_flow_design.md`
- Role: token lifecycle contract document for session implementation phase.
- Contents:
  - token/identifier roles (`anonymous-session-id`, `access_token`, `refresh_token`)
  - client-server transfer contract (Authorization header + HttpOnly refresh cookie + anonymous context header)
  - recommended session endpoints (`bootstrap/login/refresh/logout/me`)
  - lifecycle state machine (create/refresh/expire/recover)
  - reproducible scenario scripts for first visit, page refresh restore, and token expiry

### Architectural Impact
- Converts session strategy (P3-01) into executable token-flow contract, reducing ambiguity before database/session persistence modeling.

## Update 2026-02-25: Session & User Strategy ADR (`P3-01`)

### `code/session_user_strategy_decision.md`
- Role: identity/session architecture decision baseline for P3 migration phase.
- Contents:
  - current anonymous-session implementation baseline (`anonymous-session-id` + request header propagation)
  - dual-track identity model boundary (`anonymous session` vs `authenticated user`)
  - lifecycle definitions for anonymous and login sessions
  - permission boundary matrix and service-side security constraints
  - phased migration strategy (`并存 -> 双写回填 -> 切换收敛`) with conflict resolution rules

### Architectural Impact
- Establishes a stable contract for upcoming token-flow and persistence migration tasks, preventing P3 implementation drift across frontend/server data ownership decisions.

## Update 2026-02-25: Achievements Regression Closure (`P2-A-04`)

### `code/achievements_regression_checklist.md`
- Role: achievements module regression execution record.
- Scope captured:
  - report generation
  - template switching and structure variance
  - trend metrics and personalized recommendation rendering
  - structured share preview/copy flow
  - history report compatibility replay
- Gate evidence:
  - `cd server && npm run build`
  - `cd client && npm run lint`
  - `cd client && npm run build`

### Reliability Impact
- Achievements phase now has a formal regression closure artifact aligned with previous module closure format, reducing risk before entering P3 architecture work.

## Update 2026-02-25: Structured Share Upgrade (`P2-A-03`)

### `client/src/pages/AchievementsPage.tsx`
- Role: achievements share-content composer.
- Changes:
  - introduced structured share-content builder that composes:
    - report title and period
    - summary paragraph
    - key metrics block
    - trend snapshot block
    - top action recommendations
  - share dialog now includes:
    - read-only structured preview textarea
    - clipboard copy action with explicit success/failure feedback
  - share content now depends on deterministic local metrics and recommendation pipeline, not only AI summary sentence

### Architectural Impact
- Share output moved from free-form text to stable structured payload, improving cross-platform readability and reducing information loss when pasted outside the app.

## Update 2026-02-25: Trend Metrics & Personalized Suggestions (`P2-A-02`)

### `client/src/pages/AchievementsPage.tsx`
- Role: achievements analytics and recommendation runtime.
- Changes:
  - added deterministic 7-day trend computation (`current 7 days` vs `previous 7 days`) for:
    - 学习频次
    - 测试正确率
    - 新增错题
  - introduced trend direction resolver (`上升/下降/稳定`) with metric deltas and positive/negative semantic interpretation
  - added data-driven recommendation generator combining:
    - trend metrics
    - wrong-question-book scale
    - flashcard due count
    - report weak points
    - active template context (`weekly/exam_sprint/workplace_boost`)
  - report-history reload now restores template type and backfills missing template profile blocks to keep template switch behavior stable for legacy records

### `client/src/types/index.ts`
- Role: report template contract typing.
- Changes:
  - added report template typing (`ReportTemplateType`) and template profile structures (`LearningReportTemplateProfile` + section model)
  - extended `LearningReport` with optional `templateType/templateProfile` for compatible historical replay

### Architectural Impact
- Achievements report output now combines AI narrative with deterministic local analytics, reducing pure prompt variance and making trend/suggestion results verifiable against local learning history.

## Update 2026-02-25: Report Template Expansion (`P2-A-01`)

### `client/src/pages/AchievementsPage.tsx`
- Role: report-template selector UI.
- Changes:
  - template selector now targets explicit scenario templates:
    - `weekly`
    - `exam_sprint`
    - `workplace_boost`
  - each template exposes user-facing description to clarify reporting intent

### `server/src/utils/request-validator.ts`
- Role: report-type contract gate.
- Changes:
  - report type validation now supports new template IDs
  - backward compatibility retained for legacy `monthly` / `term`

### `server/src/utils/prompt-builder.ts`
- Role: report template strategy source.
- Changes:
  - introduced template strategy map:
    - template display name
    - focus directive
    - suggestion style directive
  - prompt now injects template strategy fields before analysis instructions

### Architectural Impact
- Report generation now supports scenario-aware prompt behaviors while preserving compatibility for historical report types.

## Update 2026-02-25: Quiz Regression Closure (`P2-Q-06`)

### `code/quiz_regression_checklist.md`
- Role: quiz module regression execution record.
- Scope captured:
  - generation parameter contract
  - normal quiz + wrong-retry flows
  - timed submit behavior
  - scoring/explanation consistency
  - wrong-book write-back linkage
- Gate evidence:
  - `cd server && npm run build`
  - `cd client && npm run lint`
  - `cd client && npm run build`

### Reliability Impact
- Quiz phase now has a formal closure artifact chain and can be regression-checked against a single baseline checklist.

## Update 2026-02-25: Quiz Scoring & Feedback Unification (`P2-Q-05`)

### `client/src/pages/QuizPage.tsx`
- Role: quiz scoring/output contract owner.
- Changes:
  - introduced shared metric calculator `calculateQuizMetrics`
  - both finalization path and UI result rendering now consume the same metric object
  - standardized per-question feedback block:
    - user answer
    - correct answer
    - explanation
  - standardized result summary with answered/unanswered and accuracy signals
  - wrong-review view now explicitly marks unanswered items

### Architectural Impact
- Eliminates duplicated score logic branches in quiz flow and establishes one reusable metric contract for future analytics/report ingestion.

## Update 2026-02-25: Timed Quiz Runtime (`P2-Q-04`)

### `client/src/pages/QuizPage.tsx`
- Role: timed-quiz state machine runtime.
- Changes:
  - added countdown state (`remainingSeconds`) and timeout guard ref
  - added timer tick effect for timed sessions
  - added timeout auto-submit effect wired to shared finalize pipeline
  - added explicit early-submit action and timeout toast feedback
  - ensured timer reset on stage/mode transitions to prevent stale countdown leakage

### Architectural Impact
- Quiz flow now supports both untimed and timed modes under a shared completion pipeline (`finalizeQuiz`), reducing duplicated submit logic.

## Update 2026-02-25: Wrong Retry Entry Unification (`P2-Q-03`)

### `client/src/pages/QuizPage.tsx`
- Role: wrong-question retry executor.
- Changes:
  - added `startWrongBookQuiz(type)` pipeline:
    - source: `wrongQuestionBook`
    - filter: by quiz type (`reading` / `vocabulary`)
    - sort: `repeatCount` desc + `lastPracticedAt` asc
    - truncate: current `questionCount`
  - supports route-state auto-start (`quizMode=wrong-book`, `wrongType`)
  - select/action zones now expose explicit wrong-retry entries

### `client/src/pages/AchievementsPage.tsx`
- Role: cross-module retry entry source.
- Changes:
  - reads wrong-book stats from local storage
  - adds retry actions for reading/vocabulary wrong sets
  - navigates to quiz with route-state trigger

### Architectural Impact
- Wrong-question retry path is now centralized in quiz-page selection logic; multiple entry pages only trigger mode/type, avoiding duplicated filtering logic.

## Update 2026-02-25: Wrong Question Book Model (`P2-Q-02`)

### `client/src/types/index.ts`
- Role: quiz persistence contract definition.
- Changes:
  - added `WrongQuestionRecord` domain model with:
    - identity (`id`)
    - repeat statistics (`repeatCount`)
    - temporal markers (`firstWrongAt`, `lastPracticedAt`)
    - wrong-reason + answer snapshot fields

### `client/src/pages/QuizPage.tsx`
- Role: quiz-to-wrongbook write pipeline.
- Changes:
  - added `wrongQuestionBook` localStorage state
  - quiz completion now extracts wrong answers and writes/merges into wrong book
  - dedup strategy keyed by `type + question`
  - repeated misses increment repeat counter and refresh `lastPracticedAt`
  - added runtime normalization for legacy records missing new fields
  - history zone now surfaces wrong-book summary signals

### Architectural Impact
- Quiz data now splits into two layers:
  - `testHistory` for attempt-level summaries
  - `wrongQuestionBook` for question-level remediation tracking.

## Update 2026-02-25: Quiz Parameter Contract Extension (`P2-Q-01`)

### `client/src/pages/QuizPage.tsx`
- Role: quiz generation config entry and runtime metadata holder.
- Changes:
  - added config controls for:
    - `questionCount`
    - `difficulty`
    - `timedMode`
    - `timeLimitMinutes`
  - quiz start now sends full config payload
  - active config snapshot persisted into test history entries
  - non-select stage now displays active config summary

### `client/src/lib/api.ts`
- Role: quiz API boundary.
- Changes:
  - quiz endpoints now accept structured options payload
  - backward compatibility retained for legacy numeric `questionCount` calls

### `server/src/utils/request-validator.ts`
- Role: quiz request schema gate.
- Changes:
  - reading/vocabulary question payloads now validate:
    - `questionCount`
    - `difficulty`
    - `timedMode`
    - `timeLimitMinutes`

### `server/src/routes/quiz.ts`
- Role: quiz route-to-service mapping layer.
- Changes:
  - forwards full validated quiz option object to service methods

### `server/src/services/ai-service.ts`
### `server/src/utils/prompt-builder.ts`
- Role: quiz generation policy and prompt assembly.
- Changes:
  - quiz generation now uses normalized options object
  - prompt builder includes difficulty + timing constraints for question generation behavior

### Architectural Impact
- Quiz generation moved from single-parameter call to multi-parameter contract with client-server alignment and backward compatibility.

## Update 2026-02-25: Reading Regression Closure (`P2-R-06`)

### `code/reading_regression_checklist.md`
- Role: reading module regression execution record.
- Scope captured:
  - generation parameter switching + summary consistency
  - preset switching
  - favorites retrieval flow (tag/search/sort)
  - reading-to-quiz context continuity
  - error handling and recovery path
- Gate evidence:
  - `cd server && npm run build`
  - `cd client && npm run lint`
  - `cd client && npm run build`

### Reliability Impact
- Reading phase now has a formal regression closure artifact, enabling future change impact checks against a stable baseline.

## Update 2026-02-25: Reading Favorites Retrieval Upgrade (`P2-R-04`)

### `client/src/types/index.ts`
- Role: reading-favorite persistence contract.
- Changes:
  - introduced `ReadingFavorite` (extends reading content with `savedAt` + `tags`)

### `client/src/pages/ReadingPage.tsx`
- Role: favorites management and retrieval interface.
- Changes:
  - favorites storage upgraded to typed `ReadingFavorite[]`
  - added legacy favorite migration (`savedAt/tags`补齐)
  - added retrieval controls:
    - keyword search
    - sort mode selection
    - per-item tag add/remove
  - favorites list now shows filter result counts and empty-search fallback
  - favorite creation seeds initial tags from generation config
- Architectural impact:
  - favorites are now queryable data assets rather than plain snapshots, enabling long-cycle review workflows.

## Update 2026-02-25: Reading Control Panel Upgrade (`P2-R-03`)

### `client/src/pages/ReadingPage.tsx`
- Role: reading generation control cockpit.
- Changes:
  - added preset template registry (`READING_PRESETS`) for common config combinations
  - added `activePreset` derivation and one-click preset apply flow
  - control panel now surfaces full parameter set (`language/topic/difficulty/length`)
  - input/result zones both render config summary chips to preserve request/result context consistency
- UX impact:
  - lowers configuration friction while keeping parameter state explicit and reviewable.

## Update 2026-02-25: Reading Backend Contract Sync (`P2-R-02`)

### `server/src/utils/request-validator.ts`
- Role: backend request contract gate for reading generation.
- Changes:
  - reading payload now validates:
    - `language`
    - `topic`
    - `difficulty`
    - `length`
  - unsupported enum values are rejected before reaching AI service.

### `server/src/routes/reading.ts`
- Role: reading generation route boundary.
- Changes:
  - now forwards the full validated reading options object to service layer
  - keeps route payload-to-service mapping explicit and typed.

### `server/src/services/ai-service.ts`
- Role: reading generation orchestration + AI output normalization.
- Changes:
  - added option normalizer for reading generation defaults
  - upgraded `generateReadingContent` to structured options signature
  - added reading response normalizer:
    - enforces required `english/chinese`
    - normalizes `vocabulary` item shape
    - emits clear domain errors on invalid payload

### `server/src/utils/prompt-builder.ts`
- Role: reading prompt policy source.
- Changes:
  - `buildReadingContentPrompt` now accepts reading options object
  - prompt now includes topic/difficulty/length constraints for controllable output behavior

### Reliability Impact
- Reading backend now has a complete option-aware contract from request validation through prompt generation to response normalization.

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
