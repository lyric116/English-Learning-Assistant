# Progress Log

## 2026-02-25 (complete/p2-q-04-timed-quiz-runtime)

### Completed
- Completed `P2-Q-04` (限时模式逻辑).
- Quiz runtime now supports:
  - 实时倒计时显示（限时模式）
  - 提前交卷按钮
  - 超时自动交卷（自动进入结果页）
  - 超时提示 toast
- Timer lifecycle is now managed across flows:
  - starts on quiz start
  - pauses/stops after submit
  - resets when returning to select mode

### Validation Performed
- `cd client && npm run lint` ✅
- `cd client && npm run build` ✅

### Notes For Next Developer
- `P2-Q-04` is complete; timed-mode behavior is now functional end-to-end at runtime.
- Next step is `P2-Q-05` (判分与解析展示规则统一).

## 2026-02-25 (complete/p2-q-03-wrong-retry-flow)

### Completed
- Completed `P2-Q-03` (错题重练流程).
- Quiz page:
  - added错题重练入口（阅读/词汇）并支持按错题本加载题集
  - 重练题集来源统一为 `wrongQuestionBook`，按 `repeatCount` 优先并限量到当前题量配置
  - 支持路由状态自动进入错题重练（用于跨页面入口）
- Achievements page:
  - 新增错题统计与重练按钮（阅读错题/词汇错题）
  - 重练入口通过路由状态跳转到 Quiz 并触发同一加载逻辑
- Consistency guarantee:
  - 两个入口都复用同一套“按类型过滤 + 同排序 + 同题量截断”规则，保证题目集合一致且仅含错题。

### Validation Performed
- `cd client && npm run lint` ✅
- `cd client && npm run build` ✅

### Notes For Next Developer
- `P2-Q-03` is complete; wrong-question retry is now reachable from Quiz and Achievements with consistent data selection.
- Next step is `P2-Q-04` (限时模式逻辑：计时、超时交卷、提示).

## 2026-02-25 (complete/p2-q-02-wrong-question-model)

### Completed
- Completed `P2-Q-02` (错题本数据模型与记录机制).
- Added wrong-question data model:
  - `WrongQuestionRecord` with repeat count, wrong reason, first/last practice time, difficulty snapshot
- Quiz result write-back now records wrong questions into localStorage `wrongQuestionBook`:
  - supports dedup by question identity
  - repeated wrong answers accumulate `repeatCount`
  - updates latest practice time and latest user answer
- Added legacy-safe normalization for old wrong-book records on read.
- Quiz history section now displays wrong-book summary (`累计错题 / 重复错题 / 最近错题`).

### Validation Performed
- `cd client && npm run lint` ✅
- `cd client && npm run build` ✅

### Notes For Next Developer
- `P2-Q-02` is complete; wrong-question persistence now exists as an independent local model.
- Next step is `P2-Q-03` (错题重练流程：测验页 + 成就页入口).

## 2026-02-25 (complete/p2-q-01-quiz-parameter-extension)

### Completed
- Completed `P2-Q-01` (测验参数扩展：题型/难度/题量/限时配置).
- Frontend:
  - `QuizPage`新增配置面板：`questionCount/difficulty/timedMode/timeLimitMinutes`
  - 生成请求会携带上述参数，且在测试过程与历史记录中保留配置快照
- API client:
  - `api.quiz.readingQuestions` / `api.quiz.vocabularyQuestions` 升级为支持结构化参数（兼容旧 number 传参）
- Backend:
  - 请求校验升级（题量/难度/限时参数）
  - `quiz` 路由透传配置到 service
  - 题目 prompt 升级，支持按难度与限时场景出题约束

### Validation Performed
- `cd server && npm run build` ✅
- `cd client && npm run lint` ✅
- `cd client && npm run build` ✅

### Notes For Next Developer
- `P2-Q-01` is complete with end-to-end quiz parameter contract coverage.
- Next step is `P2-Q-02` (错题本数据模型与记录机制).

## 2026-02-25 (complete/p2-r-06-reading-regression)

### Completed
- Completed `P2-R-06` (阅读模块回归测试).
- Added regression artifact: `code/reading_regression_checklist.md`.
- Regression scope includes:
  - 参数切换与配置摘要一致性
  - 模板预设切换
  - 收藏标签/搜索/排序
  - 阅读到测验上下文衔接
  - 错误提示与恢复

### Validation Performed
- `cd server && npm run build` ✅
- `cd client && npm run lint` ✅
- `cd client && npm run build` ✅

### Notes For Next Developer
- `P2-R-06` is complete; reading phase is fully closed (`P2-R-05` had already been completed out-of-order).
- Next step is `P2-Q-01` (测验模块参数扩展).

## 2026-02-25 (complete/p2-r-04-favorites-tag-search-sort)

### Completed
- Completed `P2-R-04` (阅读收藏管理增强).
- Favorites data model upgraded:
  - introduced `ReadingFavorite` with `savedAt` + `tags`
  - added runtime migration for legacy favorites (auto补齐 `savedAt/tags`)
- Reading favorites UI enhancements:
  - tag management: add/remove tags per favorite
  - search: keyword filter across title/content/tags
  - sort: latest/earliest/title/vocabulary-count
  - filtered-result count and empty-result feedback
- Favorite creation now carries generation-derived tags (topic/difficulty/length labels) as initial metadata.

### Validation Performed
- `cd client && npm run lint` ✅
- `cd client && npm run build` ✅

### Notes For Next Developer
- `P2-R-04` is complete; reading favorites now support long-term retrieval workflows (tag/search/sort).
- Next step is `P2-R-06` (阅读模块回归测试; `P2-R-05` 已 out-of-order 完成).

## 2026-02-25 (complete/p2-r-03-reading-control-panel-upgrade)

### Completed
- Completed `P2-R-03` (阅读控制面板升级).
- Reading page now includes preset template controls:
  - 日常速读 / 职场演练 / 旅行场景 / 科技进阶
  - preset click updates `topic/difficulty/length` in one step
- Expanded control panel now clearly exposes:
  - language direction
  - topic
  - difficulty
  - length
- Added visible config summary chips:
  - active template (if any)
  - direction/topic/difficulty/length
  - result panel also echoes `generationConfig` summary to keep display and request consistent

### Validation Performed
- `cd client && npm run lint` ✅
- `cd client && npm run build` ✅

### Notes For Next Developer
- `P2-R-03` is complete; reading parameter control UX now supports presets and explicit config visibility.
- Next step is `P2-R-04` (阅读收藏管理增强：标签/搜索/排序).

## 2026-02-25 (complete/p2-r-02-reading-backend-sync)

### Completed
- Completed `P2-R-02` (阅读后端参数校验与生成规则同步).
- Backend validator upgrade (`request-validator`):
  - reading payload now validates `topic/difficulty/length/language`
  - invalid enum values are explicitly rejected with readable errors
- Backend generation sync:
  - `generateReadingContent` now accepts structured reading options
  - `buildReadingContentPrompt` now uses topic/difficulty/length to constrain output style and length
  - route forwards validated options into generation service
- Response contract hardening:
  - reading service now normalizes AI response and enforces required bilingual正文字段
  - invalid shape/missing fields now return clear domain errors instead of ambiguous runtime failures

### Validation Performed
- `cd server && npm run build` ✅
- `cd client && npm run lint` ✅
- `cd client && npm run build` ✅

### Notes For Next Developer
- `P2-R-02` is complete; reading module backend now aligns with expanded parameter contract.
- Next step is `P2-R-03` (阅读控制面板升级 + 配置摘要展示).

## 2026-02-25 (complete/p2-r-01-reading-parameter-extension)

### Completed
- Completed `P2-R-01` (阅读生成参数扩展，前端侧).
- Reading input panel now supports configurable params:
  - `language`（中英方向）
  - `topic`（主题）
  - `difficulty`（难度）
  - `length`（篇幅）
- Request contract extended in client API:
  - `api.reading.generate` now accepts options payload and forwards params in request body.
- Reading result/history now carries generation config metadata (`generationConfig`) for replay and downstream usage.

### Validation Performed
- `cd client && npm run lint` ✅
- `cd client && npm run build` ✅

### Notes For Next Developer
- `P2-R-01` is complete on frontend and API-call layer.
- Next step is `P2-R-02` (后端参数校验与生成规则同步).

## 2026-02-25 (complete/p2-s-05-sentence-regression)

### Completed
- Completed `P2-S-05` (句子模块回归测试).
- Added sentence regression artifact: `code/sentence_regression_checklist.md`.
- Regression scope explicitly covers:
  - 输入与分析触发
  - 返回结构映射稳定性
  - 逐词解释交互
  - 语法点联动高亮
  - 学习笔记导出与笔记历史
  - 错误提示与恢复路径

### Validation Performed
- `cd server && npm run build` ✅
- `cd client && npm run lint` ✅
- `cd client && npm run build` ✅

### Notes For Next Developer
- `P2-S-05` is complete; sentence phase (`P2-S-01` ~ `P2-S-05`) is now fully closed.
- Next step is `P2-R-01` (阅读模块参数扩展).

## 2026-02-25 (complete/p2-s-04-study-note-export)

### Completed
- Completed `P2-S-04` (句子分析导出学习笔记 + 历史沉淀).
- Added readable note-export flow in `SentenceAnalysisPage`:
  - `buildStudyNote` generates copy-friendly study notes (原句 / 结构 / 语法要点 / 关键短语)
  - export action copies note to clipboard (not raw JSON) and persists to `sentenceNotesHistory`
- Added note history panel in sentence history zone:
  - displays recent exported notes with timestamp
  - supports one-click re-copy and note-history clear action

### Validation Performed
- `cd client && npm run lint` ✅
- `cd client && npm run build` ✅

### Notes For Next Developer
- `P2-S-04` is complete; sentence results can now be exported as reusable study notes and accumulated in local history.
- Next step is `P2-S-05` (句子模块回归测试).

## 2026-02-25 (complete/p2-s-03-grammar-phrase-linkage)

### Completed
- Completed `P2-S-03` (短语高亮与语法说明联动).
- `SentenceAnalysisPage` grammar/phrase linkage updates:
  - grammar points are now clickable and can be toggled active/inactive
  - selecting a grammar point highlights linked phrase snippets in the phrase list
  - added dedicated grammar explanation panel showing active grammar detail + linked phrase chips
- Added resilient phrase matching strategy:
  - normalizes grammar title/tags and phrase text/category/function/explanation for matching
  - falls back to index-based linkage when keyword matching yields no hit

### Validation Performed
- `cd client && npm run lint` ✅
- `cd client && npm run build` ✅

### Notes For Next Developer
- `P2-S-03` is complete; grammar-to-text linkage is now visible and interactive.
- Next step is `P2-S-04` (句子分析结果导出笔记 + 历史沉淀).

## 2026-02-25 (complete/p2-s-02-word-hover-panel)

### Completed
- Completed `P2-S-02` (逐词悬停/点击解释交互).
- `SentenceAnalysisPage` now supports token-level interaction inside the sentence display:
  - tokenized sentence text renders clickable/hoverable highlighted words
  - matched words open an inline explanation panel with:
    - 词义（meaning）
    - 词性（partOfSpeech）
    - 句中作用（role）
  - explanation panel supports explicit close action
- Matching uses normalized token lookup (word + lemma fallback), so punctuation/case differences no longer block interaction.

### Validation Performed
- `cd client && npm run lint` ✅
- `cd client && npm run build` ✅

### Notes For Next Developer
- `P2-S-02` is complete with stable word-level reveal interaction in sentence result view.
- Next step is `P2-S-03` (短语高亮与语法说明联动).

## 2026-02-25 (complete/p2-s-01-sentence-contract-extension)

### Completed
- Completed `P2-S-01` (sentence analysis structure extension).
- Backend contract upgrade:
  - `server/src/routes/sentence.ts` now normalizes AI output to stable schema
  - added compatibility mapping for mixed field names (`point -> title`, `type -> category`, `pos -> partOfSpeech`, etc.)
  - added safe defaults for missing fields to avoid frontend render crashes
- Prompt/schema upgrade:
  - `server/src/utils/prompt-builder.ts` sentence prompt now requests:
    - `words` (词级信息)
    - `phrases.category/function`
    - `grammarPoints.title/tags`
    - `structure.pattern` and clause `connector`
- Frontend contract + rendering upgrade:
  - `client/src/types/index.ts` updated with normalized sentence domain models
  - `SentenceAnalysisPage` now normalizes incoming + history data for backward compatibility
  - added词级信息展示区，语法点标签展示，短语字段命名切换为 `category/function`

### Validation Performed
- `cd server && npm run build` ✅
- `cd client && npm run lint` ✅
- `cd client && npm run build` ✅

### Notes For Next Developer
- `P2-S-01` is complete; sentence analysis payload can be mapped stably even under partial/legacy AI responses.
- Next step is `P2-S-02` (逐词悬停解释交互).

## 2026-02-25 (complete/p2-f-06-flashcards-regression)

### Completed
- Completed `P2-F-06` (flashcards module regression pass).
- Added regression checklist artifact: `code/flashcards_regression_checklist.md`.
- Checklist covers required paths:
  - 抽词参数与返回契约
  - 翻卡与导航
  - 三态状态更新
  - 朗读触发
  - 历史与会话统计持久化

### Validation Performed
- `cd client && npm run lint` ✅
- `npm run build` ✅（包含 `server` 与 `client` 构建）

### Notes For Next Developer
- `P2-F-06` is complete; flashcards phase (`P2-F-01` ~ `P2-F-06`) is now fully closed.
- Next step is `P2-S-01` (sentence analysis model extension).

## 2026-02-25 (complete/p2-f-05-session-stats-share)

### Completed
- Completed `P2-F-05` (flashcard session statistics + achievements sharing).
- Flashcards module:
  - added session summary model (`FlashcardSessionSummary`) and localStorage key `flashcardSessionSummary`
  - tracks current-session `学习量/正确率/待复习量` from tri-state operations
  - resets/clears summary when flashcard set is cleared to avoid stale carry-over
  - history panel now explicitly shows required metrics (`当次学习量/当次正确率/待复习量`)
- Achievements module:
  - reads and displays latest flashcard session summary in history zone
  - includes `flashcardSessionSummary` in report generation payload (`learningData`)
  - extends share text with flashcard session metrics when available
  - `hasData` now treats flashcard session summary as valid report input

### Validation Performed
- `cd client && npm run lint` ✅
- `cd client && npm run build` ✅

### Notes For Next Developer
- `P2-F-05` is complete; flashcard session stats are now persisted and consumable by achievements/report flow.
- Next step is `P2-F-06` (flashcard full regression checklist).

## 2026-02-25 (complete/p2-f-04-review-queue-priority)

### Completed
- Completed `P2-F-04` (review queue strategy).
- Implemented queue derivation in `FlashcardsPage`:
  - sorts by `isDue` (due review first)
  - then by status priority (`reviewing -> new -> mastered`)
  - then by `nextReviewAt` time
- Navigation and rendering now consume queue order instead of raw array order:
  - left/right navigation, progress, and word chip list reflect prioritized queue
  - queue keeps index mapping back to original storage array for safe updates
- Status action updates remain stable after queue sorting:
  - mark actions update underlying source word by mapped index
  - avoids state-write mismatch between displayed order and storage order

### Validation Performed
- `cd client && npm run lint` ✅
- `cd client && npm run build` ✅

### Notes For Next Developer
- `P2-F-04` is complete; flashcard browsing now prioritizes due-review items by design.
- Next step is `P2-F-05` (flashcard session statistics and sharing to achievements).

## 2026-02-25 (complete/p2-f-03-flashcard-state-actions)

### Completed
- Completed `P2-F-03` (mastered/new/review operations for flashcards).
- Added flashcard state operation controls in flashcards action zone:
  - `标记生词`
  - `加入复习`
  - `标记掌握`
- Added state transition update logic:
  - updates `learningStatus`
  - recalculates and persists `reviewCount` + `accuracy`
  - updates `nextReviewAt` based on selected state strategy
- UI feedback now reflects state operations immediately:
  - front/back card metadata updates in place
  - history summary counters and due-review count update in real time

### Validation Performed
- `cd client && npm run lint` ✅
- `cd client && npm run build` ✅

### Notes For Next Developer
- `P2-F-03` is complete with immediate, persistent tri-state operation feedback.
- Next step is `P2-F-04` (review queue strategy based on state + time).

## 2026-02-25 (complete/p2-f-02-extraction-params-and-contract)

### Completed
- Completed `P2-F-02` (flashcard extraction parameter + response contract upgrade).
- Frontend upgrade:
  - flashcards input now supports configurable extraction count (`5/10/15/20/30`)
  - request now carries user-selected `maxWords` and difficulty level
  - added preflight boundary guard for invalid extraction count
- Backend upgrade:
  - `validateFlashcardsExtractPayload` tightened `maxWords` bounds to `1..30`
  - flashcards route now normalizes AI return payload to stable word schema
  - explicit failure messages added for invalid/non-array extraction response and empty valid items
- API typing upgrade:
  - flashcard level now typed as union (`all/cet4/cet6/advanced`) in client API layer.

### Validation Performed
- `cd server && npm run build` ✅
- `cd client && npm run lint` ✅
- `cd client && npm run build` ✅

### Notes For Next Developer
- `P2-F-02` is complete with clear parameter boundary behavior and stricter extraction response contract.
- Next step is `P2-F-03` (mastered/new/review state operation in flashcards).

## 2026-02-25 (complete/p2-f-01-flashcard-model-extension)

### Completed
- Completed `P2-F-01` (flashcard data model extension).
- Extended flashcard `Word` model in `client/src/types/index.ts` with:
  - `learningStatus`
  - `nextReviewAt`
  - `accuracy`
  - `reviewCount`
- Implemented compatibility-safe migration in `FlashcardsPage`:
  - added runtime V2 model guard and normalizer
  - legacy localStorage flashcard data is auto-upgraded on read
  - newly提取的单词会按新模型写入默认学习字段
- Surfaced new fields in UI:
  - flashcard front/back now displays status / review count / accuracy / next review date
  - history block now displays status distribution and due-review count

### Validation Performed
- `cd client && npm run lint` ✅
- `cd client && npm run build` ✅

### Notes For Next Developer
- `P2-F-01` is complete and backward-compatible with old local storage payloads.
- Next step is `P2-F-02` (flashcard extraction parameter + contract upgrade).

## 2026-02-25 (complete/p1-10-motion-and-responsive-polish)

### Completed
- Completed `P1-10` (key motion + responsive detail polish).
- Motion enhancements:
  - added `animate-soft-pop` result reveal animation for key result containers
  - added staggered section reveal via `ModuleSection` (`index`-driven animation delay)
  - retained reduced-motion safety under existing `prefers-reduced-motion` guard
- Responsive tap-target enhancements:
  - added global `.tap-target` utility with mobile minimum hit area (`40x40`)
  - applied to high-frequency icon-only controls in flashcards/sentence/reading/achievements flows
- Structural polish:
  - finished P1 framework loop by applying section order scaffold to all module pages with consistent animation rhythm

### Validation Performed
- `cd client && npm run lint` ✅
- `cd client && npm run build` ✅

### Notes For Next Developer
- `P1-10` is complete; Phase 1 UI-system steps (`P1-01` ~ `P1-10`) are now fully closed.
- Next pointer moves to `P2-F-01` (flashcards data model extension).

## 2026-02-25 (complete/p1-09-module-framework-unification)

### Completed
- Completed `P1-09` (unify five module page framework).
- Added shared section scaffold: `client/src/components/layout/ModuleSection.tsx`.
  - standardized zone semantics and ordering:
    - 输入区
    - 结果区
    - 历史区
    - 操作区
- Applied unified framework to all five modules:
  - `FlashcardsPage`
  - `SentenceAnalysisPage`
  - `ReadingPage`
  - `QuizPage`
  - `AchievementsPage`
- Added supporting behavior to align with new framework:
  - quiz page now reads and displays local test history
  - achievements page now reads and loads report history (not only writes)
  - shared section label styling added in global CSS

### Validation Performed
- `cd client && npm run lint` ✅
- `cd client && npm run build` ✅

### Notes For Next Developer
- `P1-09` is complete; five core pages now follow one consistent information partition and action sequence.
- Next step is `P1-10` (key motion and responsive detail polishing).

## 2026-02-25 (complete/p1-08-homepage-ia-refresh)

### Completed
- Completed `P1-08` (homepage visual + information structure enhancement).
- Rebuilt `HomePage` to improve first-screen clarity and CTA hierarchy:
  - clearer product positioning headline/subtitle
  - dual CTA strategy (`从闪卡开始` primary + `先做双语阅读` secondary)
  - quick signal cards to communicate onboarding speed and learning loop
- Strengthened module discoverability:
  - explicit five-module entry map with per-module value proposition and direct action link
- Added guided learning structure:
  - recommended learning path block (`输入文本 -> 生成材料 -> 学习测试 -> 复盘沉淀`)
  - two "start here" cards for novice path vs pre-existing material path
- Layout verified with existing responsive shell to avoid mobile first-screen collapse misalignment.

### Validation Performed
- `cd client && npm run lint` ✅
- `cd client && npm run build` ✅

### Notes For Next Developer
- `P1-08` is complete; homepage now acts as a stronger conversion + navigation entry point.
- Next step is `P1-09` (unify five module page framework).

## 2026-02-25 (complete/p1-07-navigation-shell-refactor)

### Completed
- Completed `P1-07` (navigation and page skeleton refactor).
- Refactored `Navbar`:
  - unified top navigation spacing/layering for desktop/mobile
  - added mobile overlay + panelized collapse behavior
  - ensured all five module links remain accessible in mobile menu
  - added stable mobile settings entry in menu panel
- Refactored `Layout`:
  - migrated to shared app shell/main container structure (`app-shell`, `app-main`)
  - unified page-level max width and vertical spacing
- Refactored `Footer`:
  - aligned visual language with navigation shell
  - added quick links for five modules to reinforce consistent navigation paths
- Added shell-level visual tokens/classes in `client/src/index.css` for navbar shadow, app background, and main container sizing.

### Validation Performed
- `cd client && npm run lint` ✅
- `cd client && npm run build` ✅

### Notes For Next Developer
- `P1-07` is complete with unified global navigation skeleton and mobile collapse strategy.
- Next step is `P1-08` (homepage visual + information structure enhancement).

## 2026-02-25 (complete/p1-06-feedback-system-unification)

### Completed
- Completed `P1-06` (feedback component style unification).
- Unified shared feedback primitives:
  - `LoadingSpinner` updated to panel-style loading state
  - `EmptyState` updated to standardized empty-surface style and copy spacing
  - `Toast` updated to consistent bordered semantic tone style (success/error/info/warning)
  - `Skeleton` updated to unified muted baseline style
- Added reusable `FeedbackAlert` component for inline error/status messages.
- Wired API error feedback into all five business modules:
  - `FlashcardsPage`, `SentenceAnalysisPage`, `ReadingPage`, `QuizPage`, `AchievementsPage`
  - each module now keeps local error state and renders dismissible inline error alert in addition to toast.

### Validation Performed
- `cd client && npm run lint` ✅
- `cd client && npm run build` ✅

### Notes For Next Developer
- `P1-06` is complete with consistent loading/empty/error/toast/skeleton feedback language.
- Next step is `P1-07` (navigation and page skeleton refactor).

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
