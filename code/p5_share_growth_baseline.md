# P5-02 Share Landing & Growth Tracking Baseline

Date: 2026-02-26  
Owner: Codex

## Scope
- 将“复制文案分享”升级为可访问链接落地页。
- 记录分享访问与转化事件（visit/convert）。

## Backend
- Migration:
  - `server/migrations/003_create_report_shares.sql`
  - new table `report_shares` with counters (`view_count`, `conversion_count`).
- Repository:
  - `createSharedReport`
  - `getSharedReport`
  - `trackSharedReportEvent`
- API routes (`server/src/routes/report.ts`):
  - `POST /api/v1/report/share`
  - `GET /api/v1/report/share/:shareId`
  - `POST /api/v1/report/share/:shareId/events`

## Frontend
- API client (`client/src/lib/api.ts`):
  - `report.createShare`
  - `report.getShared`
  - `report.trackShareEvent`
- Achievements share dialog:
  - supports “生成分享链接” + “复制链接” in addition to structured-text copy.
- New landing page:
  - `client/src/pages/SharedReportPage.tsx`
  - route: `/share/:shareId`
  - on load tracks `visit`; CTA click tracks `convert`.

## Validation
- `cd server && SQLITE_DB_PATH=/tmp/english-learning-p502.db npm run db:migrate` ✅
- `cd server && npm run build` ✅
- `cd server && npm run test` ✅
- `cd server && npm run test:e2e-flow` ✅
- `cd client && npm run lint` ✅
- `cd client && npm run build` ✅
- `cd client && npm run test` ✅

## Note
- 当前埋点存储在 SQLite `report_shares` 表，满足 MVP 增长闭环；后续可对接外部分析平台并加入更多事件维度。
