# Flashcards Regression Checklist (P2-F-06)

Date: 2026-02-25  
Owner: Codex

## Scope
- 抽词（参数边界、返回契约）
- 翻卡与队列导航
- 学习状态更新（三态）
- 朗读触发（单词/例句）
- 历史持久化（词卡 + 会话统计）

## Checklist Results
- [x] 抽词参数边界：`maxWords` 在前端仅允许 `5/10/15/20/30`，后端校验范围 `1..30`。非法值会被拦截并返回可读错误。
- [x] 抽词返回契约：后端对 AI 返回做结构归一化并在异常结构时显式报错，避免前端 JSON 形状崩溃。
- [x] 翻卡与导航：支持点击翻转、键盘左右切换、空格翻转、触摸滑动；展示顺序来自复习队列映射。
- [x] 状态更新：`标记生词/加入复习/标记掌握` 会同步更新 `learningStatus/nextReviewAt/reviewCount/accuracy`。
- [x] 会话统计：展示并持久化 `当次学习量/当次正确率/待复习量`，并共享到成就模块。
- [x] 朗读按钮：单词正面朗读 `word.word`，背面朗读 `word.example || word.word`。
- [x] 持久化恢复：`flashcards` 与 `flashcardSessionSummary` 通过 localStorage 保存，清空词卡时同步重置会话摘要。

## Validation Commands
- `cd client && npm run lint` ✅
- `npm run build` ✅ (includes `server` + `client` build)

## Conclusion
- 当前无阻塞级回归问题（基于代码路径核查 + 构建验证）。
- 发布前建议做一次浏览器手工冒烟：完成“提词 -> 翻卡 -> 三态标记 -> 成就页查看会话统计”全链路。
