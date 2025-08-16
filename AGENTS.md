# Repository Guidelines

## Project Structure & Module Organization
- `app/`: Next.js App Router pages, API routes, global styles.
- `src/`: Clean Architecture
  - `domain/`, `infrastructure/`, `presentation/`.
- `lib/`: Backend-facing domain code (`entities/`, `services/`, `repositories/`).
- `components/`: Reusable UI (React, PascalCase files).
- `__tests__/`: Unit/integration tests (`api/`, `lib/`, `src/`, with fixtures/mocks).
- `supabase/`: Local DB config and migrations.
- `scripts/`, `types/`, `public/`, `logs/`.

## Build, Test, and Development Commands
- `npm run dev`: Start local dev (Next.js + Supabase; logs to `logs/dev.log`).
- `npm run dev:webhook`: Dev with ngrok webhook tunnel.
- `npm run build` / `npm start`: Production build and serve.
- `npm run lint`: ESLint checks; fix issues before PR.
- `npm run test` | `test:watch` | `test:coverage`: Jest tests and coverage.
- DB: `npm run db:start|stop|restart|migrate|reset|status`, `npm run types:generate`.

## Coding Style & Naming Conventions
- TypeScript, React FCs, hooks-first. Indent 2 spaces, single quotes, no semicolons.
- ESLint: `next/core-web-vitals` + custom rules (e.g., `eqeqeq`, `curly`, `prefer-const`, `no-console` except in `lib/*logger*.ts` and `scripts/*`).
- Filenames: React components `PascalCase.tsx` (e.g., `TodoCard.tsx`); modules/utilities `kebab-case.ts` (e.g., `openai-title.ts`).
- Paths: absolute imports via `@/` map to repo root.

## Testing Guidelines
- Framework: Jest (`jsdom` env). Setup in `jest.setup.js`; config in `jest.config.js`.
- Locations: tests in `__tests__/` and `*.test|spec.(ts|tsx)`.
- Coverage: collected from `lib/**/*`; add tests for new/changed logic.
- Run `npm run test:coverage` and keep meaningful assertions; mock network/IO.

## Commit & Pull Request Guidelines
- Commits: imperative, concise (e.g., `refactor api/slack route`). Prefer scopes: `feat(api): …`, `fix(ui): …` when helpful.
- PRs: clear description, rationale, before/after screenshots for UI, linked issues, test plan, and any DB migrations noted.
- Quality gates: `npm run lint` and `npm test` must pass; include coverage-impact if significant.

## Security & Configuration Tips
- Secrets: never commit real keys. Copy `.env.local.example` to `.env.local` and fill values (OpenAI, Supabase, Slack).
- Database: use local Supabase (`npm run db:start`) and generate types via `npm run types:generate` after schema changes.
