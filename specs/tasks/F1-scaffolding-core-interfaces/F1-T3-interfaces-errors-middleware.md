# TASK: Core Interfaces, Custom Error Classes & Error Handler Middleware

> **Date:** 2026-03-28
> **Phase:** Phase 1 — Foundation
> **Epic:** F1 — Scaffolding & Core Interfaces
> **Effort:** s
> **Priority:** critical
> **Depends on:** F1-T1-project-scaffolding.md
> **Plan source:** specs/plans/PLAN-F1-scaffolding-core-interfaces.md

## Description

Define all core interfaces (IOllamaClient, IAuthProvider, IUsageLogger, IUsageRepo) with their associated types, implement custom error classes (ValidationError, AuthenticationError, NotFoundError, OllamaConnectionError, OllamaResponseError), and build the global error handler middleware that maps these errors to consistent JSON responses. The interfaces establish the contracts that all features depend on; the error handler ensures consistent error responses across the entire API.

## Test Plan

### Test File(s)

- `src/__tests__/unit/middleware/errorHandler.test.ts`
- `src/__tests__/unit/errors/errors.test.ts`

### Test Scenarios

#### Custom Error Classes

- **ValidationError has correct properties** — GIVEN a new ValidationError("invalid email") WHEN inspected THEN name is "ValidationError", message is "invalid email", it is instanceof Error
- **AuthenticationError has correct properties** — GIVEN a new AuthenticationError("bad key") WHEN inspected THEN name is "AuthenticationError", message is "bad key"
- **NotFoundError has correct properties** — GIVEN a new NotFoundError("user not found") WHEN inspected THEN name is "NotFoundError", message is "user not found"
- **OllamaConnectionError wraps original error** — GIVEN an OllamaConnectionError with a cause WHEN inspected THEN cause is accessible
- **OllamaResponseError has correct properties** — GIVEN an OllamaResponseError("bad response") WHEN inspected THEN message is "bad response"

#### Error Handler Middleware

- **maps ValidationError to 400** — GIVEN a ValidationError is thrown WHEN error handler runs THEN response is 400 with `{ error: { message, code: "VALIDATION_ERROR", status: 400 } }`
- **maps AuthenticationError to 401** — GIVEN an AuthenticationError WHEN error handler runs THEN response is 401 with code "AUTHENTICATION_ERROR"
- **maps NotFoundError to 404** — GIVEN a NotFoundError WHEN error handler runs THEN response is 404 with code "NOT_FOUND"
- **maps unknown errors to 500** — GIVEN a generic Error WHEN error handler runs THEN response is 500 with code "INTERNAL_ERROR"
- **hides error details in production** — GIVEN NODE_ENV=production and an unknown error WHEN error handler runs THEN message is "Internal server error" (not the actual error message)
- **shows error details in development** — GIVEN NODE_ENV=development and an unknown error WHEN error handler runs THEN message contains the actual error message
- **logs errors to console.error** — GIVEN any error WHEN error handler runs THEN console.error is called with the error

## Implementation Notes

- **Layer(s):** Interfaces (type-only), error classes, Express middleware
- **Pattern reference:** None (greenfield)
- **Key decisions:**
  - Interfaces in `src/interfaces/` — central location for all contracts
  - Custom error classes use `instanceof` for type checking in middleware
  - Error handler is a 4-argument Express middleware `(err, req, res, next)`
  - JSON response shape: `{ error: { message, code, status } }`
- **Libraries:** express (for middleware types)

## Scope Boundaries

- Do NOT implement any interface (MockOllamaClient is T4, PrismaUsageRepository is T5, ApiKeyAuthProvider is F2)
- Do NOT add routes — only the error handler middleware
- Interfaces are type-only files (no logic)
- Error classes are simple constructors — no business logic

## Files Expected

**New files:**

- `src/interfaces/IOllamaClient.ts` — ChatRequest, ChatResponse, IOllamaClient
- `src/interfaces/IAuthProvider.ts` — UserContext, IAuthProvider
- `src/interfaces/IUsageLogger.ts` — UsageRecord, IUsageLogger
- `src/interfaces/IUsageRepo.ts` — IUsageRepo
- `src/interfaces/index.ts` — barrel export
- `src/errors/index.ts` — ValidationError, AuthenticationError, NotFoundError, OllamaConnectionError, OllamaResponseError
- `src/middleware/errorHandler.ts` — global error handler middleware
- `src/__tests__/unit/middleware/errorHandler.test.ts`
- `src/__tests__/unit/errors/errors.test.ts`

**Modified files:**

- `src/app.ts` (register error handler middleware as the last middleware)

**Must NOT modify:**

- `prisma/` directory
- `src/server.ts`

## TDD Sequence

1. Write error class tests → implement error classes
2. Write error handler middleware tests → implement middleware
3. Create interface files (no tests needed — type-only)
4. Wire error handler into app.ts

---

_Generated from: specs/plans/PLAN-F1-scaffolding-core-interfaces.md_
_Next step: "Implement task: specs/tasks/F1-scaffolding-core-interfaces/F1-T3-interfaces-errors-middleware.md" using the TDD skill._
