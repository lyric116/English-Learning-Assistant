# 当前功能基线（P0-04/P0-05）

更新时间：2026-02-25

## 模块级基线状态

| 模块 | 入口页面 | 当前结论 | 证据 |
|---|---|---|---|
| 闪卡学习 | `/flashcards` | 核心流程可用（真实 AI 返回成功） | `POST /api/v1/flashcards/extract` 返回 200，约 20.32s |
| 句子分析 | `/sentence` | 核心流程可用（真实 AI 返回成功） | `POST /api/v1/sentence/analyze` 返回 200，约 24.13s |
| 双语阅读 | `/reading` | 核心流程可用（真实 AI 返回成功） | `POST /api/v1/reading/generate` 返回 200，约 14.09s |
| 理解测验 | `/quiz` | 核心流程可用（阅读题 + 词汇题均成功） | `POST /api/v1/quiz/reading-questions` 返回 200；`/vocabulary-questions` 返回 200 |
| 学习成就 | `/achievements` | 核心流程可用（报告可生成） | `POST /api/v1/report/generate` 返回 200，约 13.07s |

## API 基线检查（提权运行）

1. `GET /api/v1/health` -> `200 OK`。
2. `GET /api/v1` -> `200 OK`，返回端点清单。
3. `POST /api/v1/ai/test` with `{}` -> `400`，错误可解释（缺少 aiConfig）。
4. `POST /api/v1/ai/test` with dummy aiConfig -> `502`，错误可解释（上游认证失败）。
5. `POST /api/v1/reading/generate` with `{}` -> `400`（字段校验错误）。
6. `POST /api/v1/quiz/vocabulary-questions` with empty list -> `400`（数组长度校验）。

## 结论

- `P0-04`：已完成（五大模块均有成功日志证据）。
- `P0-05`：已完成（健康检查 + AI 测试接口在有效/无效配置下均返回可解释结果）。
- 仍建议补充一次真实前端 UI 手工录像作为可视化证据（非阻塞项）。
