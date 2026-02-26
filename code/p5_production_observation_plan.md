# P5-04 Production Release & 14-Day Observation Plan

Date: 2026-02-26  
Owner: Codex

## Goal
- 发布后形成可执行的 14 天观测节奏，沉淀下一轮迭代优先级。

## Daily Mechanism
- Generate daily metric report:
  - `cd server && npm run ops:daily-report`
  - output: `code/ops_daily_report_YYYY-MM-DD.md`
- Daily checks:
  - error-rate trend from structured logs
  - AI timeout/upstream failure trend
  - share funnel (`views -> conversions`)
  - core activity trend (reading/quiz/report)

## 14-Day Cadence
- Day 1-3:
  - watch stability and timeout spikes
  - validate share funnel baseline
- Day 4-10:
  - inspect conversion bottlenecks
  - collect top user-friction paths
- Day 11-14:
  - aggregate daily reports
  - produce top-3 prioritized backlog items

## Release Gate Snapshot
- `cd server && npm run build` ✅
- `cd server && npm run test` ✅
- `cd server && npm run test:e2e-flow` ✅
- `cd client && npm run lint` ✅
- `cd client && npm run build` ✅
- `cd client && npm run test` ✅

## End-of-Window Deliverable Template
- Top 1: [Issue / metric impact / owner / ETA]
- Top 2: [Issue / metric impact / owner / ETA]
- Top 3: [Issue / metric impact / owner / ETA]
