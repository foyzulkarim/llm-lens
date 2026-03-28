# TASK: Usage Repository & Test Infrastructure Helpers

> **Date:** 2026-03-28
> **Phase:** Phase 1 — Foundation
> **Epic:** F1 — Scaffolding & Core Interfaces
> **Effort:** m
> **Priority:** high
> **Depends on:** F1-T2-prisma-schema-seed.md, F1-T3-interfaces-errors-middleware.md
> **Plan source:** specs/plans/PLAN-F1-scaffolding-core-interfaces.md

## Description

Implement PrismaUsageRepository (the IUsageRepo concrete implementation) and build the test infrastructure helpers that all future features will use: a Testcontainers-based test database utility and a Supertest app factory. The repository is tested via integration tests against a real SQLite database. The test helpers establish the patterns for the entire project's test suite.

## Test Plan

### Test File(s)
- `src/__tests__/integration/usage/usageRepository.test.ts`
- `src/__tests__/helpers/testDb.test.ts` (sanity check for the helper itself)

### Test Scenarios

#### PrismaUsageRepository — create()

- **creates a usage log entry** — GIVEN a valid UsageRecord WHEN create() is called THEN a row exists in UsageLog with correct fields
- **sets createdAt automatically** — GIVEN a UsageRecord without timestamp WHEN create() is called THEN createdAt is set to approximately now

#### PrismaUsageRepository — findByUser()

- **returns logs for a specific user** — GIVEN logs for user-1 and user-2 WHEN findByUser("user-1") THEN only user-1 logs are returned
- **filters by date range** — GIVEN logs across multiple days WHEN findByUser("user-1", from, to) THEN only logs within the date range are returned
- **returns empty array for unknown user** — GIVEN no logs for "user-99" WHEN findByUser("user-99") THEN returns []
- **returns all user logs when no date range** — GIVEN 5 logs for user-1 WHEN findByUser("user-1") with no dates THEN all 5 are returned

#### PrismaUsageRepository — findByModel()

- **returns logs for a specific model** — GIVEN logs for "llama3" and "mistral" WHEN findByModel("llama3") THEN only "llama3" logs are returned
- **filters by date range** — GIVEN logs across multiple days WHEN findByModel("llama3", from, to) THEN only logs within range are returned
- **returns empty array for unknown model** — GIVEN no logs for "unknown" WHEN findByModel("unknown") THEN returns []

#### PrismaUsageRepository — findAll()

- **returns all logs** — GIVEN 10 logs across users and models WHEN findAll() THEN all 10 are returned
- **filters by date range** — GIVEN logs across multiple days WHEN findAll(from, to) THEN only logs within range are returned
- **returns empty array when no logs** — GIVEN empty database WHEN findAll() THEN returns []

#### Test Database Helper (sanity)

- **provides a working Prisma client** — GIVEN testDb setup WHEN querying THEN Prisma client works against test database
- **resetDb clears all tables** — GIVEN data in tables WHEN resetDb() is called THEN all tables are empty

## Implementation Notes

- **Layer(s):** Repository (`src/usage/`), test infrastructure (`src/__tests__/helpers/`)
- **Pattern reference:** Implements IUsageRepo from `src/interfaces/IUsageRepo.ts`
- **Key decisions:**
  - Testcontainers for integration tests — temporary SQLite file, Prisma migrations run before tests
  - `resetDb()` truncates all tables between tests (use Prisma `deleteMany` on each model)
  - Test app helper creates Express app with MockOllamaClient injected, pointing at test database
  - Integration tests use `beforeAll` for setup and `afterAll` for cleanup
- **Libraries:** testcontainers (or direct temp SQLite file), @prisma/client, supertest

### Note on Testcontainers vs Direct SQLite

For SQLite, Testcontainers may be overkill. An alternative is to create a temporary SQLite file per test suite, run migrations via Prisma, and delete it on teardown. The test helper should abstract this choice so the test code doesn't care.

## Scope Boundaries

- Do NOT implement auth middleware or proxy routes
- Do NOT add business logic beyond basic CRUD operations on UsageLog
- Test helpers are utilities — they do NOT contain business logic
- The Supertest helper (`testApp.ts`) creates the Express app but doesn't test routes (no routes exist yet beyond health check)

## Files Expected

**New files:**
- `src/usage/usageRepository.ts` — PrismaUsageRepository implementing IUsageRepo
- `src/__tests__/helpers/testDb.ts` — test database setup/teardown utility
- `src/__tests__/helpers/testApp.ts` — Supertest app factory
- `src/__tests__/integration/usage/usageRepository.test.ts`
- `src/__tests__/helpers/testDb.test.ts`

**Modified files:**
- `jest.config.ts` (add integration test project/pattern if not already configured)

**Must NOT modify:**
- `src/interfaces/` (already defined in T3)
- `prisma/schema.prisma` (already defined in T2)

## TDD Sequence

1. Build testDb helper first (needed by all integration tests)
2. Write testDb sanity tests → verify helper works
3. Write usageRepository integration tests → implement PrismaUsageRepository
4. Build testApp helper (depends on app.ts and MockOllamaClient existing)

---
_Generated from: specs/plans/PLAN-F1-scaffolding-core-interfaces.md_
_Next step: "Implement task: specs/tasks/F1-scaffolding-core-interfaces/F1-T5-usage-repo-test-infra.md" using the TDD skill._
