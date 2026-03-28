# TASK: Auth Middleware & Express Request Type Extension

> **Date:** 2026-03-28
> **Phase:** Phase 1 — Foundation
> **Epic:** F2 — Auth Middleware
> **Effort:** m
> **Priority:** critical
> **Depends on:** F1-T1-project-scaffolding.md, F1-T3-interfaces-errors-middleware.md, F2-T2-api-key-auth-provider.md
> **Plan source:** specs/plans/PLAN-F2-auth-middleware.md

## Description

Implement the auth middleware function that extracts the X-API-Key header, validates it via IAuthProvider, and either rejects with a 401 JSON response or attaches UserContext to `req.user` and calls `next()`. Also create the TypeScript declaration merging to extend the Express Request type with the optional `user` property. All tests use a mocked IAuthProvider.

## Test Plan

### Test File(s)
- `src/__tests__/unit/middleware/authMiddleware.test.ts`

### Test Scenarios

#### Auth Middleware — missing key

- **returns 401 when X-API-Key header is absent** — GIVEN a request with no X-API-Key header WHEN the middleware runs THEN response is 401 with `{ error: { message: "API key is required", code: "MISSING_API_KEY", status: 401 } }`
- **returns 401 when X-API-Key header is empty string** — GIVEN a request with X-API-Key set to "" WHEN the middleware runs THEN response is 401 with code "MISSING_API_KEY" (treated as missing)
- **returns 401 when X-API-Key header is whitespace only** — GIVEN a request with X-API-Key set to "   " WHEN the middleware runs THEN response is 401 with code "MISSING_API_KEY"

#### Auth Middleware — invalid key

- **returns 401 when IAuthProvider returns null** — GIVEN IAuthProvider.validateKey returns null WHEN the middleware runs with X-API-Key "oui-bad" THEN response is 401 with `{ error: { message: "Invalid API key", code: "INVALID_API_KEY", status: 401 } }`

#### Auth Middleware — valid key

- **attaches UserContext and calls next** — GIVEN IAuthProvider.validateKey returns { userId: "u1", userName: "Alice" } WHEN the middleware runs with X-API-Key "oui-good" THEN req.user is set to { userId: "u1", userName: "Alice" } and next() is called
- **handles case-insensitive header name** — GIVEN a request with header "x-api-key" (lowercase) set to a valid key WHEN the middleware runs THEN IAuthProvider.validateKey is called with the key value (Express lowercases headers)

#### Auth Middleware — error handling

- **calls next(error) when IAuthProvider throws** — GIVEN IAuthProvider.validateKey throws an Error WHEN the middleware runs THEN next() is called with the error (delegating to error handler middleware)
- **uses first value when multiple X-API-Key headers are sent** — GIVEN a request where the X-API-Key header value is an array ["key1", "key2"] WHEN the middleware runs THEN IAuthProvider.validateKey is called with "key1"

## Implementation Notes

- **Layer(s):** Middleware (`src/middleware/`), type declaration (`src/types/`)
- **Pattern reference:** Follows error handler middleware pattern from F1-T3
- **Key decisions:**
  - Middleware depends on IAuthProvider (injected via factory function or closure), NOT on the concrete ApiKeyAuthProvider
  - The middleware function signature: `createAuthMiddleware(authProvider: IAuthProvider): RequestHandler`
  - Empty/whitespace-only keys are treated as "missing" (not "invalid") to avoid leaking information
  - Database errors propagate via `next(err)` to the global error handler
  - TypeScript declaration merging goes in `src/types/express.d.ts`
  - The middleware does NOT call `res.json()` for 500s — it delegates to the error handler via `next(err)`
- **Libraries:** express

## Scope Boundaries

- Do NOT implement ApiKeyAuthProvider (that is T2)
- Do NOT wire the middleware into routes (that is T4)
- Do NOT add rate limiting or key caching
- Tests mock IAuthProvider — no database or real auth provider in this task

## Files Expected

**New files:**
- `src/middleware/authMiddleware.ts` — createAuthMiddleware factory function
- `src/types/express.d.ts` — TypeScript declaration merging for req.user
- `src/__tests__/unit/middleware/authMiddleware.test.ts`

**Modified files:**
- `tsconfig.json` — ensure `src/types/` is included in typeRoots or files if needed

**Must NOT modify:**
- `src/interfaces/IAuthProvider.ts` (defined in F1-T3)
- `src/middleware/errorHandler.ts` (defined in F1-T3)

## TDD Sequence

1. Create TypeScript declaration merging file (type-only, no tests needed)
2. Write missing-key tests (no header, empty, whitespace) -> implement header extraction and missing-key response
3. Write invalid-key test -> implement IAuthProvider.validateKey call and invalid-key response
4. Write valid-key test -> implement req.user assignment and next() call
5. Write error-handling tests -> implement try/catch with next(err)
6. Write multi-header edge case test -> implement array handling

---
_Generated from: specs/plans/PLAN-F2-auth-middleware.md_
_Next step: "Implement task: specs/tasks/F2-auth-middleware/F2-T3-auth-middleware.md" using the TDD skill._
