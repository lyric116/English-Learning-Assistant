# Repository Guidelines

## Project Structure & Module Organization
- `client/`: React + TypeScript frontend (Vite + Tailwind). Main code in `client/src/`:
  - `pages/` feature pages (`FlashcardsPage.tsx`, `ReadingPage.tsx`, etc.)
  - `components/` shared UI/layout/settings
  - `lib/api.ts` API client (`/api/v1/*`)
  - `hooks/` reusable hooks (`use-local-storage`, `use-theme`, `use-tts`)
- `server/`: Express + TypeScript backend:
  - `src/routes/` module routes (`flashcards.ts`, `quiz.ts`, ...)
  - `src/services/ai-service.ts` LLM request orchestration
  - `src/middleware/` CORS, rate-limit, error handling
- `api/index.ts`: Vercel serverless entrypoint.
- `code/`: project notes/docs generated during analysis.

## Build, Test, and Development Commands
- `npm run dev:server` (root): start backend on `localhost:3001`.
- `npm run dev:client` (root): start frontend on `localhost:5173` (proxy `/api` to backend).
- `npm run build` (root): build server and client.
- `cd client && npm run lint`: run frontend ESLint.
- `cd client && npm run preview`: preview production frontend build.

## Coding Style & Naming Conventions
- Language: TypeScript for both frontend and backend.
- Indentation: 2 spaces; keep semicolons and trailing commas consistent with existing files.
- React components: `PascalCase` filenames and exports (e.g., `AchievementsPage.tsx`).
- Hooks: `useXxx` naming in `client/src/hooks/`.
- Backend route/service files: lowercase, feature-oriented (`reading.ts`, `report.ts`).
- Reuse existing path alias `@` in frontend imports.

## Testing Guidelines
- No automated test framework is configured yet.
- Minimum requirement for PRs: run `npm run build` and `cd client && npm run lint`.
- Perform manual smoke tests for impacted flows (e.g., Reading -> Quiz -> Achievements).
- If adding tests, prefer colocated `*.test.ts(x)` near the feature and keep them deterministic.

## Commit & Pull Request Guidelines
- Follow Conventional Commit style seen in history: `feat(scope): ...`, `fix(scope): ...`, `style(scope): ...`, `refactor(scope): ...`.
- Keep commits focused by module (client page, server route, shared API layer).
- PRs should include:
  - concise summary of behavior changes
  - affected paths/endpoints
  - screenshots/GIFs for UI changes
  - validation steps and command outputs (`build`, `lint`)

## Security & Configuration Tips
- Never commit API keys. AI credentials are user-provided via settings/local storage.
- Backend validates `baseUrl`; in production, configure `ALLOWED_AI_HOSTS` and HTTPS-only endpoints.
