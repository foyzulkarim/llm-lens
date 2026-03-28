# Plan: Project Scaffolding & Core Interfaces (F1)

> **Date:** 2026-03-28
> **Project source:** specs/plans/PROJECT-ollama-usage-intelligence-api.md
> **Estimated tasks:** 6
> **Planning session:** detailed

## Summary

Set up the greenfield Node.js + TypeScript + Express project with all infrastructure needed for TDD-driven development. This includes folder structure, TypeScript/Jest/Prisma configuration, core interfaces (IOllamaClient, IAuthProvider, IUsageLogger, IUsageRepo), Prisma schema with ApiKey and UsageLog models, mock/real Ollama client implementations, seed data, and test utilities for unit/integration/API testing layers.

## Requirements

### Functional Requirements
1. Project initializes with `npm install` and compiles with `npx tsc --noEmit`
2. `npm test` runs Jest test suite successfully with zero tests initially
3. `npm run dev` starts an Express server on a configurable port (default 3000)
4. `npm run build` produces compiled JavaScript in `dist/`
5. Prisma schema defines `ApiKey` and `UsageLog` models; `npx prisma migrate dev` creates the SQLite database
6. Seed script creates 3-4 test API keys and 50-100 usage log entries across multiple models, users, and dates
7. IOllamaClient interface is defined with a single `chat` method
8. MockOllamaClient returns realistic fake responses with configurable token counts and simulated latency
9. RealOllamaClient calls `http://localhost:11434/api/chat` via HTTP
10. IAuthProvider interface is defined with `validateKey` and `createKey` methods
11. IUsageLogger interface is defined with a `log` method accepting a structured usage record
12. IUsageRepo interface is defined with methods to create and query usage log entries
13. PrismaUsageRepository implements IUsageRepo against the real database
14. Testcontainers setup utility spins up a SQLite-compatible test database for integration tests
15. Supertest setup utility creates an Express app instance for API tests
16. Global error handling middleware returns consistent JSON error responses

### Non-Functional Requirements
1. TypeScript strict mode enabled
2. All source code under `src/`; all tests colocated or under `__tests__/` directories
3. Environment variables loaded from `.env` file (PORT, DATABASE_URL, OLLAMA_BASE_URL)
4. `.env.example` provided with documented defaults
5. `.gitignore` covers node_modules, dist, .env, prisma/*.db

## Detailed Specifications

### Folder Structure

```
src/
  interfaces/
    IOllamaClient.ts
    IAuthProvider.ts
    IUsageLogger.ts
    IUsageRepo.ts
  clients/
    MockOllamaClient.ts
    RealOllamaClient.ts
  middleware/
    authMiddleware.ts        (F2 — placeholder)
    errorHandler.ts
  proxy/
    proxyRoutes.ts           (F3 — placeholder)
    proxyService.ts          (F3 — placeholder)
  usage/
    usageRepository.ts
  auth/
    apiKeyRepository.ts
    apiKeyAuthProvider.ts    (F2 — implementation)
  app.ts                     (Express app setup, middleware, routes)
  server.ts                  (entry point — starts listening)
prisma/
  schema.prisma
  seed.ts
```

### Prisma Schema

**ApiKey model:**

| Field | Type | Constraints |
|-------|------|------------|
| id | String | @id @default(uuid()) |
| key | String | @unique |
| userId | String | |
| userName | String | |
| isActive | Boolean | @default(true) |
| createdAt | DateTime | @default(now()) |

**UsageLog model:**

| Field | Type | Constraints |
|-------|------|------------|
| id | String | @id @default(uuid()) |
| userId | String | |
| model | String | |
| promptTokens | Int | |
| completionTokens | Int | |
| totalTokens | Int | |
| latencyMs | Int | |
| createdAt | DateTime | @default(now()) |

**Indexes:**
- UsageLog: composite index on `[userId, createdAt]` for per-user date-range queries
- UsageLog: index on `[model, createdAt]` for per-model queries
- ApiKey: unique index on `key` (implicit from @unique)

### IOllamaClient Interface

```typescript
interface ChatRequest {
  model: string;
  messages: Array<{ role: string; content: string }>;
}

interface ChatResponse {
  message: { role: string; content: string };
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

interface IOllamaClient {
  chat(request: ChatRequest): Promise<ChatResponse>;
}
```

**MockOllamaClient behavior:**
- Returns a deterministic response: `{ role: "assistant", content: "This is a mock response from {model}" }`
- Token counts: promptTokens = sum of message content lengths / 4 (rough approximation), completionTokens = 20 (fixed default), configurable via constructor
- Simulated latency: 50ms default, configurable via constructor
- Throws an error if model name is "error-model" (for testing error paths)

**RealOllamaClient behavior:**
- POSTs to `{OLLAMA_BASE_URL}/api/chat` with `stream: false`
- Parses Ollama's response format into ChatResponse
- Throws typed error on connection failure, timeout (30s default), or non-200 response

### IAuthProvider Interface

```typescript
interface UserContext {
  userId: string;
  userName: string;
}

interface IAuthProvider {
  validateKey(key: string): Promise<UserContext | null>;
  createKey(userId: string, userName: string): Promise<string>;
}
```

### IUsageLogger Interface

```typescript
interface UsageRecord {
  userId: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
}

interface IUsageLogger {
  log(record: UsageRecord): Promise<void>;
}
```

### IUsageRepo Interface

```typescript
interface IUsageRepo {
  create(record: UsageRecord): Promise<void>;
  findByUser(userId: string, from?: Date, to?: Date): Promise<UsageLog[]>;
  findByModel(model: string, from?: Date, to?: Date): Promise<UsageLog[]>;
  findAll(from?: Date, to?: Date): Promise<UsageLog[]>;
}
```

### Error Handler Middleware

**Behavior:**
- Catches all unhandled errors in Express routes
- Returns JSON: `{ error: { message: string, code: string, status: number } }`
- Maps known error types to HTTP status codes:
  - `ValidationError` → 400
  - `AuthenticationError` → 401
  - `NotFoundError` → 404
  - Unknown errors → 500 with generic message in production, full message in development
- Logs errors to console.error

### Seed Data

**API Keys (4 keys):**
| userId | userName | key |
|--------|----------|-----|
| user-1 | Alice | test-key-alice-001 |
| user-2 | Bob | test-key-bob-002 |
| user-3 | Charlie | test-key-charlie-003 |
| admin-1 | Admin | test-key-admin-004 |

**Usage Logs (80-100 entries):**
- Spread across 14 days (2 weeks of history)
- Models: "llama3", "mistral", "codellama" (3 models)
- Users: user-1, user-2, user-3 (admin has no usage)
- Token ranges: promptTokens 50-500, completionTokens 20-300
- Latency ranges: 100ms-3000ms
- Distribution: user-1 heavy (40%), user-2 moderate (35%), user-3 light (25%)

### Test Infrastructure

**Jest configuration:**
- TypeScript via ts-jest
- Test file patterns: `**/*.test.ts`, `**/*.spec.ts`
- Three test environments: `unit`, `integration`, `api` (via Jest projects or naming convention)
- Coverage reporting enabled

**Testcontainers utility (`src/__tests__/helpers/testDb.ts`):**
- Creates a temporary Prisma client pointing to a test SQLite file
- Runs migrations before tests
- Provides `resetDb()` to truncate all tables between tests
- Cleans up after test suite

**Supertest utility (`src/__tests__/helpers/testApp.ts`):**
- Creates an Express app instance with all middleware and routes
- Injects mock dependencies (MockOllamaClient, test database)
- Returns a Supertest agent ready for HTTP assertions

## Edge Cases & Failure Modes

| Scenario | Decision | Rationale |
|----------|----------|-----------|
| RealOllamaClient cannot connect to Ollama | Throw a typed `OllamaConnectionError` with the original error as cause | Callers need to distinguish connection failures from bad requests |
| RealOllamaClient receives non-JSON response | Throw a typed `OllamaResponseError` | Ollama may return HTML error pages |
| Prisma migration fails on `npm install` | Documented in README — user must run `npx prisma migrate dev` manually | Prisma migrations should not auto-run on install |
| DATABASE_URL not set | Default to `file:./dev.db` (relative to prisma directory) | Zero-config local development |
| Seed script run multiple times | Use upsert for API keys (idempotent); delete + recreate for usage logs | Prevents duplicate keys; fresh usage data each time |
| Port already in use | Log clear error message and exit | Don't silently pick another port |

## Decisions Log

| # | Decision | Alternatives Considered | Chosen Because |
|---|----------|------------------------|----------------|
| 1 | Colocate interfaces in `src/interfaces/` | Scatter with implementations | Central location makes DI wiring obvious; students find all contracts in one place |
| 2 | Use UUID strings for all IDs | Auto-increment integers | Avoids cross-table ID collision assumptions; consistent with modern APIs |
| 3 | Token counts as integers (not floats) | Float/Decimal | Tokens are always whole numbers; simpler math in cost calculations downstream |
| 4 | Three named models in seed data | Random model names | Consistent seed data means students can write predictable test assertions |
| 5 | MockOllamaClient configurable via constructor | Environment variables | Constructor injection is consistent with DI pattern being taught |
| 6 | Custom error classes (ValidationError, AuthenticationError, NotFoundError) | String error codes | Type-safe error handling; middleware can switch on instanceof |

## Scope Boundaries

### In Scope
- All project configuration files (package.json, tsconfig, jest.config, .env.example, .gitignore)
- Prisma schema, migrations, seed script
- All four core interfaces and their types
- MockOllamaClient and RealOllamaClient implementations
- PrismaUsageRepository (IUsageRepo implementation)
- Error handler middleware and custom error classes
- Test infrastructure utilities (testDb, testApp helpers)
- Express app setup with placeholder routes

### Out of Scope
- Auth middleware implementation (F2)
- Proxy route/service implementation (F3)
- Usage logging service (F4)
- Any student feature code (F5-F8)
- CI/CD pipeline
- Docker configuration

## Dependencies

### Depends On (must exist before this work starts)
- None (this is the foundation)

### Depended On By (other work waiting for this)
- F2 (Auth Middleware) — needs IAuthProvider, Express app, ApiKey model
- F3 (Chat Proxy) — needs IOllamaClient, Express app, auth middleware
- F4 (Async Usage Logging) — needs IUsageLogger, IUsageRepo, UsageLog model
- F5-F8 (all student features) — need the full foundation

## Architecture Notes

The folder structure follows the vertical slice pattern described in the project plan. Each feature gets its own directory under `src/`. Shared abstractions live in `src/interfaces/`. The Express app (`app.ts`) is separated from the server entry point (`server.ts`) so Supertest can import the app without starting the HTTP listener.

Dependency injection is manual (constructor injection) — no DI container. The `app.ts` file is the composition root where implementations are wired to interfaces.

---
_This plan is the input for the Feature Planning skill._
_Review this document, then run: "Generate task from plan: specs/plans/PLAN-F1-scaffolding-core-interfaces.md"_
