# P4-04 E2E Key Flow Checklist (Reading -> Quiz -> Achievements)

Date: 2026-02-26  
Owner: Codex

## Scope
- 主链路：阅读生成 -> 测验结果 -> 成就报告
- 关键断言：三模块数据均可写入并回放
- 关键断言：测验成绩有效并可用于成就统计输入

## Executable Regression
- Script: `server/scripts/e2e-main-flow-sim.js`
- Command: `cd server && npm run test:e2e-flow`
- Assertions in script:
  - reading history count >= 1
  - quiz history count >= 1
  - report history count >= 1
  - quiz score > 0

## Validation Commands
- `cd server && npm run build` ✅
- `cd client && npm run lint` ✅
- `cd client && npm run build` ✅
- `cd server && npm run test:e2e-flow` ✅

## Environment Note
- 当前沙箱禁止本地端口监听（`listen EPERM`），无法执行真实浏览器 HTTP 端到端。
- 本阶段采用可执行主链路仿真脚本完成等效回归，并保留后续接入 Playwright/Cypress 的接口空间。
