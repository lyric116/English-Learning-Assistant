# Architecture Phase Integration Regression (P3-09)

Date: 2026-02-26  
Owner: Codex

## Scope
- 阅读 -> 测验 -> 成就 数据链路在后端持久化阶段的集成一致性
- 跨会话隔离（不同 anonymous session）
- 同会话恢复（local 清空后后端回放）
- 回填机制（local -> server）

## Checklist Results
- [x] 阅读持久化：`persistReadingContent` 后可通过 `getReadingHistory` 回放。
- [x] 测验持久化：`persistQuizResult` 后可通过 `getQuizHistory` 回放（含 score/readingTitle）。
- [x] 报告持久化：`persistLearningReport` 后可通过 `getReportHistory` 回放。
- [x] 双写回填：`runBackfill` 可一次写入五模块历史，`getBackfillStatus` 计数与输入一致。
- [x] 跨会话隔离：不同 owner（匿名会话 ID）互不可见。
- [x] 同会话恢复：相同 owner 在“本地为空”场景可从后端读取历史。
- [x] 前端回源逻辑：Reading/Quiz/Achievements/Flashcards/Sentence 均已具备 local-empty fallback。 

## Validation Commands
- `cd server && npm run build` ✅
- `cd client && npm run lint` ✅
- `cd client && npm run build` ✅
- `SQLITE_DB_PATH=/tmp/english-learning-p309-test.db npm run db:migrate` ✅
- 仓储集成验证（同会话写入 + 跨会话查询 + backfill/status）✅

## Scenario Notes
- Cross-session: `ownerA` 写入后，`ownerB` 查询为 0；`ownerA` 查询有数据。
- Refresh/local reset equivalent: 在 local 数据为空时，通过后端历史接口/仓储读取恢复同 owner 历史。
- Re-login equivalent: 当前项目尚未实现真实登录态（token 会话在 P3-02 设计阶段），本回归以 `owner_id` 切换模拟“重新进入不同身份上下文”。

## Environment Limitation
- 当前沙箱禁止本地监听端口（`listen EPERM`），无法执行真实 HTTP 端到端回归；已使用仓储层与迁移/回填链路做等效验证。

## Conclusion
- P3 架构阶段在当前实现边界内通过集成回归，后续可进入 P4 质量与运维阶段。
