

# 总体目标

让 Codex 帮你补成下面这套测试体系：

```text
单元测试
↓
接口测试
↓
数据库测试
↓
主流程集成测试
↓
覆盖率统计
↓
测试报告生成
↓
CI 自动执行
```

最终你汇报时可以拿出这些指标：

| 指标         | 说明                                |
| ---------- | --------------------------------- |
| 测试用例总数     | 一共有多少个 test case                  |
| 测试通过率      | 通过数 / 总数 × 100%                   |
| 接口覆盖率      | 已测试接口数 / 总接口数 × 100%              |
| 代码覆盖率      | line / branch / function coverage |
| 异常分支覆盖率    | 已测试异常场景数 / 设计异常场景数                |
| 主流程测试结果    | 阅读 → 测验 → 报告是否跑通                  |
| 数据库迁移成功率   | 迁移脚本是否成功                          |
| 回滚演练成功率    | 数据恢复是否正确                          |
| CI 质量门禁通过率 | build、lint、test 是否全部通过            |
| 运维统计指标     | 阅读数、测验数、平均分、分享转化率等                |

Node.js 自带 test runner 已经支持通过 `--experimental-test-coverage` 收集覆盖率，所以你可以不急着引入 Jest/Vitest，先沿用项目现有测试方式。([GitHub][2])

---

# 第一阶段：先补“覆盖率统计”和“测试报告脚本”

这是最适合汇报的，因为能直接量化。

## 需要让 Codex 做什么

让 Codex 修改 `server/package.json` 和 `client/package.json`，新增覆盖率命令。

### 后端新增

```json
"test:coverage": "node --experimental-strip-types --experimental-specifier-resolution=node --experimental-test-coverage --test tests/**/*.test.ts"
```

### 前端新增

```json
"test:coverage": "node --experimental-strip-types --experimental-specifier-resolution=node --experimental-test-coverage --test tests/**/*.test.ts"
```

当前后端和前端已经使用 `node --test tests/**/*.test.ts` 作为测试命令，所以这个改动是顺着原有技术栈做增强。

## 还要新增一个测试报告脚本

建议新增：

```text
server/scripts/test-summary-report.js
```

它负责输出一个 Markdown 报告，例如：

```text
code/test_summary_report.md
```

报告内容包括：

| 指标           |                        数值 |
| ------------ | ------------------------: |
| Server 测试用例数 |                      自动统计 |
| Client 测试用例数 |                      自动统计 |
| 总测试用例数       |                      自动统计 |
| 测试通过率        |                      自动统计 |
| Server 覆盖率   |           从 coverage 输出整理 |
| Client 覆盖率   |           从 coverage 输出整理 |
| E2E 主流程结果    |                   通过 / 失败 |
| 回滚演练结果       |                   通过 / 失败 |
| CI 检查项数量     | build / lint / test / e2e |

这个脚本不是必须非常复杂，哪怕先用 Markdown 人工/半自动生成也可以。你汇报时有一个 `test_summary_report.md` 截图就很有说服力。

---

# 第二阶段：补后端接口测试

这是你项目最缺、也最适合软件工程汇报的部分。

README 里列出了 19 个主要 API 入口，包括健康检查、AI 测试、闪卡、句子分析、阅读生成、测验、报告、分享和迁移接口。

## 建议新增测试文件

```text
server/tests/routes/health-route.test.ts
server/tests/routes/reading-route.test.ts
server/tests/routes/quiz-route.test.ts
server/tests/routes/report-route.test.ts
server/tests/routes/migration-route.test.ts
server/tests/routes/not-found-route.test.ts
```

## 优先测试这些接口

| 接口                                       | 测试内容                     |
| ---------------------------------------- | ------------------------ |
| `GET /api/v1/health`                     | 正常返回 `status: ok`        |
| `POST /api/v1/reading/generate`          | 空文本、非法难度、合法请求            |
| `POST /api/v1/quiz/reading-questions`    | 题目数量越界、缺少阅读内容            |
| `POST /api/v1/quiz/vocabulary-questions` | 题量越界、词汇数据为空              |
| `POST /api/v1/report/generate`           | 缺少学习数据、合法报告生成            |
| `GET /api/v1/report/share/:shareId`      | 不存在的分享 ID 返回错误           |
| `POST /api/v1/migration/backfill`        | 空数据、合法 localStorage 数据迁移 |
| 不存在路由                                    | 返回统一错误结构                 |

## 这部分能形成的量化指标

| 指标          | 计算方式                          |
| ----------- | ----------------------------- |
| API 覆盖率     | 已测试接口数 / 19 × 100%            |
| 接口测试通过率     | 通过接口用例数 / 接口测试总数 × 100%       |
| 异常输入覆盖数     | 空文本、非法类型、越界数量、缺字段等            |
| 错误响应一致性     | 是否统一返回 `success/code/message` |
| HTTP 状态码正确率 | 正确状态码数量 / 接口用例数量 × 100%       |


---

# 第三阶段：补 AI Mock 测试，避免真实调用大模型

你的项目依赖 OpenAI 兼容 Chat Completions 接口，并支持 DeepSeek、OpenAI、Groq、Moonshot 和自定义 OpenAI 兼容接口。

测试时不要真的调 AI，因为：

```text
1. 花钱
2. 慢
3. 结果不稳定
4. 老师复现不了
```

## 建议新增测试文件

```text
server/tests/services/ai-service.test.ts
server/tests/services/provider-policy.test.ts
server/tests/utils/ai-response-fixtures.test.ts
```

## 要测什么

| 测试点                 | 具体用例                      |
| ------------------- | ------------------------- |
| AI 成功返回             | Mock 返回合法 JSON            |
| AI 返回 Markdown JSON | ```json 包裹也能解析            |
| AI 返回噪声文本           | 前后有解释文字也能提取 JSON          |
| AI 返回非法 JSON        | 抛出解析错误                    |
| AI 超时               | 返回统一错误                    |
| Provider fallback   | 主 provider 失败后切换 fallback |
| Base URL 校验         | 非法地址或不允许的私有地址被拒绝          |
| Token/key 缺失        | 返回配置错误                    |

你已有 `json-parser.test.ts` 覆盖了一部分 AI JSON 解析能力，包括 Markdown JSON、噪声文本 JSON、非法 JSON。现在 Codex 要补的是：**AI 服务层 + provider 策略层 + 超时/fallback 行为**。

## 可量化指标

| 指标           | 说明                             |
| ------------ | ------------------------------ |
| AI Mock 用例数  | 例如 12 个                        |
| AI 异常覆盖率     | 已覆盖异常类型 / 设计异常类型               |
| fallback 成功率 | fallback 测试通过数 / fallback 测试总数 |
| AI 解析成功率     | 合法 Mock 响应成功解析数 / 合法响应总数       |
| AI 错误处理一致性   | 是否统一转成系统错误响应                   |

---

# 第四阶段：补数据库 Repository 测试

这个项目使用 SQLite 保存学习历史、测验历史、报告历史和分享数据；README 也说明服务端通过 `x-anonymous-session-id` 维护匿名会话粒度的数据归属。([GitHub][3])

## 建议新增测试文件

```text
server/tests/repositories/learning-data-repository.test.ts
server/tests/repositories/report-share-repository.test.ts
server/tests/db/migration.test.ts
```

## 要测什么

| 模块         | 测试内容                            |
| ---------- | ------------------------------- |
| 阅读历史       | 插入阅读内容后可以查回                     |
| 测验历史       | 插入测验结果后分数、题量、类型正确               |
| 学习报告       | 插入报告后可以按 owner 查询               |
| 分享报告       | 创建 shareId 后可以访问                |
| 分享埋点       | view_count、conversion_count 能递增 |
| 匿名 session | 不同 session 之间数据隔离               |
| 数据库迁移      | 迁移后核心表存在                        |
| 空数据库       | 空数据查询不报错                        |

## 可量化指标

| 指标             | 说明                       |
| -------------- | ------------------------ |
| Repository 用例数 | 数据层测试用例数量                |
| 数据写入成功率        | 成功写入次数 / 写入测试总数          |
| 数据读取正确率        | 读取结果正确次数 / 查询测试总数        |
| Session 隔离正确率  | 不串数据的测试通过率               |
| 迁移成功率          | migration 测试是否通过         |
| 分享埋点准确率        | view/conversion 计数是否符合预期 |

你项目里已经有 `e2e-main-flow-sim.js`，它会执行迁移、保存阅读内容、保存测验结果、保存学习报告，然后验证 reading、quiz、report 历史记录都能读出来。这个可以保留为主流程回归测试。

---

# 第五阶段：强化主流程集成测试

现在已经有：

```bash
cd server
npm run test:e2e-flow
```

这个脚本会模拟：

```text
db-migrate
↓
persist-reading
↓
persist-quiz
↓
persist-report
↓
verify-history
```

最后输出类似：

```text
E2E_SIM_OK reading=... quiz=... report=...
```

这已经非常适合汇报。([GitHub][5])

## 让 Codex 补充两个主流程

建议新增：

```text
server/scripts/e2e-ai-mock-flow.js
server/scripts/e2e-share-flow.js
```

## 主流程 1：AI Mock 学习流程

```text
Mock AI 生成阅读
↓
Mock AI 生成阅读题
↓
保存测验结果
↓
生成学习报告
↓
验证报告中包含平均分、阅读数量、薄弱词汇
```

## 主流程 2：报告分享流程

```text
生成报告
↓
创建分享链接
↓
访问分享页
↓
记录 view 事件
↓
记录 conversion 事件
↓
验证 view_count 和 conversion_count
```

## 可量化指标

| 指标       | 说明                          |
| -------- | --------------------------- |
| 主流程数量    | 例如 3 条：基础流程、AI Mock 流程、分享流程 |
| 主流程通过率   | 通过流程数 / 总流程数                |
| 学习链路完整性  | reading、quiz、report 是否都生成   |
| 分享链路完整性  | share、view、conversion 是否都记录 |
| E2E 执行耗时 | 每条流程运行时间                    |

---

# 第六阶段：补前端测试

前端现在只有 API client 和 localStorage 安全解析测试。([GitHub][6])

你可以让 Codex 先补“逻辑层测试”，不要一开始就搞复杂 UI E2E。

## 建议新增测试文件

```text
client/tests/session.test.ts
client/tests/provider-config.test.ts
client/tests/url-utils.test.ts
client/tests/report-format.test.ts
client/tests/quiz-scoring.test.ts
```

## 要测什么

| 模块                     | 测试内容                                |
| ---------------------- | ----------------------------------- |
| session                | 匿名 session id 是否能生成、保存、复用           |
| provider config        | DeepSeek/OpenAI/自定义 provider 配置是否正确 |
| API base URL           | 开发环境、生产环境 API 路径是否正确                |
| quiz scoring           | 答题分数是否计算正确                          |
| report formatting      | 报告数据是否能安全展示                         |
| localStorage migration | 旧数据是否能转换为后端需要的数据结构                  |

## 可量化指标

| 指标      | 说明                              |
| ------- | ------------------------------- |
| 前端单测数量  | 新增测试用例数量                        |
| 前端逻辑覆盖率 | hooks/lib/types 相关覆盖率           |
| 配置解析正确率 | provider config 用例通过率           |
| 缓存容错率   | 非法 localStorage 输入是否都能 fallback |
| 计分准确率   | 测验分数计算是否符合预期                    |

---



# 第八阶段：把测试接入 CI

当前 CI 已经会执行：

```text
server build
server tests
server key-flow regression
client lint
client build
client tests
```

这说明你的项目已经有基础质量门禁。

你应该让 Codex 把新增测试也接进去：

```yaml
- name: Server coverage
  run: cd server && npm run test:coverage

- name: Client coverage
  run: cd client && npm run test:coverage

- name: Server rollback drill
  run: cd server && npm run drill:rollback
```

还可以设置最低目标：

| 指标         |  建议阈值 |
| ---------- | ----: |
| 单元测试通过率    |  100% |
| 构建通过率      |  100% |
| Lint 通过率   |  100% |
| 后端行覆盖率     | ≥ 70% |
| 前端行覆盖率     | ≥ 60% |
| 核心工具函数覆盖率  | ≥ 80% |
| 核心 API 覆盖率 | ≥ 60% |
| 主流程通过率     |  100% |

---


# 最终建议新增的文件清单

你可以让 Codex 最终尽量补成这样：

```text
server/tests/routes/health-route.test.ts
server/tests/routes/reading-route.test.ts
server/tests/routes/quiz-route.test.ts
server/tests/routes/report-route.test.ts
server/tests/routes/migration-route.test.ts
server/tests/routes/not-found-route.test.ts

server/tests/services/ai-service.test.ts
server/tests/services/provider-policy.test.ts

server/tests/repositories/learning-data-repository.test.ts
server/tests/repositories/report-share-repository.test.ts
server/tests/db/migration.test.ts

client/tests/session.test.ts
client/tests/provider-config.test.ts
client/tests/url-utils.test.ts
client/tests/quiz-scoring.test.ts
client/tests/report-format.test.ts
client/tests/local-storage-migration.test.ts

server/scripts/e2e-ai-mock-flow.js
server/scripts/e2e-share-flow.js
server/scripts/test-summary-report.js
```

---

# 汇报时可以形成的测试分析表

| 测试层级  | 当前已有                                           | 建议新增                                        | 量化指标                   |
| ----- | ---------------------------------------------- | ------------------------------------------- | ---------------------- |
| 单元测试  | JSON 解析、参数校验、Prompt 汇总、API Client、localStorage | session、provider、quiz scoring、report format | 用例数、通过率、函数覆盖率          |
| 接口测试  | 较少                                             | health、reading、quiz、report、migration、404    | API 覆盖率、状态码正确率         |
| AI 测试 | JSON 解析                                        | mock AI、fallback、timeout、非法响应               | AI 异常覆盖率、解析成功率         |
| 数据库测试 | e2e 脚本间接覆盖                                     | repository、migration、share event            | 写入成功率、查询正确率、session 隔离 |
| 集成测试  | e2e-main-flow                                  | ai mock flow、share flow                     | 主流程通过率、执行耗时            |
| 运维指标  | ops daily report                               | 接入测试报告                                      | 阅读数、测验数、平均分、分享转化率      |
| CI    | build/test/lint/e2e                            | coverage、rollback、report                    | CI 通过率、质量门禁结果          |

你的项目已经有 `ops:daily-report`，它能输出分享报告数、分享浏览数、分享转化数、转化率、闪卡数、句子分析数、阅读数、测验数、报告数、测验平均分、最高分等，这些可以放进“运行质量与学习效果指标”部分。([GitHub][8])

---



