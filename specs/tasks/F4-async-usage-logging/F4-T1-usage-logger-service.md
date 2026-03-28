# TASK: UsageLoggerService Implementation

> **Date:** 2026-03-28
> **Phase:** Phase 2 — Live Session
> **Epic:** F4 — Async Usage Logging
> **Effort:** s
> **Priority:** critical
> **Depends on:** F1-T3-interfaces-errors-middleware.md, F1-T5-usage-repo-test-infra.md
> **Plan source:** specs/plans/PLAN-F4-async-usage-logging.md

## Description

Implement `UsageLoggerService`, the concrete implementation of the `IUsageLogger` interface. The service accepts a `UsageRecord` and delegates to `IUsageRepo.create()` to persist it. The service itself is thin — it contains no async/fire-and-forget logic (that responsibility belongs to the caller). It is fully unit-testable with a mocked `IUsageRepo`.

## Test Plan

### Test File(s)

- `src/__tests__/unit/usage/usageLoggerService.test.ts`

### Test Scenarios

#### UsageLoggerService.log()

- **delegates to usageRepo.create with correct fields** — GIVEN a valid UsageRecord WHEN log() is called THEN usageRepo.create() is called once with the same UsageRecord fields (userId, model, promptTokens, completionTokens, totalTokens, latencyMs)
- **returns a resolved promise on success** — GIVEN usageRepo.create() resolves WHEN log() is called THEN the returned promise resolves without error
- **propagates repository errors** — GIVEN usageRepo.create() rejects with an Error WHEN log() is called THEN the returned promise rejects with the same error
- **does not swallow errors internally** — GIVEN usageRepo.create() throws WHEN log() is called THEN the error propagates to the caller (no internal try/catch)
- **passes all UsageRecord fields faithfully** — GIVEN a UsageRecord with specific values (userId="user-1", model="llama3", promptTokens=10, completionTokens=20, totalTokens=30, latencyMs=150) WHEN log() is called THEN usageRepo.create() receives an object matching every field exactly
- **handles zero token values** — GIVEN a UsageRecord where promptTokens=0, completionTokens=0, totalTokens=0 WHEN log() is called THEN usageRepo.create() is called with those zero values (not skipped or rejected)

## Implementation Notes

- **Layer(s):** Service (`src/usage/`)
- **Pattern reference:** Implements IUsageLogger from `src/interfaces/IUsageLogger.ts`
- **Key decisions:**
  - The service does NOT contain fire-and-forget logic — that lives in the proxy handler (T2)
  - The service does NOT catch errors — error handling is the caller's responsibility
  - Constructor injection of IUsageRepo for testability
  - No timestamp handling — `createdAt` is set by Prisma's `@default(now())`
- **Libraries:** None beyond existing interfaces

## Scope Boundaries

- Do NOT implement fire-and-forget behavior (that is T2)
- Do NOT add error catching/logging inside the service (the caller does that)
- Do NOT modify existing proxy routes
- Do NOT add any business logic beyond delegating to the repo

## Files Expected

**New files:**

- `src/usage/usageLoggerService.ts` — UsageLoggerService implementing IUsageLogger
- `src/__tests__/unit/usage/usageLoggerService.test.ts`

**Modified files:**

- None

**Must NOT modify:**

- `src/interfaces/` (already defined in F1-T3)
- `src/usage/usageRepository.ts` (already defined in F1-T5)

## TDD Sequence

1. Write test: delegates to usageRepo.create with correct fields → implement UsageLoggerService class with constructor and log() method
2. Write test: returns resolved promise on success → verify existing implementation passes
3. Write test: propagates repository errors → verify no internal try/catch swallows errors
4. Write test: handles zero token values → verify no validation rejects zeros

---

_Generated from: specs/plans/PLAN-F4-async-usage-logging.md_
_Next step: "Implement task: specs/tasks/F4-async-usage-logging/F4-T1-usage-logger-service.md" using the TDD skill._
