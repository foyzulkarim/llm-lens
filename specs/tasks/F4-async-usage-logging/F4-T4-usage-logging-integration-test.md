# TASK: Usage Logging End-to-End Integration Test

> **Date:** 2026-03-28
> **Phase:** Phase 2 — Live Session
> **Epic:** F4 — Async Usage Logging
> **Effort:** m
> **Priority:** high
> **Depends on:** F4-T2-fire-and-forget-proxy-integration.md, F1-T5-usage-repo-test-infra.md
> **Plan source:** specs/plans/PLAN-F4-async-usage-logging.md

## Description

Write integration and API-level tests that verify the full usage logging flow end-to-end: make a proxied chat request via Supertest, wait briefly for the async log write to complete, then query the database to confirm the UsageLog row was created with the correct fields. Also verify that a failed proxy request does NOT produce a log entry, and that a database failure during logging does not affect the API response.

## Test Plan

### Test File(s)

- `src/__tests__/integration/usage/usageLogging.test.ts`

### Test Scenarios

#### Successful Request Produces Log Entry

- **creates a UsageLog row after a successful chat request** — GIVEN a valid authenticated chat request WHEN the request completes successfully THEN after a brief wait (100ms) a UsageLog row exists in the database with the correct userId, model, and token counts
- **log entry contains correct latencyMs** — GIVEN a successful chat request WHEN the UsageLog row is queried THEN latencyMs is a positive number reflecting actual request duration
- **log entry has auto-generated createdAt timestamp** — GIVEN a successful chat request WHEN the UsageLog row is queried THEN createdAt is approximately now (within 5 seconds)
- **multiple requests create multiple independent log entries** — GIVEN two sequential authenticated chat requests WHEN both complete THEN two distinct UsageLog rows exist in the database

#### Failed Proxy Does Not Log

- **no log entry when Ollama returns an error** — GIVEN an authenticated chat request WHEN the Ollama mock returns a 500 error THEN after waiting no UsageLog row exists for this request

#### Resilience

- **API response succeeds even when database logging fails** — GIVEN a chat request WHEN the usage repository is configured to throw on create (simulated DB failure) THEN the API response is still 200 with valid chat data
- **console.error is called when database logging fails** — GIVEN a chat request WHEN the usage repository throws on create THEN console.error is called with the error details

## Implementation Notes

- **Layer(s):** Integration test (`src/__tests__/integration/usage/`)
- **Pattern reference:** Uses testDb and testApp helpers from F1-T5
- **Key decisions:**
  - Use `await new Promise(r => setTimeout(r, 100))` after the API call to let the async log write complete before querying the DB
  - Use the MockOllamaClient from F1-T4 to control proxy responses
  - Use the test database helpers to query UsageLog table directly
  - For the DB failure test, temporarily override the usage repo's create method to throw
- **Libraries:** supertest, @prisma/client (for DB queries in assertions)

### Async Wait Strategy

Since logging is fire-and-forget, the test must wait for the background write to complete before asserting. A 100ms delay is sufficient for local SQLite. If tests are flaky, increase to 200ms. This is an acceptable trade-off for testing genuinely async behavior.

## Scope Boundaries

- Do NOT test UsageLoggerService in isolation (covered by T1 unit tests)
- Do NOT test the fire-and-forget pattern in isolation (covered by T2 unit tests)
- Do NOT test edge cases like missing user context (covered by T3)
- This task is purely integration/API-level verification of the full flow
- Do NOT add production code — only test files

## Files Expected

**New files:**

- `src/__tests__/integration/usage/usageLogging.test.ts`

**Modified files:**

- None (all production code is already in place from T1-T3)

**Must NOT modify:**

- `src/usage/usageLoggerService.ts`
- `src/proxy/chatHandler.ts`
- `src/usage/usageRepository.ts`

## TDD Sequence

1. Write test: creates a UsageLog row after successful chat request → should pass against existing implementation from T1-T3
2. Write test: log entry has correct fields and timestamp → should pass
3. Write test: multiple requests create multiple entries → should pass
4. Write test: no log entry when Ollama errors → should pass (T2 conditional logic)
5. Write test: API response succeeds even when DB logging fails → should pass (T2 fire-and-forget)
6. Write test: console.error called on DB failure → should pass (T2 .catch() handler)

---

_Generated from: specs/plans/PLAN-F4-async-usage-logging.md_
_Next step: "Implement task: specs/tasks/F4-async-usage-logging/F4-T4-usage-logging-integration-test.md" using the TDD skill._
