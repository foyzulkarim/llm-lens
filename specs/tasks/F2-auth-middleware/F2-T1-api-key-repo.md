# TASK: IApiKeyRepo Interface & PrismaApiKeyRepository

> **Date:** 2026-03-28
> **Phase:** Phase 1 — Foundation
> **Epic:** F2 — Auth Middleware
> **Effort:** s
> **Priority:** critical
> **Depends on:** P1-E1-T1-project-scaffolding.md, P1-E1-T2-prisma-schema-seed.md, P1-E1-T5-usage-repo-test-infra.md
> **Plan source:** specs/plans/PLAN-F2-auth-middleware.md

## Description

Define the IApiKeyRepo interface and implement PrismaApiKeyRepository as its concrete implementation backed by the ApiKey Prisma model. The repository provides `findByKey` and `create` operations. Integration tests run against a real test database using the testDb helper from F1-T5.

## Test Plan

### Test File(s)
- `src/__tests__/integration/auth/apiKeyRepository.test.ts`

### Test Scenarios

#### PrismaApiKeyRepository — findByKey()

- **returns ApiKey when key exists and is active** — GIVEN an active API key stored in the database WHEN findByKey(key) is called THEN the full ApiKey record is returned with correct userId, userName, key, and isActive=true
- **returns ApiKey when key exists but is inactive** — GIVEN an inactive API key stored in the database WHEN findByKey(key) is called THEN the ApiKey record is returned with isActive=false (repo does not filter; that is the provider's job)
- **returns null when key does not exist** — GIVEN no matching key in the database WHEN findByKey("oui-nonexistent") is called THEN null is returned
- **trims whitespace before lookup** — GIVEN an active API key "oui-abc123" in the database WHEN findByKey("  oui-abc123  ") is called THEN the matching ApiKey record is returned

#### PrismaApiKeyRepository — create()

- **creates a new API key record** — GIVEN valid userId, userName, and key WHEN create() is called THEN a row exists in ApiKey with correct fields and isActive=true
- **sets createdAt automatically** — GIVEN a valid create call WHEN the record is inspected THEN createdAt is set to approximately now
- **throws on duplicate key** — GIVEN an existing key "oui-dup" in the database WHEN create() is called with the same key THEN a Prisma unique constraint error is thrown

## Implementation Notes

- **Layer(s):** Interface (`src/interfaces/`), Repository (`src/auth/`)
- **Pattern reference:** Follows PrismaUsageRepository from F1-T5 (same testDb pattern)
- **Key decisions:**
  - IApiKeyRepo is a separate interface from IAuthProvider (Decision #3 in the plan)
  - `findByKey` returns the full ApiKey model (including isActive); filtering is done by the auth provider
  - `create` expects the caller to generate the key; the repo only persists it
  - Whitespace trimming happens at the repository level
- **Libraries:** @prisma/client

## Scope Boundaries

- Do NOT implement ApiKeyAuthProvider (that is T2)
- Do NOT implement auth middleware (that is T3)
- Do NOT add key generation logic (that belongs to the auth provider)
- The `findByKey` method returns the raw record; it does NOT decide if the key is valid

## Files Expected

**New files:**
- `src/interfaces/IApiKeyRepo.ts` — IApiKeyRepo interface definition
- `src/auth/apiKeyRepository.ts` — PrismaApiKeyRepository implementing IApiKeyRepo
- `src/__tests__/integration/auth/apiKeyRepository.test.ts`

**Modified files:**
- `src/interfaces/index.ts` — add IApiKeyRepo to barrel export

**Must NOT modify:**
- `prisma/schema.prisma` (ApiKey model defined in F1-T2)
- `src/interfaces/IAuthProvider.ts` (defined in F1-T3)

## TDD Sequence

1. Create IApiKeyRepo interface (type-only, no tests needed)
2. Write findByKey integration tests -> implement findByKey in PrismaApiKeyRepository
3. Write create integration tests -> implement create in PrismaApiKeyRepository
4. Add IApiKeyRepo to barrel export

---
_Generated from: specs/plans/PLAN-F2-auth-middleware.md_
_Next step: "Implement task: specs/tasks/P1-E2-T1-api-key-repo.md" using the TDD skill._
