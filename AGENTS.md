# AGENTS.md — llm-lens

## Project Overview

Ollama Usage Intelligence API — a backend service that proxies chat requests to Ollama, tracks token usage per user/model, and exposes usage analytics endpoints.

**Stack**: TypeScript, Express 4, Prisma ORM (SQLite), Jest/ts-jest for testing.

## Specs & PRD

- **PRD**: `specs/ollama-usage-intelligence-api-prd.md` — full product requirements, system architecture diagrams, feature specs, acceptance criteria
- **Plans**: `specs/plans/` — implementation plans per feature (`PLAN-F1-...` through `PLAN-F8-...`), plus `PROJECT-ollama-usage-intelligence-api.md` for overall project plan
- **Tasks**: `specs/tasks/` — granular task breakdowns per feature (`F1-...` through `F8-...`)

**Read the PRD before implementing any feature.** It contains the product context, design questions, endpoint specs, and acceptance criteria that aren't captured in code alone. Key features from the PRD:

| #   | Feature                                     | Status  |
| --- | ------------------------------------------- | ------- |
| F1  | Scaffolding & core interfaces               | Built   |
| F2  | Auth middleware (API key)                   | Planned |
| F3  | Chat proxy (`POST /api/chat`)               | Planned |
| F4  | Async usage logging                         | Planned |
| F5  | Prompt templates with variable substitution | Planned |
| F6  | Cost tracking & reporting                   | Planned |
| F7  | Usage alerts & thresholds                   | Planned |
| F8  | Conversation history with search            | Planned |

## Architecture

```
src/
  server.ts           # Entry point — loads dotenv, starts Express server
  app.ts              # Express app setup (middleware, routes, error handler)
  interfaces/         # TypeScript interfaces (I-prefixed), barrel export in index.ts
  clients/            # Ollama client implementations (RealOllamaClient + MockOllamaClient)
  errors/             # Custom error classes extending Error
  middleware/         # Express middleware (errorHandler)
  usage/              # Repository implementations (PrismaUsageRepository)
  __tests__/
    helpers/          # Shared test utilities (testDb, testApp)
    unit/             # Unit tests — mirrors src/ structure
    integration/      # Integration tests — real DB via testDb helper
    prisma/           # Prisma-specific tests (seed validation)
prisma/
  schema.prisma       # Database schema (SQLite: ApiKey + UsageLog models)
  seed.ts             # Seed data for development
  migrations/         # Prisma migration files
```

Dependency flow: `Routes → Services → Repositories → Prisma Client → SQLite`. Services depend on abstractions (`IOllamaClient`, `IUsageRepo`, `IAuthProvider`, `IUsageLogger`), not concrete implementations. All errors extend `Error` and are handled centrally by `errorHandler` middleware.

## Commands

### Build & Run

| Command         | Description                                       |
| --------------- | ------------------------------------------------- |
| `npm run build` | Compile TypeScript (`tsc -p tsconfig.build.json`) |
| `npm run dev`   | Start dev server with nodemon (watches `src/`)    |
| `npm run start` | Run compiled server from `dist/`                  |

### Lint & Format

| Command                | Description                      |
| ---------------------- | -------------------------------- |
| `npm run lint`         | Run ESLint across the project    |
| `npm run lint:fix`     | Run ESLint with auto-fix         |
| `npm run format`       | Format all files with Prettier   |
| `npm run format:check` | Check formatting without writing |
| `npm run typecheck`    | Type-check without emitting      |

**Always run `npm run lint` and `npm run typecheck` after making changes. Fix any errors before finishing.**

### Testing

| Command                                             | Description                       |
| --------------------------------------------------- | --------------------------------- |
| `npm test`                                          | Run all tests                     |
| `npx jest <file-path>`                              | Run a single test file            |
| `npx jest src/__tests__/unit/errors/errors.test.ts` | Example: run one test file        |
| `npx jest -t "<describe> <test>"`                   | Run tests matching a name pattern |
| `npm run test:watch`                                | Run Jest in watch mode            |

Jest config: `ts-jest` preset, `node` environment, 30s timeout.

### Prisma

| Command                                | Description            |
| -------------------------------------- | ---------------------- |
| `npx prisma generate`                  | Generate Prisma client |
| `npx prisma migrate dev --name <name>` | Run migrations         |
| `npx prisma migrate reset`             | Reset DB               |
| `npx prisma db seed`                   | Seed data              |

### Pre-commit

Husky runs `lint-staged`: `*.{ts,tsx}` → eslint + prettier, `*.{json,md,mdx,yml,yaml}` → prettier.

## Coding Standards

### TypeScript

- Target ES2022, CommonJS modules, strict mode enabled
- Types: `["node", "jest"]`
- Use `import type` when only types are needed

### Formatting (Prettier)

Double quotes, always semicolons, 2-space indent, 100 char print width, trailing commas `"all"`.

### Imports

- External packages first (non-relative): `import express from "express"`
- Local modules second (relative): `import { errorHandler } from "./middleware/errorHandler"`

### Naming

- **Interfaces**: `I` prefix — `IOllamaClient`, `IUsageRepo`, `IAuthProvider`
- **Classes**: PascalCase — `RealOllamaClient`, `PrismaUsageRepository`
- **Error classes**: PascalCase + `Error` suffix — `ValidationError`, `OllamaConnectionError`
- **Files**: camelCase for implementations, PascalCase for class files (`RealOllamaClient.ts`)
- **Test files**: Mirror source path with `.test.ts` suffix
- **Constants**: UPPER_SNAKE_CASE, everything else camelCase

### Error Handling

- Use custom errors from `src/errors/` — `ValidationError` (400), `AuthenticationError` (401), `NotFoundError` (404), `OllamaConnectionError` (wraps cause), `OllamaResponseError`
- Custom errors must call `Object.setPrototypeOf(this, ClassName.prototype)`
- Error handler returns JSON: `{ error: { message, code, status } }`
- Hide internal details in production (`NODE_ENV === "production"`)

### Patterns

- **Dependency injection**: classes accept deps via constructor params with TS `private` shorthand
- **Interface-driven**: always implement interfaces explicitly (`class X implements IY`)
- **Barrel exports**: use `index.ts` files for module exports
- **Unused prefix**: prefix unused vars/args/caught errors with `_`

### Testing

- Use `describe`/`it` (not `test`), shared `baseRecord`/`baseRequest` objects spread into test data
- Integration tests use `setupTestDb()` helper with `beforeAll`/`afterAll`/`afterEach` lifecycle
- Test files mirror source path under `src/__tests__/unit/` or `src/__tests__/integration/`

### Environment Variables

| Variable          | Default                  | Description         |
| ----------------- | ------------------------ | ------------------- |
| `PORT`            | `3000`                   | Server port         |
| `DATABASE_URL`    | `file:./dev.db`          | SQLite database     |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama API base URL |

## Restrictions

- **No single quotes** — always use double quotes (Prettier enforced)
- **No `any` type** — strict mode is enabled; use proper types or generics
- **No inline error throwing in routes** — throw custom error classes from `src/errors/` so the error handler catches them properly
- **No direct Prisma calls outside repositories** — go through the `IUsageRepo` interface
- **No committing `*.db` files** — SQLite databases are gitignored
- **No committing `src/generated/prisma`** — it is gitignored; run `npx prisma generate` after schema changes
- **No new dependencies without checking** — only use libraries already in `package.json` (express, prisma, dotenv)
- **No `test` blocks** — use `describe`/`it` consistently across all test files
- **Do not skip lint or typecheck** — both must pass before considering work done
- **Do not modify `prisma/schema.prisma` without running `npx prisma migrate dev`**
