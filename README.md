# English Learning Assistant

基于 LLM 的英语学习助手，当前仓库已经演进为一个前后端分离、带服务端持久化的学习系统，而不再只是纯前端 Demo。用户可在浏览器内配置 AI 提供商，完成闪卡学习、句子分析、双语阅读、理解测验、学习报告与分享等完整学习闭环。

## 当前能力

- 闪卡学习：从文本中提取词汇，支持词义、词源、例句、复习状态与历史记录。
- 句子分析：对输入句子做语法拆解、释义与重点结构分析。
- 双语阅读：按主题、难度、长度生成中英对照阅读内容，并提取词汇。
- 理解测验：支持阅读题和词汇题，包含难度、题量、限时模式与历史记录。
- 学习成就：基于学习历史生成 AI 报告，并支持分享页访问与埋点统计。
- 数据迁移：首次进入应用时，会把旧版 `localStorage` 中的数据自动回填到服务端 SQLite。
- AI 提供商策略：前端支持 DeepSeek、OpenAI、Groq、Moonshot 和自定义 OpenAI 兼容接口；后端支持可选的 fallback provider 配额策略。

## 技术栈

| 层 | 技术 |
| --- | --- |
| 前端 | React 19 + TypeScript + React Router 7 + Tailwind CSS v4 + Vite |
| 后端 | Express 4 + TypeScript |
| 数据 | SQLite（通过 `sqlite3` CLI 执行迁移与查询） |
| AI | OpenAI 兼容 Chat Completions 接口 |
| 测试/质量 | Node test runner + ESLint + GitHub Actions CI |
| 部署 | Vercel（静态前端 + `api/index.ts` Serverless 入口） |

## 仓库结构

```text
.
├── api/
│   └── index.ts                  # Vercel Serverless 入口，复用 Express app
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/           # 导航、布局、模块区块
│   │   │   ├── settings/         # AI 配置 Banner / 设置弹窗
│   │   │   └── ui/               # Button、Card、Toast 等基础组件
│   │   ├── hooks/                # localStorage、主题、TTS
│   │   ├── lib/                  # API client、session、provider、URL 工具
│   │   ├── pages/                # Home / Flashcards / Sentence / Reading / Quiz / Achievements / Share
│   │   └── types/                # 前端类型定义
│   ├── tests/                    # 前端单测
│   └── vite.config.ts            # Vite dev server，代理 /api -> 3001
├── server/
│   ├── src/
│   │   ├── middleware/           # CORS、限流、请求追踪、错误处理
│   │   ├── repositories/         # SQLite client 与学习数据仓储
│   │   ├── routes/               # flashcards / sentence / reading / quiz / report / migration
│   │   ├── services/             # AI 调用与 provider 策略
│   │   └── utils/                # 校验、日志、响应封装、prompt 构造
│   ├── migrations/               # SQLite schema 迁移
│   ├── scripts/                  # 迁移、e2e flow、回滚演练、运维报表
│   ├── tests/                    # 后端单测
│   └── data/                     # 默认 SQLite 数据文件目录
├── code/                         # 产品/测试/运维相关文档
├── memory_bank/                  # 协作文档与执行记录
├── package.json                  # 根脚本，负责串起 client/server
└── vercel.json                   # Vercel 安装、构建与 rewrite 配置
```

## 运行方式

### 前置条件

- Node.js 22.x（CI 使用 Node 22，当前仓库按该版本维护）
- npm
- `sqlite3` CLI

如果本机没有 `sqlite3`，服务端迁移和 SQLite 持久化功能无法使用。

### 安装依赖

```bash
npm install
cd server && npm install
cd ../client && npm install
```

### 环境变量

后端使用 `dotenv` 从 `server/.env` 读取本地配置。可以直接把根目录的示例文件复制过去：

```bash
cp .env.example server/.env
```

常用变量如下：

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `PORT` | `3001` | 本地 Express 端口 |
| `NODE_ENV` | `development` | 运行环境 |
| `AI_REQUEST_TIMEOUT_MS` | `90000` | AI 请求超时 |
| `ALLOW_PRIVATE_AI_HOSTS` | `0` | 是否允许本地/内网 AI 地址 |
| `ALLOWED_AI_HOSTS` | 示例见 `.env.example` | AI Base URL 白名单 |
| `AI_PROVIDER_PRIMARY_DAILY_QUOTA` | `2000` | 前端传入主 provider 的日限额 |
| `AI_PROVIDER_FALLBACK_DAILY_QUOTA` | `500` | fallback provider 默认日限额 |
| `AI_FALLBACK_PROVIDERS` | 空 | 服务端 fallback providers 的 JSON 数组 |
| `SQLITE_DB_PATH` | `server/data/english-learning.db` | SQLite 文件位置 |
| `SQLITE_BIN` | 自动探测 | `sqlite3` 可执行文件路径 |
| `ENABLE_DB_PERSISTENCE` | `1` | 设为 `0` 可关闭服务端持久化 |
| `CLIENT_ORIGIN` | 无 | 生产环境前端域名，用于 CORS |

### 初始化数据库

首次启动前建议先执行迁移：

```bash
cd server && npm run db:migrate
```

### 启动开发环境

```bash
# 终端 1：后端
npm run dev:server

# 终端 2：前端
npm run dev:client
```

默认地址：

- 前端：`http://localhost:5173`
- 后端：`http://localhost:3001`
- API 基础路径：`/api/v1`
- 健康检查：`GET http://localhost:3001/api/v1/health`

前端开发环境通过 Vite 代理把 `/api` 转发到 `http://localhost:3001`。

### 首次使用

启动后，在页面设置中填写 AI 配置即可开始使用。默认预置了：

- DeepSeek
- OpenAI
- Groq
- Moonshot
- 自定义 OpenAI 兼容接口

默认情况下，用户填写的 AI 配置保存在浏览器本地，并由前端在请求时注入到后端。服务端不会替你托管这部分用户自填密钥。

## API 概览

当前后端主要入口在 `/api/v1`：

- `GET /api/v1/health`
- `POST /api/v1/ai/test`
- `POST /api/v1/flashcards/extract`
- `GET /api/v1/flashcards/history`
- `POST /api/v1/sentence/analyze`
- `GET /api/v1/sentence/history`
- `POST /api/v1/reading/generate`
- `GET /api/v1/reading/history`
- `POST /api/v1/quiz/reading-questions`
- `POST /api/v1/quiz/vocabulary-questions`
- `POST /api/v1/quiz/history/sync`
- `GET /api/v1/quiz/history`
- `POST /api/v1/report/generate`
- `GET /api/v1/report/history`
- `POST /api/v1/report/share`
- `GET /api/v1/report/share/:shareId`
- `POST /api/v1/report/share/:shareId/events`
- `GET /api/v1/migration/status`
- `POST /api/v1/migration/backfill`

## 测试与常用脚本

根目录：

```bash
npm run dev:server
npm run dev:client
npm run build
```

后端：

```bash
cd server
npm run dev
npm run build
npm run test
npm run db:migrate
npm run test:e2e-flow
npm run drill:rollback
npm run ops:daily-report
npm run ops:top3-summary
```

前端：

```bash
cd client
npm run dev
npm run lint
npm run build
npm run test
```

CI 位于 `.github/workflows/ci.yml`，会执行：

- server build
- server tests
- server key flow regression
- client lint
- client build
- client tests

## 数据与状态

- 服务端通过 `x-anonymous-session-id` 维护匿名会话粒度的数据归属。
- SQLite 默认文件位于 `server/data/english-learning.db`。
- 应用启动时会检查旧版 `localStorage` 数据，并在数据库为空时自动触发一次 backfill。
- 分享报告页路由为 `/share/:shareId`，对应服务端分享与埋点接口。

## 部署

项目已适配 Vercel：

- `api/index.ts` 作为 Serverless Function 入口，直接导出 Express app。
- `vercel.json` 将 `/api/(.*)` 重写到 `/api`，将其余路由重写到前端 `index.html`。
- 构建产物目录为 `client/dist`。

生产环境建议至少配置：

- `NODE_ENV=production`
- `CLIENT_ORIGIN`
- `ALLOWED_AI_HOSTS`
- 可选的 `AI_FALLBACK_PROVIDERS`

## License

MIT
