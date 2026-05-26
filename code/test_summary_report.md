# 测试分析报告

生成时间：2026-05-20T13:28:27.661Z

## 如何运行

| 范围 | 命令 |
| --- | --- |
| 后端单元/接口/数据测试 | `cd server && npm run test` |
| 后端覆盖率 | `cd server && npm run test:coverage` |
| 前端逻辑测试 | `cd client && npm run test` |
| 前端覆盖率 | `cd client && npm run test:coverage` |
| 主流程回归 | `cd server && npm run test:e2e-flow` |
| AI Mock 主流程 | `cd server && npm run test:e2e-ai-mock-flow` |
| 分享主流程 | `cd server && npm run test:e2e-share-flow` |
| 回滚演练 | `cd server && npm run drill:rollback` |
| 生成本报告 | `cd server && npm run test:summary` |

## 测试总结

| 指标 | 数值 |
| --- | ---: |
| Server 测试用例数 | 46 |
| Client 测试用例数 | 22 |
| 总测试用例数 | 68 |
| 测试通过率 | 100% |
| Server 覆盖率 | lines 74.07%, branches 62.92%, functions 83.43% |
| Client 覆盖率 | lines 87.21%, branches 81.66%, functions 71.43% |
| API 覆盖率 | 9 / 13 = 69% |
| Server 测试用例通过 | 46 / 46 |
| Client 测试用例通过 | 22 / 22 |
| 主流程测试结果 | 通过 |
| AI Mock 主流程结果 | 通过 |
| 分享主流程结果 | 通过 |
| 回滚演练结果 | 通过 |
| CI 检查项数量 | build / lint / test / coverage / e2e / rollback |

## 测试范围

| 测试层级 | 覆盖内容 | 脚本 |
| --- | --- | --- |
| 后端单元测试 | 参数校验、Prompt 汇总、JSON 解析、AI 服务 mock、provider fallback/base URL 策略 | `server/tests/**/*.test.ts` |
| 后端接口测试 | health、reading、quiz、report、migration、404 统一错误结构 | `server/tests/routes/*.test.ts` |
| 数据库测试 | migration 表结构、reading/quiz/report repository、匿名 session 隔离、share view/convert 计数 | `server/tests/db/*.test.ts`、`server/tests/repositories/*.test.ts` |
| 主流程集成测试 | 基础 reading/quiz/report 持久化链路、AI mock 学习链路、报告分享链路、回滚恢复 | `server/scripts/e2e-*.js`、`server/scripts/rollback-drill.js` |
| 前端逻辑测试 | API client、localStorage 容错、session、provider 配置、Base URL 校验、quiz 计分、报告展示格式、迁移 payload | `client/tests/*.test.ts` |

## 执行耗时

| 检查项 | 结果 | 耗时 |
| --- | --- | ---: |
| Server coverage | 通过 | 2.6s |
| Client coverage | 通过 | 0.3s |
| Main flow | 通过 | 1.0s |
| AI mock flow | 通过 | 1.0s |
| Share flow | 通过 | 1.1s |
| Rollback drill | 通过 | 0.2s |
