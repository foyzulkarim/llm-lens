# TASK: Auth Middleware Integration & API Tests

> **Date:** 2026-03-28
> **Phase:** Phase 1 — Foundation
> **Epic:** F2 — Auth Middleware
> **Effort:** m
> **Priority:** high
> **Depends on:** P1-E1-T5-usage-repo-test-infra.md, P1-E2-T1-api-key-repo.md, P1-E2-T2-api-key-auth-provider.md, P1-E2-T3-auth-middleware.md
> **Plan source:** specs/plans/PLAN-F2-auth-middleware.md

## Description

Wire the auth middleware into the Express app for all `/api/*` routes and write integration tests using Supertest that exercise the full auth flow end-to-end: real ApiKeyAuthProvider, real PrismaApiKeyRepository, and real test database. These tests validate that the middleware correctly protects API routes and that all components work together.

## Test Plan

### Test File(s)
- `src/__tests__/integration/auth/authMiddleware.test.ts`

### Test Scenarios

#### Auth Middleware — API route protection (end-to-end)

- **rejects request with no API key** — GIVEN the app is running with auth middleware on /api/* WHEN GET /api/health is called without X-API-Key THEN response is 401 with code "MISSING_API_KEY"
- **rejects request with invalid API key** — GIVEN no matching key in the database WHEN GET /api/health is called with X-API-Key "oui-nonexistent" THEN response is 401 with code "INVALID_API_KEY"
- **rejects request with inactive API key** — GIVEN an inactive key in the database WHEN GET /api/health is called with that key THEN response is 401 with code "INVALID_API_KEY"
- **accepts request with valid API key** — GIVEN an active key in the database WHEN GET /api/health is called with that key THEN response is 200 and req.user is populated (verified via response body or a test endpoint)
- **populates req.user with correct UserContext** — GIVEN an active key for userId "u1" and userName "Alice" WHEN a protected route is hit with that key THEN req.user contains { userId: "u1", userName: "Alice" }

#### Auth Middleware — non-API routes

- **does not require auth for non-API routes** — GIVEN the app has a health check at GET / or GET /health WHEN called without X-API-Key THEN response is 200 (auth middleware only applies to /api/*)

#### Auth Middleware — wiring

- **createKey + validateKey round trip** — GIVEN ApiKeyAuthProvider.createKey("u1", "Alice") returns a key WHEN that key is used in X-API-Key header on a protected route THEN the request is authenticated successfully
- **handles database error gracefully** — GIVEN the database is unreachable or Prisma throws WHEN a request with an API key hits the middleware THEN response is 500 with code "INTERNAL_ERROR" (via error handler)

## Implementation Notes

- **Layer(s):** App wiring (`src/app.ts`), integration tests
- **Pattern reference:** Uses testApp helper from F1-T5 and testDb helper for database setup
- **Key decisions:**
  - Auth middleware is mounted on `/api/*` routes only; root health check remains unauthenticated
  - A temporary test-only route (or the existing health check under /api/) can be used to verify req.user
  - Tests seed API keys directly using PrismaApiKeyRepository or raw Prisma client
  - The round-trip test (createKey then validateKey) validates the full flow without mocks
  - Database error test can disconnect Prisma client or use a mock to simulate failure
- **Libraries:** supertest, @prisma/client

## Scope Boundaries

- Do NOT add new API routes beyond what is needed for testing auth (use /api/health or a minimal test route)
- Do NOT implement the chat proxy or any F3+ features
- Do NOT add key management admin endpoints
- Integration tests are the focus — unit tests are covered by T2 and T3

## Files Expected

**New files:**
- `src/__tests__/integration/auth/authMiddleware.test.ts`

**Modified files:**
- `src/app.ts` — mount auth middleware on `/api/*` routes, wire ApiKeyAuthProvider with PrismaApiKeyRepository
- `src/__tests__/helpers/testApp.ts` — update to include auth middleware wiring with test database

**Must NOT modify:**
- `src/middleware/authMiddleware.ts` (defined in T3)
- `src/auth/apiKeyAuthProvider.ts` (defined in T2)
- `src/auth/apiKeyRepository.ts` (defined in T1)

## TDD Sequence

1. Update app.ts to mount auth middleware on /api/* with injected ApiKeyAuthProvider
2. Write rejection tests (no key, invalid key, inactive key) -> verify middleware is wired correctly
3. Write acceptance test (valid key) -> verify req.user is populated
4. Write non-API route test -> verify health check is not protected
5. Write round-trip test (createKey + use key) -> verify full integration
6. Write database error test -> verify error handler catches and returns 500

---
_Generated from: specs/plans/PLAN-F2-auth-middleware.md_
_Next step: "Implement task: specs/tasks/P1-E2-T4-auth-integration-tests.md" using the TDD skill._
