# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

英语学习助手 — 一个 React + Express 全栈应用，通过 OpenAI 兼容接口提供 AI 英语学习体验，包含闪卡、句子分析、双语阅读、理解测验、学习成就五大模块。

## Tech Stack

- Frontend: React 19 + TypeScript + Vite + Tailwind CSS v4
- Backend: Express + TypeScript
- AI Gateway: OpenAI-compatible `/chat/completions` providers (DeepSeek/OpenAI/Groq/Moonshot/custom)
- Deploy: Vercel static frontend + serverless API entry (`api/index.ts`)

## Running the Project

```bash
# Backend (http://localhost:3001)
npm run dev:server

# Frontend (http://localhost:5173)
npm run dev:client
```

Frontend proxies `/api` to backend in local dev (`client/vite.config.ts`).

## Architecture

### Repository Layout
- `client/src/pages/`: feature pages for five modules
- `client/src/lib/api.ts`: frontend API gateway (aiConfig injection, timeout, usage limit, anonymous session header)
- `server/src/routes/`: API routes by module
- `server/src/services/ai-service.ts`: AI orchestration and upstream calls
- `server/src/utils/prompt-builder.ts`: prompt templates
- `server/src/utils/json-parser.ts`: JSON parsing with markdown-wrapper tolerance
- `server/src/utils/request-validator.ts`: centralized request validation

### Core Data Flow

```
Page Action -> client API layer -> /api/v1 route -> ai-service -> AI provider -> JSON parse -> UI/state update
```

### State Management (MVP)
- `localStorage`: flashcards, reading history/favorites, test history, report history, ai-config
- Router state + fallback local persistence: reading -> quiz context
- No database/login in MVP phase

## Code Conventions

- TypeScript-first; keep strict typing in route/service boundaries.
- Use existing path alias `@` in frontend.
- Prefer centralized validation and reusable helpers over duplicated inline checks.
- Never log API keys/tokens; keep error messages sanitized.
