# Sentence Module Regression Checklist (P2-S-05)

Date: 2026-02-25  
Owner: Codex

## Scope
- 输入与触发分析
- 分析结果结构映射稳定性
- 逐词解释交互
- 语法点与短语联动
- 学习笔记导出与历史沉淀
- 错误提示与恢复路径

## Checklist Results
- [x] 输入触发：文本输入后可通过按钮触发分析；示例句可一键填充。
- [x] 返回映射：前后端均有归一化层，兼容旧字段命名并提供缺省值，避免空字段导致页面崩溃。
- [x] 逐词解释：句子中的可匹配词支持悬停/点击，解释面板稳定显示词义/词性/作用并可关闭。
- [x] 联动高亮：点击语法点可高亮关联短语，并在解释区域展示当前语法说明与关联片段。
- [x] 导出笔记：可导出可读笔记文本（原句/结构/语法点/短语），复制后可读性良好。
- [x] 笔记历史：导出笔记会持久化到 `sentenceNotesHistory`，支持重复制与清空。
- [x] 错误提示：请求失败可展示 `FeedbackAlert` + toast，并可通过再次分析恢复。

## Validation Commands
- `cd server && npm run build` ✅
- `cd client && npm run lint` ✅
- `cd client && npm run build` ✅

## Conclusion
- 句子模块当前无构建级和静态检查级回归阻塞。
- 发布前建议浏览器手工抽查一次完整链路：输入 -> 分析 -> 逐词解释 -> 语法联动 -> 导出笔记。
