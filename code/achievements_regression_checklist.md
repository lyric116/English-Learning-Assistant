# Achievements Module Regression Checklist (P2-A-04)

Date: 2026-02-25  
Owner: Codex

## Scope
- 报告生成主流程
- 模板切换与结构差异展示
- 趋势统计与个性化建议
- 结构化分享内容
- 历史报告加载与兼容

## Checklist Results
- [x] 报告生成：在存在学习数据时可触发 `POST /api/v1/report/generate` 并进入结果展示。
- [x] 模板切换：`weekly/exam_sprint/workplace_boost` 三模板均可切换，报告历史回放可恢复模板上下文。
- [x] 结构差异：同一报告可呈现模板化结构卡片（周报/冲刺/职场）并与模板定义一致。
- [x] 趋势统计：展示近 7 天 vs 前 7 天的学习频次、测试正确率、新增错题，并有方向与增减值提示。
- [x] 建议生成：页面可输出数据驱动建议，内容与趋势、错题规模、待复习量及弱项相关。
- [x] 分享升级：分享弹窗可预览结构化内容（标题/摘要/关键指标/趋势/行动项）并一键复制。
- [x] 历史兼容：加载旧报告时可补齐模板结构字段，不影响结果展示与分享。

## Validation Commands
- `cd server && npm run build` ✅
- `cd client && npm run lint` ✅
- `cd client && npm run build` ✅

## Conclusion
- 成就模块在本阶段改造范围内无构建级回归阻塞。
- 发布前建议浏览器手工抽查链路：生成报告 -> 切换模板 -> 加载历史 -> 打开分享并外部粘贴验证。
