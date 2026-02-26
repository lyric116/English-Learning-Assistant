# P5-01 AI Provider Strategy

Date: 2026-02-26  
Owner: Codex

## Goal
- 实现可上线的 AI 供应商策略：白名单约束、配额阈值、失败回退。

## Implementation
- Config extension (`server/src/config.ts`):
  - `AI_PROVIDER_PRIMARY_DAILY_QUOTA`
  - `AI_PROVIDER_FALLBACK_DAILY_QUOTA`
  - `AI_FALLBACK_PROVIDERS` (JSON array)
- Provider policy in AI service (`server/src/services/ai-service.ts`):
  - primary provider from request `aiConfig`
  - fallback providers from env
  - per-provider daily quota counter (in-memory)
  - sequential fallback on failure/quota exhaustion
  - structured logs:
    - `ai.provider.quota.exhausted`
    - `ai.provider.fallback.activated`
    - `ai.provider.attempt.failed`
- Security and env template:
  - `.env.example` updated with whitelist/private-host controls and fallback provider config template.

## Validation
- `cd server && npm run build` ✅
- `cd server && npm run test` ✅
- `cd server && npm run test:e2e-flow` ✅
- `cd client && npm run lint` ✅
- `cd client && npm run build` ✅
- `cd client && npm run test` ✅

## Runtime Notes
- 配额计数当前为进程内存级（按天重置），适合 MVP 单实例；多实例部署时建议迁移到 Redis/DB 统一计数。
- 回退供应商仍会经过 `validateBaseUrl` 与 `ALLOWED_AI_HOSTS` 白名单校验。
