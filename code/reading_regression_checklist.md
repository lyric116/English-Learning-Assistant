# Reading Module Regression Checklist (P2-R-06)

Date: 2026-02-25  
Owner: Codex

## Scope
- 生成参数切换（language/topic/difficulty/length）
- 模板切换与配置摘要一致性
- 收藏能力（收藏/取消、标签、搜索、排序）
- 阅读结果到测验上下文衔接
- 错误提示与恢复路径

## Checklist Results
- [x] 参数切换：阅读输入区可独立切换方向/主题/难度/篇幅，参数会随请求发送。
- [x] 配置摘要：输入区与结果区均展示当前 `generationConfig`，与实际请求参数一致。
- [x] 模板预设：一键模板可更新参数组合并即时反映到摘要区域。
- [x] 收藏基础流程：支持添加收藏、取消收藏、收藏回放加载当前阅读。
- [x] 收藏增强：支持标签增删、关键词搜索、排序（最新/最早/标题/词汇数）。
- [x] 阅读到测验：继续保留 `quizCurrentReading` 持久上下文写入，满足刷新恢复路径。
- [x] 错误提示：请求异常时展示 `FeedbackAlert` + toast，可通过重试恢复。

## Validation Commands
- `cd server && npm run build` ✅
- `cd client && npm run lint` ✅
- `cd client && npm run build` ✅

## Conclusion
- 阅读模块在当前改造范围内无构建级回归阻塞。
- 发布前建议浏览器手工抽查真实 AI 调用场景，确认不同参数组合输出差异符合预期。
