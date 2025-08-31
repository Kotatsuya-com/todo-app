# Communication Guidelines

## Language
Agent must be always in *Japanese*.

# Repository Guidelines

## Project Structure & Module Organization
- `app/`: Next.js App Router pages, API routes, global styles.
- `src/`: Clean Architecture layers — `domain/`, `infrastructure/`, `presentation/`.
- `lib/`: Backend-facing domain code — `entities/`, `services/`, `repositories/`.
- `components/`: Reusable React UI (PascalCase files, colocated styles).
- `__tests__/`: Unit/integration tests (`api/`, `lib/`, `src/`; fixtures/mocks).
- `supabase/`: Local DB config and SQL migrations.
- `scripts/`, `types/`, `public/`, `logs/`.
- Imports: `@/` maps to repo root (e.g., `import X from '@/lib/services/x'`).

## Build, Test, and Development Commands
- `npm run dev`: Start Next.js + local Supabase; logs to `logs/dev.log`.
- `npm run dev:webhook`: Dev with ngrok tunnel for webhook testing.
- `npm run build` / `npm start`: Production build and serve.
- `npm run lint`: ESLint checks; fix before PR.
- `npm run test` | `test:watch` | `test:coverage`: Jest tests and coverage.
- DB: `npm run db:start|stop|restart|migrate|reset|status`, `npm run types:generate`.

## Coding Style & Naming Conventions
- Language: TypeScript; React FCs, hooks-first.
- Formatting: 2-space indent, single quotes, no semicolons.
- Linting: `next/core-web-vitals` + custom rules (`eqeqeq`, `curly`, `prefer-const`, `no-console` except `lib/*logger*.ts`, `scripts/*`).
- Filenames: Components `PascalCase.tsx` (e.g., `TodoCard.tsx`); modules/utilities `kebab-case.ts` (e.g., `openai-title.ts`).

## Testing Guidelines
- Framework: Jest (`jsdom`). Setup: `jest.setup.js`; config: `jest.config.js`.
- Location: `__tests__/` and `*.test|spec.(ts|tsx)` alongside code.
- Coverage: collected from `lib/**/*`; add tests for new/changed logic.
- Practices: mock network/IO; keep assertions meaningful. Example: `npm run test:coverage`.

## Commit & Pull Request Guidelines
- Commits: imperative, concise. Prefer scopes, e.g., `feat(api): add todo filters`, `fix(ui): correct empty state`.
- PRs: clear description, rationale, before/after screenshots for UI, linked issues, test plan, and any DB migrations.
- Quality gates: `npm run lint` and `npm test` must pass; note coverage impact when significant.

## Security & Configuration Tips
- Secrets: never commit real keys. Copy `.env.local.example` → `.env.local` and set OpenAI, Supabase, Slack.
- Database: use local Supabase (`npm run db:start`); after schema changes run `npm run types:generate`.

