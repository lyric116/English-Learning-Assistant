# Implementation Tracker

## Step Status Overview (Reconciled 2026-02-25)

| Step | Plan ID | Status | Notes / Evidence |
|---|---|---|---|
| 1 | P0-01 | completed | Branch + tracker initialized (`feat/mvp-core-closure`). |
| 2 | P0-02 | completed | `npm ls --depth=0` passed at root/client/server on 2026-02-25. |
| 3 | P0-03 | completed | `cd client && npm run lint` and `npm run build` passed on 2026-02-25. |
| 4 | P0-04 | completed | Five-module baseline verified with successful logs for flashcards/sentence/reading/quiz/report (`code/functional_baseline.md`). |
| 5 | P0-05 | completed | Verified `/health` and `/ai/test` under invalid + valid provider config; valid `.env` provider call returned success. |
| 6 | P0-06 | completed | Added user personas doc: `code/target_users.md` (3 personas + usage frequency + success metrics). |
| 7 | P0-07 | completed | Added brand guideline doc: `code/brand_guidelines.md` (color, tone, copy, interaction rules). |
| 8 | P0-08 | completed | Rewrote `CLAUDE.md` from outdated vanilla-stack docs to current React+Express architecture. |
| 9 | P1-01 | completed | Added global design tokens in `client/src/index.css` and applied them in Home + Flashcards + Navbar layers. |
| 10 | P1-02 | completed | Added typography hierarchy tokens/classes and applied to Home/Reading/Quiz headings and body text. |
| 11 | P1-03 | completed | Contrast audit reconciled across all modules; key readability texts/buttons fixed in Home/Flashcards/Sentence/Reading/Quiz (light/dark). |
| 12 | P1-04 | completed | Button system unified: primary/secondary/destructive/disabled interaction rules standardized and outline usage migrated. |
| 13 | P1-05 | completed | Input system unified: shared form-control styles for Input/Textarea/Select, plus visible form error states in Settings dialog. |
| 14 | P1-06 | completed | Feedback system unified: Loading/Empty/Toast/Skeleton refreshed and shared inline error alert applied to all five modules. |
| 15 | P1-07 | completed | Navigation and page shell refactored: Navbar/Footer/Layout spacing and layering unified, mobile menu overlay/collapse improved, settings entry stable on both desktop and mobile. |
| 16 | P1-08 | completed | Homepage information architecture upgraded: stronger product positioning, dual CTA hierarchy, explicit five-module entry map, and guided learning path blocks. |
| 17 | P1-09 | completed | Five-module framework unified with shared section scaffold (`输入区/结果区/历史区/操作区`) and consistent ordering across Flashcards/Sentence/Reading/Quiz/Achievements. |
| 18 | P1-10 | completed | Added key motion polish (`ModuleSection` stagger + result soft-pop) and mobile tap-target upgrades on high-frequency icon controls across modules. |
| 19 | P2-F-01 | completed | Flashcard model extended with `learningStatus/nextReviewAt/accuracy/reviewCount`, including legacy localStorage migration on read. |
| 20 | P2-F-02 | completed | Flashcard extraction contract upgraded: configurable `maxWords` in UI/API, validator boundary tightened to `1..30`, and backend extraction response normalized with explicit invalid-format failure messages. |
| 21 | P2-F-03 | completed | Added flashcard tri-state actions (`生词/复习/掌握`) with immediate local updates for status, review count, accuracy, and next review time. |
| 22 | P2-F-04 | completed | Implemented review queue ordering by state/time: due + reviewing words prioritized ahead of new/mastered entries, while preserving source data updates through index mapping. |
| 23 | P2-F-05 | completed | Added flashcard session summary (`studied/accuracy/due`) persistence and achievements integration (history panel + report payload + share text). |
| 24 | P2-F-06 | completed | Flashcards regression checklist executed (`code/flashcards_regression_checklist.md`) + validation gates passed (`cd client && npm run lint`, `npm run build`). |
| 25 | P2-S-01 | completed | Extended sentence analysis contract with word-level data, phrase category/function, grammar tags, and server/client normalization for backward compatibility. |
| 26 | P2-S-02 | completed | Implemented in-sentence token hover/click explanation panel (word meaning/POS/role) with closable detail state and legacy-safe token matching. |
| 27 | P2-S-03 | completed | Added grammar-point click linkage: associated phrases are highlighted and a dedicated explanation panel displays active grammar details + linked snippets. |
| 28 | P2-S-04 | completed | Added sentence study-note export (readable text format), clipboard copy flow, and persisted note history (`sentenceNotesHistory`) with replay/clear actions. |
| 29 | P2-S-05 | completed | Sentence regression checklist executed (`code/sentence_regression_checklist.md`) with gates passing (`server build`, `client lint/build`). |
| 30 | P2-R-01 | completed | Reading page now supports configurable generation params (`topic/difficulty/length/language`) and sends them via API payload; local result metadata includes generation config for history replay. |
| 31 | P2-R-02 | completed | Backend reading generation now validates `topic/difficulty/length`, syncs prompt rules with new params, and normalizes AI response to stable bilingual+vocabulary shape. |
| 32 | P2-R-03 | completed | Reading control panel upgraded with preset templates, difficulty/length options, and visible config summary aligned with request params. |
| 33 | P2-R-04 | completed | Favorites upgraded with tag metadata, search filtering, and sortable views (latest/oldest/title/vocab count) plus legacy favorite migration. |
| 34 | P2-R-05 | completed (out-of-order) | Reading->Quiz context persistence implemented on 2026-02-24 (see `progress.md`). |
| 35 | P2-R-06 | completed | Reading regression checklist executed (`code/reading_regression_checklist.md`) with gates passing (`server build`, `client lint/build`). |
| 36 | P2-Q-01 | completed | Quiz now supports configurable generation params (`type/difficulty/questionCount/timedMode/timeLimitMinutes`) across UI/API/validator/prompt contract, with test history carrying config snapshot. |
| 37 | P2-Q-02 | completed | Introduced wrong-question-book model (`wrongQuestionBook`) with repeat tracking, wrong-reason metadata, first/last practice timestamps, and quiz-finish write-back pipeline. |
| 38 | P2-Q-03 | completed | Added wrong-question retry flow in both Quiz and Achievements entries; both paths use the same `wrongQuestionBook` filter/sort strategy and only load wrong items by type. |
| 39 | P2-Q-04 | completed | Implemented timed quiz runtime: countdown display, early submit, timeout auto-submit, and timeout notification; timer state resets correctly across mode switches. |
| 40 | P2-Q-05 | completed | Unified quiz scoring/accuracy metrics via shared calculation, standardized in-question feedback (your answer + correct answer + explanation), and aligned result/history displays with consistent score semantics. |
| 41 | P2-Q-06 | completed | Quiz regression checklist executed (`code/quiz_regression_checklist.md`) with gates passing (`server build`, `client lint/build`). |
| 42 | P2-A-01 | completed | Added three report templates (`weekly/exam_sprint/workplace_boost`) with frontend template picker and backend template-aware prompt strategy + validator support. |
| 43 | P2-A-02 | completed | Added achievements trend metrics (`学习频次/测试正确率/新增错题`) and data-driven personalized suggestions, with template-profile rendering + history reload compatibility. |
| 44 | P2-A-03 | completed | Upgraded share flow to structured content with title/summary/key metrics/trends/actions preview + one-click clipboard copy. |
| 45 | P2-A-04 | completed | Achievements regression checklist executed (`code/achievements_regression_checklist.md`) with gates passing (`server build`, `client lint/build`). |
| 46 | P3-01 | completed | Added session/user strategy ADR (`code/session_user_strategy_decision.md`) covering lifecycle, permission boundaries, and anonymous->login migration strategy. |
| 47 | P3-02 | completed | Added token-flow design doc (`code/session_token_flow_design.md`) covering create/refresh/expire/recover and client-server transmission contract. |
| 48 | P3-03 | completed | Added five-module DB model doc (`code/database_model_design.md`) with owner model, table schema, index strategy, and core query mapping. |
| 49 | P3-04 | completed | Introduced SQLite migration mechanism (`server/scripts/migrate.js` + `server/migrations/001_init_schema.sql`) and verified empty-db apply + idempotent re-run. |
| 50 | P3-05 | completed | Added repository layer (`learning-data-repository`) and wired one persistence write path for each module route with structured repository logs. |
| 51 | P3-06 | completed | First-batch persistence migration landed for Flashcards + Sentence history: backend history read APIs + frontend empty-local fallback hydration from server. |
| 52 | P3-07 | completed | Migrated reading/quiz/report history to backend replay path: added history APIs, quiz result sync endpoint, and frontend empty-local hydration for three modules. |
| 53 | P3-08 | completed | Implemented dual-write transition backfill path: migration status/backfill APIs plus client one-time local->server backfill bootstrap. |
| 54 | P3-09 | completed | Architecture-phase integration regression checklist executed (`code/p3_architecture_integration_regression.md`) with build/lint gates and cross-owner replay/backfill verification. |
| 55 | P4-01 | completed (out-of-order) | Centralized request validation landed on 2026-02-25. |
| 56 | P4-02 | completed | Unified API response envelope + error-code mapping across server routes/middleware, with client-side response unwrapping and code-aware error messages. |
| 57 | P4-03 | completed | Added zero-dependency frontend test baseline (`node:test` + `--experimental-strip-types`) covering API client response mapping and local-storage hook parse logic. |
| 58 | P4-04 | pending | Not started. |
| 59 | P4-05 | pending | Not started. |
| 60 | P4-06 | pending | Not started. |
| 61 | P4-07 | pending | Not started. |
| 62 | P5-01 | pending | Not started. |
| 63 | P5-02 | pending | Not started. |
| 64 | P5-03 | pending | Not started. |
| 65 | P5-04 | pending | Not started. |

## Current Execution Pointer
- First not-yet-completed step: `P4-04`.
- Execution policy: continue from the first pending/partial step unless explicitly reprioritized by lyricx.
