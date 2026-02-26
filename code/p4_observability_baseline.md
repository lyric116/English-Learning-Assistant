# P4-06 Structured Logging & Trace Baseline

Date: 2026-02-26  
Owner: Codex

## Scope
- 为每个请求注入/透传 `traceId`（`x-trace-id`）。
- 输出结构化请求日志（方法、路径、状态码、耗时）。
- 输出 AI 调用日志（provider host、model、状态码、耗时、错误上下文）。
- 错误处理统一输出结构化失败日志，支持按 `traceId` 回溯。

## Core Changes
- Request tracing middleware:
  - `server/src/middleware/request-tracing.ts`
  - 自动生成或复用 `x-trace-id`，并写回响应头。
- Async context:
  - `server/src/utils/request-context.ts`
  - 使用 `AsyncLocalStorage` 在同一请求链路传递 `traceId`。
- Logger enhancement:
  - `server/src/utils/logger.ts`
  - 自动附加上下文 `traceId`。
- Error log enhancement:
  - `server/src/middleware/error-handler.ts`
  - `http.request.validation_failed` / `http.request.failed`。
- AI service telemetry:
  - `server/src/services/ai-service.ts`
  - `ai.request.completed` / `ai.request.failed`
  - `ai.connection.completed` / `ai.connection.failed`

## Validation
- `cd server && npm run build` ✅
- `cd server && npm run test` ✅
- `cd server && npm run test:e2e-flow` ✅
- `cd client && npm run lint` ✅
- `cd client && npm run build` ✅
- `cd client && npm run test` ✅

## Expected Outcome
- 任何失败请求都可通过日志中的 `traceId` 关联：
  - 请求级日志（入口/耗时/状态）
  - AI 调用日志（模型调用耗时与错误）
  - 统一错误日志（状态码/错误码/错误信息）
