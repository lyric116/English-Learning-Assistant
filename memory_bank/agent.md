# English Learning 项目速览与改造指南

> 生成时间：2026-02-23
> 目标：快速定位「前端页面」「后端路由」「五大模块数据流」，并给出可执行改造计划。

## 1) 模块清单

### 核心五大模块
1. 闪卡学习（Flashcards）
2. 句子分析（Sentence Analysis）
3. 双语阅读（Reading）
4. 理解测试（Quiz）
5. 学习成就（Achievements / Report）

### 支撑模块
1. 首页（模块入口与介绍）
2. AI 设置（模型配置、连通性测试）
3. 通用 UI（Toast、Layout、主题切换、TTS）

---

## 2) 仓库结构（快速）

```text
.
├── client/               # React + Vite 前端
│   └── src/
│       ├── pages/        # 页面（业务模块）
│       ├── components/   # 布局/UI/设置弹窗
│       ├── hooks/        # localStorage、主题、TTS
│       ├── lib/          # API 封装、AI provider
│       └── types/        # TS 类型
├── server/               # Express + TypeScript 后端
│   └── src/
│       ├── routes/       # 五大业务路由
│       ├── services/     # AI 请求与业务服务
│       ├── utils/        # prompt 与 JSON 解析
│       └── middleware/   # CORS、限流、错误处理
├── api/index.ts          # Vercel Serverless 入口
└── vercel.json           # 部署重写配置
```

---

## 3) 前端页面清单（含模块/API）

| 路径 | 页面文件 | 模块 | 主要能力 | 调用 API |
|---|---|---|---|---|
| `/` | `client/src/pages/HomePage.tsx` | 首页 | 模块入口导航、功能介绍 | 无 |
| `/flashcards` | `client/src/pages/FlashcardsPage.tsx` | 闪卡学习 | 输入文本提词、翻卡学习、朗读、进度 | `POST /api/v1/flashcards/extract` |
| `/sentence` | `client/src/pages/SentenceAnalysisPage.tsx` | 句子分析 | 句法分析、成分高亮、最近历史 | `POST /api/v1/sentence/analyze` |
| `/reading` | `client/src/pages/ReadingPage.tsx` | 双语阅读 | 中英生成、词汇提取、收藏、跳测验 | `POST /api/v1/reading/generate` |
| `/quiz` | `client/src/pages/QuizPage.tsx` | 理解测试 | 阅读题/词汇题、判分、错题回顾 | `POST /api/v1/quiz/reading-questions`；`POST /api/v1/quiz/vocabulary-questions` |
| `/achievements` | `client/src/pages/AchievementsPage.tsx` | 学习成就 | 报告生成、统计展示、分享文案 | `POST /api/v1/report/generate` |

### 前端公共入口/路由
- `client/src/App.tsx`：路由注册（6 个页面）
- `client/src/components/layout/Layout.tsx`：页面框架
- `client/src/components/layout/Navbar.tsx`：导航 + 设置入口
- `client/src/components/settings/SettingsDialog.tsx`：AI 配置保存与连通测试
- `client/src/lib/api.ts`：统一 API 调用与 `aiConfig` 自动注入

---

## 4) 后端路由清单

### 系统路由
| 方法 | 路径 | 文件 | 作用 |
|---|---|---|---|
| `GET` | `/api/v1/health` | `server/src/index.ts` | 健康检查 |
| `POST` | `/api/v1/ai/test` | `server/src/index.ts` | 测试 AI 配置可用性 |

### 业务路由（五大模块）
| 方法 | 路径 | 路由文件 | 服务函数 |
|---|---|---|---|
| `POST` | `/api/v1/flashcards/extract` | `server/src/routes/flashcards.ts` | `extractWords` |
| `POST` | `/api/v1/sentence/analyze` | `server/src/routes/sentence.ts` | `analyzeSentence` |
| `POST` | `/api/v1/reading/generate` | `server/src/routes/reading.ts` | `generateReadingContent` |
| `POST` | `/api/v1/quiz/reading-questions` | `server/src/routes/quiz.ts` | `generateReadingQuestions` |
| `POST` | `/api/v1/quiz/vocabulary-questions` | `server/src/routes/quiz.ts` | `generateVocabularyQuestions` |
| `POST` | `/api/v1/report/generate` | `server/src/routes/report.ts` | `generateLearningReport` |

### 路由共性
- 全部挂在 `server/src/index.ts` 的 `/api/v1/*`
- 经 `rateLimiter` 限流（默认每分钟 20 次）
- 经 `errorHandler` 做统一错误输出
- AI 请求由 `server/src/services/ai-service.ts` 统一发送到 `baseUrl/chat/completions`

---

## 5) 五大模块数据流（重点）

## 5.1 闪卡学习（Flashcards）
1. 用户在 `FlashcardsPage` 输入英文文本 + 难度等级。
2. 前端调用 `api.flashcards.extract(text, maxWords, level)`。
3. `client/src/lib/api.ts` 自动从 `localStorage['ai-config']` 注入 `aiConfig` 到 POST body。
4. 后端路由 `/flashcards/extract` 校验入参并调用 `extractWords`。
5. `ai-service` 构造提词 Prompt（`buildExtractWordsPrompt`）并请求 LLM。
6. `parseJsonResponse` 解析 AI 返回 JSON。
7. 前端保存结果到 `localStorage['flashcards']`，并驱动翻卡 UI / 语音朗读。

## 5.2 句子分析（Sentence Analysis）
1. 用户在 `SentenceAnalysisPage` 输入句子。
2. 前端调用 `api.sentence.analyze(sentence)`。
3. 后端 `/sentence/analyze` -> `analyzeSentence`。
4. `ai-service` 使用 `buildAnalyzeSentencePrompt` 请求模型。
5. 解析后返回 `SentenceAnalysis` 结构化结果。
6. 前端渲染结构、从句、时态、成分、短语、语法点；并缓存到 `localStorage['sentenceHistory']`。

## 5.3 双语阅读（Reading）
1. 用户输入英文/中文文本并选择方向（`en` 或 `zh`）。
2. 前端调用 `api.reading.generate(text, language)`。
3. 后端 `/reading/generate` -> `generateReadingContent`。
4. `ai-service` 用 `buildReadingContentPrompt` 调 LLM，返回 `english/chinese/vocabulary`。
5. 后端额外校验返回结构（必须有 `english`、`chinese`、`vocabulary[]`）。
6. 前端展示双语内容与词汇，保存历史到 `localStorage['readingHistory']`，收藏到 `localStorage['readingFavorites']`。
7. 点击“生成测试”通过路由状态把当前阅读传到 `/quiz`。

## 5.4 理解测试（Quiz）
1. `QuizPage` 从 `location.state.currentReading` 获取阅读上下文。
2. 用户选择题型：
   - 阅读理解：`api.quiz.readingQuestions(currentReading.english)`
   - 词汇测试：`api.quiz.vocabularyQuestions(currentReading.vocabulary)`
3. 后端 `/quiz/*` 路由调用对应服务函数，基于阅读或词汇生成题目。
4. 前端完成答题、即时判定、解释展示、错题回顾。
5. 测试结果持久化到 `localStorage['testHistory']`。

## 5.5 学习成就（Achievements / Report）
1. 页面读取本地学习数据：`flashcards`、`readingHistory`、`testHistory`。
2. 前端将聚合数据作为 `learningData` 调用 `api.report.generate(reportType, learningData)`。
3. 后端 `/report/generate` -> `generateLearningReport`，由 Prompt 生成结构化报告。
4. 返回后前端渲染统计卡片、优势弱点、建议。
5. 报告写入 `localStorage['reportHistory']`，并支持复制分享文案。

### 模块间关键依赖
- `阅读 -> 测验`：通过 Router state 传递当前阅读内容（刷新页面可能丢失）。
- `闪卡/阅读/测验 -> 成就`：通过 localStorage 聚合形成学习报告输入。
- `设置 -> 全模块`：`ai-config` 是所有 AI API 调用的前置依赖。

---

## 6) 各模块 API 端点汇总

| 模块 | API 端点 | 请求关键字段 |
|---|---|---|
| 闪卡学习 | `POST /api/v1/flashcards/extract` | `text`, `maxWords`, `level`, `aiConfig` |
| 句子分析 | `POST /api/v1/sentence/analyze` | `sentence`, `aiConfig` |
| 双语阅读 | `POST /api/v1/reading/generate` | `text`, `language`, `aiConfig` |
| 理解测试-阅读 | `POST /api/v1/quiz/reading-questions` | `reading`, `questionCount`, `aiConfig` |
| 理解测试-词汇 | `POST /api/v1/quiz/vocabulary-questions` | `vocabulary`, `questionCount`, `aiConfig` |
| 学习成就 | `POST /api/v1/report/generate` | `reportType`, `learningData`, `aiConfig` |
| 设置连通测试 | `POST /api/v1/ai/test` | `aiConfig` |
| 系统健康检查 | `GET /api/v1/health` | 无 |

---

## 7) 关键文件路径（高频改造点）

### 前端业务
- `client/src/App.tsx`：前端路由总入口
- `client/src/pages/FlashcardsPage.tsx`
- `client/src/pages/SentenceAnalysisPage.tsx`
- `client/src/pages/ReadingPage.tsx`
- `client/src/pages/QuizPage.tsx`
- `client/src/pages/AchievementsPage.tsx`

### 前端基础设施
- `client/src/lib/api.ts`：统一请求、错误处理、`aiConfig` 自动注入
- `client/src/lib/ai-providers.ts`：支持的模型服务商预设
- `client/src/components/settings/SettingsDialog.tsx`：AI 配置 UI
- `client/src/hooks/use-local-storage.ts`：本地持久化
- `client/src/hooks/use-theme.ts`：主题切换
- `client/src/hooks/use-tts.ts`：语音朗读
- `client/src/index.css`：全局样式与视觉系统

### 后端业务
- `server/src/index.ts`：Express 启动与路由挂载
- `server/src/routes/*.ts`：五大模块 API
- `server/src/services/ai-service.ts`：统一 LLM 请求、BaseURL 校验
- `server/src/utils/prompt-builder.ts`：Prompt 模板
- `server/src/utils/json-parser.ts`：LLM JSON 容错解析

### 后端中间件与配置
- `server/src/middleware/rate-limiter.ts`
- `server/src/middleware/error-handler.ts`
- `server/src/middleware/cors.ts`
- `server/src/config.ts`

### 部署
- `api/index.ts`：Vercel serverless 导出
- `vercel.json`：路由重写策略
- `client/vite.config.ts`：本地开发代理（`/api -> localhost:3001`）

---

## 8) 如果你要把它改成“自己的产品”：实现计划

## Phase 0: 目标与品牌（1-2 天）
1. 明确目标用户（考研、雅思、职场英语、K12）。
2. 确定品牌信息：产品名、Logo、色板、语气。
3. 替换全局文案与元信息（标题、Footer、首页介绍）。

交付物：品牌版首页 + 导航文案 + 产品定位说明。

## Phase 1: 视觉重构与体验美化（3-5 天）
1. 在 `client/src/index.css` 建立设计令牌（颜色、圆角、阴影、间距、字号）。
2. 统一卡片、按钮、输入框、空状态、加载动画的视觉规范。
3. 优化移动端体验（闪卡滑动、测验选项点击区、弹窗适配）。
4. 强化模块转场动效与反馈（成功/失败/加载态）。

交付物：完整 UI 主题系统 + 响应式体验优化。

## Phase 2: 功能升级（5-10 天）
1. 闪卡：加入“掌握/生词/复习”状态与复习队列。
2. 句子分析：支持逐词 hover 解释和导出学习笔记。
3. 双语阅读：支持主题模板（科技/职场/考试）和难度等级。
4. 测验：支持错题本、重练错题、限时模式。
5. 成就：报告模板多样化（学习周报卡片、图表化趋势）。

交付物：模块从“演示型”升级到“可持续学习型”。

## Phase 3: 数据与架构增强（5-7 天）
1. 引入用户体系（登录/匿名会话），把 localStorage 迁到后端持久化。
2. 增加后端数据层（SQLite/PostgreSQL）管理学习记录。
3. 改造“阅读 -> 测验”数据传递，避免仅靠 Router state（防刷新丢失）。
4. 为关键接口增加参数校验（zod/joi）和统一响应结构。

交付物：多端可同步、数据不丢失、可扩展架构。

## Phase 4: 质量与运维（3-5 天）
1. 前端增加关键流程测试（阅读生成、测验流程、报告生成）。
2. 后端补充路由与服务单测，覆盖 JSON 解析异常场景。
3. 增加日志与监控（请求耗时、错误率、模型调用失败率）。
4. 增加环境变量模板与发布前检查清单。

交付物：可稳定迭代与上线的工程质量基线。

## Phase 5: 上线与增长（持续）
1. 配置自己的 AI 供应商白名单与配额策略。
2. 增加分享落地页（从“复制文案”升级为“可访问海报页”）。
3. 观察用户行为，优先迭代高频路径（阅读->测验->成就）。

交付物：从“个人项目”升级为“可运营产品”。

---

## 9) 建议你优先改的 10 个点（最短路径）

1. 先统一品牌（名称、色彩、文案）。
2. 改 `index.css` 设计令牌，避免零散样式漂移。
3. 把 `reading -> quiz` 的数据从 Router state 改为持久化或后端会话。
4. 为五大 API 增加入参 schema 校验。
5. 为 `api.ts` 增加请求超时与重试策略。
6. 优化错误提示（区分网络错误/模型错误/解析错误）。
7. 增加“学习计划”与“连续学习天数”。
8. 增加错题本与复习提醒。
9. 报告页增加图表组件（趋势更直观）。
10. 加上最小可用测试与 CI（至少 lint + build + smoke test）。

---

## 10) 当前仓库观察到的注意点

1. `CLAUDE.md` 中描述的是旧架构（Vanilla JS），与当前 React + Express 实际代码不一致，后续可更新避免误导。
2. 目前学习数据主要在 localStorage，适合单机体验，不适合多端同步。
3. AI 配置由前端透传，后端已做基础 URL 安全校验（协议、内网、白名单），上线时建议强制开启 host allowlist。

