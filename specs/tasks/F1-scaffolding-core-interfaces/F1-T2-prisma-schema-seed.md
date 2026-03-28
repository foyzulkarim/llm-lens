# TASK: Prisma Schema, Migrations & Seed Data

> **Date:** 2026-03-28
> **Phase:** Phase 1 — Foundation
> **Epic:** F1 — Scaffolding & Core Interfaces
> **Effort:** s
> **Priority:** critical
> **Depends on:** P1-E1-T1-project-scaffolding.md
> **Plan source:** specs/plans/PLAN-F1-scaffolding-core-interfaces.md

## Description

Set up Prisma ORM with SQLite, define the ApiKey and UsageLog models with proper indexes, create the initial migration, and write a seed script that populates the database with test API keys and usage log entries. After this task, `npx prisma migrate dev` creates the database and `npx prisma db seed` fills it with realistic test data.

## Test Plan

### Test File(s)
- `src/__tests__/prisma/seed.test.ts`

### Test Scenarios

#### Seed Script Verification

- **creates all test API keys** — GIVEN a fresh database WHEN seed runs THEN 4 API keys exist with expected userId/userName/key values
- **creates usage log entries** — GIVEN a fresh database WHEN seed runs THEN 80-100 usage log entries exist
- **spreads logs across multiple models** — GIVEN seeded database WHEN querying by model THEN entries exist for "llama3", "mistral", and "codellama"
- **spreads logs across multiple users** — GIVEN seeded database WHEN querying by userId THEN entries exist for "user-1", "user-2", and "user-3" (not "admin-1")
- **spreads logs across 14 days** — GIVEN seeded database WHEN checking createdAt range THEN entries span at least 14 days
- **seed is idempotent** — GIVEN an already-seeded database WHEN seed runs again THEN API key count is still 4 (upserted) and usage logs are refreshed

## Implementation Notes

- **Layer(s):** Database schema, seed script
- **Pattern reference:** None (greenfield)
- **Key decisions:**
  - UUID strings for all IDs (`@id @default(uuid())`)
  - Token counts as integers
  - UsageLog indexes: `[userId, createdAt]` and `[model, createdAt]`
  - ApiKey: unique on `key` field
  - Seed uses upsert for API keys, delete+recreate for usage logs
  - DATABASE_URL defaults to `file:./dev.db`
- **Libraries:** prisma, @prisma/client

## Scope Boundaries

- Do NOT create repository classes (that's T5)
- Do NOT create interfaces (that's T3)
- Only Prisma schema, migration, and seed script
- Seed data must match the exact keys specified in the plan (test-key-alice-001, etc.)

## Files Expected

**New files:**
- `prisma/schema.prisma` — datasource, generator, ApiKey model, UsageLog model with indexes
- `prisma/seed.ts` — seed script with API keys and usage log generation
- `src/__tests__/prisma/seed.test.ts`

**Modified files:**
- `package.json` (add prisma dependencies, prisma.seed config)
- `tsconfig.json` (ensure prisma/seed.ts is included)

**Must NOT modify:**
- `src/app.ts`
- `src/server.ts`

## TDD Sequence

1. Write seed test (requires running the seed against a test database)
2. Create Prisma schema with both models
3. Run migration
4. Implement seed script
5. Verify tests pass

---
_Generated from: specs/plans/PLAN-F1-scaffolding-core-interfaces.md_
_Next step: "Implement task: specs/tasks/P1-E1-T2-prisma-schema-seed.md" using the TDD skill._
