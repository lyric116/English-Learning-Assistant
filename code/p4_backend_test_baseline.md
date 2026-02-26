# P4-05 Backend Test Baseline

Date: 2026-02-26  
Owner: Codex

## Scope
- 路由层入参分支：合法与非法请求体校验行为（request-validator）。
- AI JSON 解析异常：模型返回非标准文本时的容错与失败断言（json-parser）。

## Added Test Command
- `cd server && npm run test`
- Runtime: `node:test` + `--experimental-strip-types` (no external runner dependency).

## Test Files
- `server/tests/request-validator.test.ts`
  - valid payload defaults for reading generation.
  - invalid payload branches:
    - non-string text
    - out-of-range question count
    - missing `aiConfig` on AI test endpoint.
- `server/tests/json-parser.test.ts`
  - markdown code-block JSON parse.
  - noisy text JSON extraction parse.
  - invalid JSON parse failure assertion.

## Validation
- `cd server && npm run test` ✅
- `cd server && npm run build` ✅
- `cd server && npm run test:e2e-flow` ✅
- `cd client && npm run lint` ✅
- `cd client && npm run build` ✅
- `cd client && npm run test` ✅

## Note
- 受当前沙箱约束（`listen EPERM`）影响，本阶段未引入基于真实端口监听的 HTTP 测试，后续可在 `P4-07` CI 环境补充 supertest/contract 层。
