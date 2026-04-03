# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**llm-lens** is an Ollama Usage Intelligence API — a middleware that proxies chat requests to a local Ollama instance while logging usage for cost tracking, alerting, and analytics. Built as a workshop demo for Agentic Software Engineering.

## Commands

```bash
# Development
npm run dev          # Start dev server with nodemon
npm run build        # Compile TypeScript to dist/
npm run start        # Run production server from dist/

# Testing
npm test             # Run all tests (passWithNoTests enabled)
npm run test:watch   # Run tests in watch mode

# Code Quality
npm run lint         # ESLint
npm run lint:fix     # ESLint with auto-fix
npm run format       # Prettier format
npm run format:check # Check formatting
npm run typecheck    # TypeScript type check

# Database
npx prisma migrate dev   # Run migrations
npx prisma db seed       # Seed database
npx prisma studio         # Open Prisma GUI
```

## Architecture

### Dependency Structure

```
Routes → Services → Repositories → Prisma Client → SQLite
              ↓
      Interfaces (abstractions, not implementations)
```

All services depend on **interfaces** (not concrete implementations) — this is the core architectural principle enabling TDD and loose coupling.

### Core Interfaces (`src/interfaces/`)

| Interface       | Purpose                          | Implementations                                      |
| --------------- | -------------------------------- | ---------------------------------------------------- |
| `IOllamaClient` | Abstraction over Ollama API      | `RealOllamaClient` (prod), `MockOllamaClient` (test) |
| `IAuthProvider` | API key validation, user context | `ApiKeyAuthProvider`                                 |
| `IUsageLogger`  | Fire-and-forget usage logging    | `UsageLoggerService`                                 |
| `IUsageRepo`    | Usage log persistence            | `PrismaUsageRepository`                              |

### Feature Slices

Each feature is a **vertical slice** containing its own route, service, repository, and tests. Features are numbered F1-F8:

- **F1** (done): Scaffolding, core interfaces, test infrastructure
- **F2** (done): Auth middleware (API key validation)
- **F3** (done): Chat proxy endpoint (`POST /api/chat`)
- **F4** (todo): Async usage logging
- **F5-F8** (todo): Student features (prompt templates, cost tracking, alerts, conversation history)

### Prisma Schema (`prisma/schema.prisma`)

Two models: `ApiKey` (authentication) and `UsageLog` (usage tracking with indexes on `userId` and `model`).

### Error Handling (`src/errors/index.ts`)

Domain errors: `ValidationError`, `AuthenticationError`, `NotFoundError`, `OllamaConnectionError`, `OllamaResponseError`. Handled by `errorHandler` middleware in `src/middleware/errorHandler.ts`.

## Key Conventions

- Interfaces define contracts; concrete implementations are injected via constructors
- Fire-and-forget async logging: proxy returns immediately, logging happens in background
- Repository pattern: Prisma accessed only through repository interfaces
- Seed data: 3-4 API keys, 50-100 usage log entries for testing

## Coding Standards

### Naming Conventions

- Interfaces prefixed with `I` (e.g., `IOllamaClient`, `IUsageRepo`)
- Error classes suffixed with `Error` (e.g., `ValidationError`, `OllamaConnectionError`)
- PascalCase for types, classes, interfaces; camelCase for variables and functions

### Patterns

- **Constructor injection** — dependencies passed via constructor, stored as `private` readonly fields
- **Vertical slices** — each feature owns its route, service, repository, and tests in one folder
- **Repository pattern** — services never touch Prisma directly; go through repository interfaces

### Libraries

- Express.js for HTTP routing
- Prisma ORM with SQLite
- Jest for unit/integration tests, Supertest for API tests

## Restrictions

- **No streaming** — proxy returns complete responses only
- **API-only** — no frontend, no UI components
- **No rate limiting** — alerts report breaches but do not block requests
- **No direct Prisma in services** — always go through repository interfaces
- **No multi-tenant deployment** — this is a local development tool

## Specifications (PRD)

Feature requirements and task specs live in `specs/`:

- `specs/plans/PROJECT-*.md` — Project overview and feature map (the PRD)
- `specs/plans/PLAN-F*.md` — Individual feature plans with context, decisions, open questions
- `specs/tasks/F*/*/*.md` — TDD-ready task specifications

When starting a feature, read the corresponding `PLAN-F*.md` first, then the task specs. All work should trace back to a task spec.

## File Locations

- `src/server.ts` — Express server entry point
- `src/app.ts` — Express app setup (routes, middleware)
- `src/clients/` — Ollama client implementations (real + mock)
- `src/usage/` — Usage repository implementation
- `src/__tests__/` — Unit, integration, and helper tests
- `specs/plans/` — Feature plans and task specs
- `specs/tasks/` — TDD-ready task specifications
