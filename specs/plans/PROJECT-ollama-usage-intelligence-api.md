# Project Plan: Ollama Usage Intelligence API

> **Date:** 2026-03-28
> **Type:** greenfield
> **Estimated features:** 7
> **Estimated phases:** 3

## Project Summary

A middleware API that sits between client applications and a local Ollama instance. It proxies chat requests transparently, logs every interaction, and provides intelligence on top of that usage data — cost tracking, alerting, prompt management, and conversation history. The project serves as a workshop demo for Agentic Software Engineering (Cohort 1), so clean module boundaries, dependency inversion, and testability are first-class architectural goals. "Done" means students can clone the repo, run tests, hit the proxy endpoint, and independently build features on top of the foundation.

## System Boundaries

### In Scope

- Transparent proxy for Ollama's `/api/chat` endpoint
- API key-based authentication
- Async usage logging (model, tokens, latency, user, timestamp)
- Cost tracking with configurable per-model pricing
- Usage alerts with threshold-based rules
- Prompt templates with variable substitution and Ollama execution
- Conversation history storage and search
- Seed data for all student features to query against

### Out of Scope

- Other Ollama endpoints beyond `/api/chat` (reason: deliberate scope constraint — one endpoint keeps the base simple)
- User registration / self-service key management (reason: API keys are seeded; admin creates them)
- Real-time streaming responses (reason: adds complexity without pedagogical value for workshop scope)
- UI / frontend (reason: API-only project; clients are curl/Postman/other tools)
- Rate limiting / quota enforcement (reason: alerts report breaches but don't block requests)
- Multi-tenant deployment / cloud hosting (reason: local development tool)

### External Integrations

- **Local Ollama instance** — outbound HTTP calls to `http://localhost:11434/api/chat`; abstracted behind `IOllamaClient` interface so a mock can replace it in tests

## Architecture Direction

### High-Level Structure

```
Routes ──> Services ──> Repositories ──> Prisma Client ──> SQLite
               │
               │ depends on abstractions (interfaces)
               │ NOT on concrete implementations
               ▼
        ┌──────────────┐
        │  Interfaces   │
        │               │
        │ IOllamaClient │◄── MockOllamaClient (test)
        │               │◄── RealOllamaClient (prod)
        │               │
        │ IUsageLogger  │◄── UsageLoggerService
        │               │
        │ IAuthProvider │◄── ApiKeyAuthProvider
        │               │
        │ IUsageRepo    │◄── PrismaUsageRepository
        └──────────────┘
```

Modular monolith with Express.js. Each feature is a vertical slice (route → service → repository → Prisma model → tests). Features share the foundation's interfaces and database but are otherwise independent.

### Key Technology Choices

| Choice                | Decision                | Rationale                                                                          |
| --------------------- | ----------------------- | ---------------------------------------------------------------------------------- |
| Runtime               | Node.js + TypeScript    | Workshop audience familiarity; strong typing aids teaching                         |
| Framework             | Express.js              | Minimal, well-known, easy to understand routing/middleware                         |
| Database              | SQLite via Prisma ORM   | Zero infrastructure; single-file DB; Prisma gives type-safe queries and migrations |
| Testing (unit)        | Jest with mocks         | Fast, no I/O; interfaces make mocking natural                                      |
| Testing (integration) | Testcontainers + Prisma | Repository layer tested against real DB in container                               |
| Testing (API)         | Supertest               | Full HTTP request/response against running Express app                             |
| Architecture          | Dependency inversion    | Core teaching point; enables TDD without running Ollama                            |

### Patterns & Conventions

- **Vertical slices** — each feature owns its route, service, repository, and tests; no shared "services" folder across features
- **Dependency inversion** — all services depend on interfaces, not implementations; constructor injection
- **Fire-and-forget async logging** — proxy returns response immediately; logging happens in background; failures are logged but don't affect the client
- **Repository pattern** — Prisma access isolated behind repository interfaces; services never touch Prisma directly

## Feature Map

### Feature List

| #   | Feature                               | Type            | Description                                                                                                                                                       | Dependencies |
| --- | ------------------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| F1  | Project Scaffolding & Core Interfaces | infrastructure  | Express app setup, TypeScript config, Prisma schema (ApiKey + UsageLog), interfaces (IOllamaClient, IAuthProvider, IUsageLogger, IUsageRepo), test infrastructure | None         |
| F2  | Auth Middleware                       | core            | API key validation middleware using IAuthProvider; attaches user context to request                                                                               | F1           |
| F3  | Chat Proxy Endpoint                   | core            | `POST /api/chat` — authenticates, forwards to IOllamaClient, returns response to client                                                                           | F1, F2       |
| F4  | Async Usage Logging                   | core            | After proxy response, logs usage metadata (model, tokens, latency, user, timestamp) asynchronously via IUsageLogger                                               | F1, F3       |
| F5  | Prompt Templates                      | student feature | CRUD for templates with `{{variable}}` placeholders; execute endpoint renders and sends to Ollama                                                                 | F1, F2, F3   |
| F6  | Cost Tracking & Reporting             | student feature | Per-model pricing config; cost calculation from usage logs with date-based pricing rules                                                                          | F1, F2, F4   |
| F7  | Usage Alerts & Thresholds             | student feature | Alert rules (daily/monthly token limits); status endpoint evaluates rules against actual usage                                                                    | F1, F2, F4   |
| F8  | Conversation History & Search         | student feature | Stores full conversation exchanges; search/filter/paginate past interactions                                                                                      | F1, F2, F3   |

### Feature Dependencies

```
F1 (scaffolding & interfaces)
├── F2 (auth middleware)
│   ├── F3 (chat proxy) ── depends on F1 + F2
│   │   ├── F4 (async usage logging) ── depends on F1 + F3
│   │   │   ├── F6 (cost tracking) ── reads from UsageLog
│   │   │   └── F7 (usage alerts) ── reads from UsageLog
│   │   ├── F5 (prompt templates) ── uses IOllamaClient via proxy
│   │   └── F8 (conversation history) ── hooks into proxy flow
```

### Cross-Cutting Concerns

- **Authentication** — affects all endpoints; handled by F2 middleware applied globally
- **Error handling** — affects all features; Express error middleware in F1 foundation
- **User context** — set by auth middleware; consumed by every feature to scope data per user
- **UsageLog table** — written by F4, read by F6 and F7; shared data contract

## Delivery Phases

### Phase 1: Foundation (Pre-Session Build — 80%)

**Goal:** A running Express server where students can clone, install, migrate, test, and hit the proxy endpoint with a test API key. Full test infrastructure in place.
**Features:** F1, F2, F3
**Includes:**

- Project scaffolding (package.json, tsconfig, Jest config, Prisma schema)
- Core interfaces: IOllamaClient, IAuthProvider, IUsageLogger, IUsageRepo
- MockOllamaClient and RealOllamaClient implementations
- ApiKeyAuthProvider implementation
- `POST /api/chat` proxy endpoint (without logging — that's Phase 2)
- Prisma schema with ApiKey and UsageLog models, migrations, seed data
- Test infrastructure: Jest + TypeScript, Testcontainers setup, Supertest setup, test DB utilities
- Seed data: 3-4 API keys, 50-100 usage log entries across multiple models/users/dates
  **Risk:** Scope creep into student feature territory; must resist adding analytics/reporting to the foundation

### Phase 2: Live Session Feature (Session 1 — 20%)

**Goal:** Usage logging works end-to-end; every proxied request produces a UsageLog entry asynchronously without blocking the response.
**Features:** F4
**Depends on:** Phase 1 complete
**Includes:**

- Design discussion: sync vs async logging (audience debate)
- IUsageLogger implementation with fire-and-forget pattern
- Integration into proxy handler (post-response hook)
- Tests: log written with correct fields, async doesn't block response, failed writes don't crash proxy, concurrent requests each produce one entry
  **Risk:** Async error handling edge cases; need clear pattern for background failure logging

### Phase 3: Student Features (Session 2 — Independent)

**Goal:** Each student/group delivers one complete vertical slice with interface, tests, and working endpoints.
**Features:** F5, F6, F7, F8 (students pick one)
**Depends on:** Phase 2 complete (F6 and F7 need usage logs; F5 and F8 need proxy)
**Includes:**

- Each feature follows the vertical slice pattern: route → service → repository → Prisma model → tests
- Each has a design question for students to debate and decide
- Each targets 3-4 meaningful tests plus happy-path endpoints
  **Risk:** Students may struggle with Prisma migrations if adding new models; need clear instructions for `npx prisma migrate dev` workflow

**Note:** F5, F6, F7, F8 are independent of each other and can be built in parallel by different students/groups.

## Decisions Log

| #   | Decision                                       | Alternatives Considered              | Chosen Because                                                                                                     |
| --- | ---------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| 1   | SQLite (not Postgres)                          | PostgreSQL, MySQL                    | Zero infrastructure; single-file DB; Prisma abstracts the difference; workshop can't assume Docker/cloud DB access |
| 2   | Mock Ollama client (not requiring real Ollama) | Require local Ollama install         | Dependency inversion is the core teaching; TDD must work without external services                                 |
| 3   | Single endpoint proxy (`/api/chat` only)       | Full Ollama API proxy                | Scope constraint keeps foundation simple; features built on top provide depth                                      |
| 4   | Async fire-and-forget logging                  | Synchronous logging, message queue   | Fast client response; simple implementation; no queue infrastructure; failure is acceptable (log it, move on)      |
| 5   | API key auth (not JWT/OAuth)                   | JWT tokens, OAuth2                   | Simplest auth model for workshop; no token refresh complexity; seed data is just key strings                       |
| 6   | Vertical slices per feature                    | Shared service/repository layers     | Each student feature is self-contained; avoids merge conflicts; demonstrates modular architecture                  |
| 7   | Testcontainers for integration tests           | In-memory SQLite, test fixtures only | Tests against real database; catches Prisma query issues that mocks would miss                                     |

## Open Questions

- **Should the prompt template execute endpoint call the proxy internally (HTTP to self) or depend directly on IOllamaClient?**
  - **Impact if unresolved:** Affects coupling between template feature and proxy; students decide during their feature work
  - **Suggested default:** Direct IOllamaClient dependency — simpler, avoids HTTP self-call complexity, consistent with DI pattern

- **Should conversation history saving be automatic (proxy saves every exchange) or explicit (separate API call)?**
  - **Impact if unresolved:** Automatic requires hooking into proxy; explicit is standalone but requires client changes
  - **Suggested default:** Explicit — keeps the feature self-contained; students can propose automatic as a design decision

- **For cost tracking: use pricing active at time of request, or current pricing for historical calculations?**
  - **Impact if unresolved:** Affects query complexity and test scenarios
  - **Suggested default:** Pricing active at time of request — more realistic business logic, better TDD scenarios

## Next Steps

The following features each need their own Requirements Engineering session:

1. **F1: Project Scaffolding & Core Interfaces** — Focus on folder structure, interface contracts, Prisma schema design, and test infrastructure setup. This is the foundation everything else builds on.
2. **F2: Auth Middleware** — Focus on IAuthProvider contract, middleware integration pattern, and how user context flows downstream.
3. **F3: Chat Proxy Endpoint** — Focus on IOllamaClient contract, request/response shape mapping, error handling when Ollama is unavailable.
4. **F4: Async Usage Logging** — Focus on the sync-vs-async design question, IUsageLogger contract, fire-and-forget error handling pattern.
5. **F5: Prompt Templates** — Focus on template rendering logic (pure function), variable extraction, execute endpoint's dependency on IOllamaClient.
6. **F6: Cost Tracking & Reporting** — Focus on date-based pricing rules, aggregation queries, handling models without pricing config.
7. **F7: Usage Alerts & Thresholds** — Focus on period calculation (daily/monthly reset), threshold evaluation logic, on-demand vs cached results.
8. **F8: Conversation History & Search** — Focus on data model (Conversation + Messages), search/filter query building, pagination strategy.

Start with: `Requirements engineering for: Project Scaffolding & Core Interfaces (from PROJECT-ollama-usage-intelligence-api.md, feature F1)`

---

_This project plan is the input for individual Requirements Engineering sessions._
_Each feature listed above should be planned separately before task generation._
