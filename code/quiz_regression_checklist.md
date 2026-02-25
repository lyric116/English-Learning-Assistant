# Quiz Module Regression Checklist (P2-Q-06)

Date: 2026-02-25  
Owner: Codex

## Scope
- 出题参数配置（题型/难度/题量/限时）
- 普通出题与错题重练出题
- 限时模式计时与交卷路径
- 判分与解析展示一致性
- 错题本写入与重练入口联动

## Checklist Results
- [x] 参数配置：题量/难度/限时参数可配置并随请求发送，非法参数会被前后端拦截。
- [x] 普通出题：阅读/词汇两种测试都可生成题目并进入答题流程。
- [x] 错题重练：从 Quiz 与 Achievements 两个入口进入时，题集均来自 `wrongQuestionBook` 且只含错题。
- [x] 限时模式：倒计时可见，支持提前交卷，超时自动交卷并给出提示。
- [x] 判分一致性：结果页与提交记录均来自统一 metrics 计算（score/accuracy/answered/unanswered）。
- [x] 解析展示：答题后统一展示“你的答案/正确答案/解析”；未作答在错题回顾中有明确标识。
- [x] 错题本：交卷后错题可落入错题本并累计重复次数与最近练习时间。

## Validation Commands
- `cd server && npm run build` ✅
- `cd client && npm run lint` ✅
- `cd client && npm run build` ✅

## Conclusion
- 测验模块在当前改造范围内无构建级回归阻塞。
- 建议发布前补一轮浏览器手工链路：普通出题 -> 限时超时交卷 -> 错题重练 -> 成就页入口回跳验证。
