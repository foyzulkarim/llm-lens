# TASK: ApiKeyAuthProvider

> **Date:** 2026-03-28
> **Phase:** Phase 1 — Foundation
> **Epic:** F2 — Auth Middleware
> **Effort:** s
> **Priority:** critical
> **Depends on:** F1-T3-interfaces-errors-middleware.md, F2-T1-api-key-repo.md
> **Plan source:** specs/plans/PLAN-F2-auth-middleware.md

## Description

Implement ApiKeyAuthProvider as the concrete implementation of IAuthProvider. It uses IApiKeyRepo to look up keys and provides `validateKey` (returns UserContext or null) and `createKey` (generates a prefixed UUID key and persists it). All tests use a mocked IApiKeyRepo so this task has no database dependency.

## Test Plan

### Test File(s)
- `src/__tests__/unit/auth/apiKeyAuthProvider.test.ts`

### Test Scenarios

#### ApiKeyAuthProvider — validateKey()

- **returns UserContext for a valid active key** — GIVEN IApiKeyRepo.findByKey returns an ApiKey with isActive=true WHEN validateKey("oui-valid") is called THEN { userId, userName } is returned
- **returns null for an inactive key** — GIVEN IApiKeyRepo.findByKey returns an ApiKey with isActive=false WHEN validateKey("oui-inactive") is called THEN null is returned
- **returns null for a key not found** — GIVEN IApiKeyRepo.findByKey returns null WHEN validateKey("oui-unknown") is called THEN null is returned
- **trims whitespace from key before lookup** — GIVEN IApiKeyRepo.findByKey returns a valid ApiKey for "oui-abc" WHEN validateKey("  oui-abc  ") is called THEN findByKey is called with "oui-abc" and UserContext is returned
- **propagates database errors** — GIVEN IApiKeyRepo.findByKey throws an Error WHEN validateKey("oui-any") is called THEN the error propagates (not caught)

#### ApiKeyAuthProvider — createKey()

- **generates a key with oui- prefix** — GIVEN a valid userId and userName WHEN createKey("user-1", "Alice") is called THEN the returned key starts with "oui-"
- **stores key via IApiKeyRepo.create** — GIVEN a valid userId and userName WHEN createKey("user-1", "Alice") is called THEN IApiKeyRepo.create is called with userId, userName, and the generated key
- **returns the generated key string** — GIVEN IApiKeyRepo.create succeeds WHEN createKey is called THEN the returned string matches the key passed to IApiKeyRepo.create

## Implementation Notes

- **Layer(s):** Auth provider (`src/auth/`)
- **Pattern reference:** Implements IAuthProvider from `src/interfaces/IAuthProvider.ts`
- **Key decisions:**
  - Key format: `oui-${crypto.randomUUID()}` (Decision #2 in the plan)
  - validateKey trims input and checks isActive before returning UserContext
  - validateKey does NOT throw on invalid/missing keys — it returns null (middleware decides the response)
  - Database errors from IApiKeyRepo propagate up (no try/catch in the provider)
- **Libraries:** Node.js `crypto` module (for randomUUID)

## Scope Boundaries

- Do NOT implement auth middleware (that is T3)
- Do NOT implement PrismaApiKeyRepository (that is T1)
- Do NOT add key expiration or rotation logic
- All tests mock IApiKeyRepo — no database access in this task

## Files Expected

**New files:**
- `src/auth/apiKeyAuthProvider.ts` — ApiKeyAuthProvider implementing IAuthProvider
- `src/__tests__/unit/auth/apiKeyAuthProvider.test.ts`

**Modified files:**
- None

**Must NOT modify:**
- `src/interfaces/IAuthProvider.ts` (defined in F1-T3)
- `src/auth/apiKeyRepository.ts` (defined in T1)

## TDD Sequence

1. Write validateKey tests (valid, inactive, not found, whitespace) -> implement validateKey
2. Write createKey tests (prefix, persistence, return value) -> implement createKey
3. Write error propagation test -> verify no try/catch swallowing errors

---
_Generated from: specs/plans/PLAN-F2-auth-middleware.md_
_Next step: "Implement task: specs/tasks/F2-auth-middleware/F2-T2-api-key-auth-provider.md" using the TDD skill._
