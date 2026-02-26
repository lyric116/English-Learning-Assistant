# P5-03 Preprod UAT & Rollback Drill

Date: 2026-02-26  
Owner: Codex

## UAT Scope
- 闪卡：提词 + 历史恢复
- 句子分析：分析 + 历史恢复
- 阅读：生成 + 参数回显
- 测验：出题 + 结果同步
- 成就：报告生成 + 分享链接
- 分享页：匿名访问 + 转化埋点

## Automated UAT Gate (local equivalent)
- `cd server && npm run build` ✅
- `cd server && npm run test` ✅
- `cd server && npm run test:e2e-flow` ✅
- `cd client && npm run lint` ✅
- `cd client && npm run build` ✅
- `cd client && npm run test` ✅

Result: automated gate pass rate 6/6 (100%).

## Rollback Drill Script
- Script: `server/scripts/rollback-drill.js`
- Command: `cd server && npm run drill:rollback`
- Drill flow:
  1. migrate target DB
  2. insert stable marker row
  3. backup DB file
  4. insert mutation marker
  5. restore from backup
  6. assert stable marker exists and mutation marker removed

## Rollback Drill Result
- Status: ✅ Passed
- Evidence: `ROLLBACK_DRILL_OK ... durationMs=<value>`

## Notes
- 当前为单机 SQLite 回滚演练基线；生产多实例建议补充：
  - schema rollback playbook
  - backup retention policy
  - cross-instance consistency checks.
