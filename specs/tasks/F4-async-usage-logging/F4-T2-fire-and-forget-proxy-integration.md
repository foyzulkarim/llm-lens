# TASK: Fire-and-Forget Usage Logging in Proxy Handler

> **Date:** 2026-03-28
> **Phase:** Phase 2 — Live Session
> **Epic:** F4 — Async Usage Logging
> **Effort:** m
> **Priority:** critical
> **Depends on:** F4-T1-usage-logger-service.md, F3-* (proxy handler)
> **Plan source:** specs/plans/PLAN-F4-async-usage-logging.md

## Description

Integrate `UsageLoggerService` into the proxy chat handler using the fire-and-forget pattern. After the proxy response is sent to the client via `res.json()`, the handler calls `usageLogger.log()` without awaiting it, attaching a `.catch()` that logs failures to `console.error`. The client response must never be delayed or affected by the log write. This task implements the core async pattern that is the teaching focus of the live session.

## Test Plan

### Test File(s)
- `src/__tests__/unit/proxy/chatHandler.usageLogging.test.ts`

### Test Scenarios

#### Fire-and-Forget Behavior

- **response is sent before log write completes** — GIVEN a successful proxy request WHEN the handler runs THEN res.json() is called BEFORE usageLogger.log() resolves (mock log to delay, assert res.json called first)
- **log write failure does not affect response** — GIVEN usageLogger.log() rejects with an Error WHEN the handler runs THEN res.json() still sends a 200 response and no error is sent to the client
- **failed log write is reported to console.error** — GIVEN usageLogger.log() rejects with Error("db full") WHEN the handler runs THEN console.error is called with a message containing "db full"
- **no unhandled promise rejection on log failure** — GIVEN usageLogger.log() rejects WHEN the handler runs THEN no unhandledRejection event is emitted (the .catch() handles it)

#### Correct Fields Logged

- **logs all required usage fields** — GIVEN a successful proxy response with model="llama3", usage={promptTokens:10, completionTokens:20, totalTokens:30}, latencyMs=150, and req.user.userId="user-1" WHEN the handler runs THEN usageLogger.log() is called with {userId:"user-1", model:"llama3", promptTokens:10, completionTokens:20, totalTokens:30, latencyMs:150}
- **extracts userId from auth context** — GIVEN req.user.userId is "user-42" WHEN the handler runs THEN usageLogger.log() receives userId="user-42"

#### Conditional Logging

- **only logs on successful proxy requests** — GIVEN the proxy service throws an error (Ollama is down) WHEN the handler runs THEN usageLogger.log() is NOT called
- **produces exactly one log entry per successful request** — GIVEN a successful proxy request WHEN the handler runs THEN usageLogger.log() is called exactly once

## Implementation Notes

- **Layer(s):** Controller/handler (`src/proxy/` or wherever the chat route handler lives)
- **Pattern reference:** Fire-and-forget as described in plan — `usageLogger.log({...}).catch(err => console.error(...))`
- **Key decisions:**
  - `res.json()` is called BEFORE the log write — this is the critical ordering
  - `.catch()` on the promise prevents unhandled rejection
  - The handler does NOT `await` the log call in the response path
  - UsageLoggerService is injected via constructor or dependency injection
- **Libraries:** express, existing proxy service

### Testing the Async Ordering

To verify `res.json()` is called before `usageLogger.log()` resolves:
1. Mock `usageLogger.log()` to return a promise that resolves after a delay
2. Mock `res.json()` to record when it was called
3. After calling the handler, assert `res.json()` was called immediately
4. Then resolve the log promise and verify `usageLogger.log()` was also called

## Scope Boundaries

- Do NOT modify UsageLoggerService (already built in T1)
- Do NOT add retry logic for failed log writes
- Do NOT log failed proxy requests (only successful ones)
- Do NOT add batching or buffering
- Do NOT block the response on the log write under any circumstance

## Files Expected

**New files:**
- `src/__tests__/unit/proxy/chatHandler.usageLogging.test.ts`

**Modified files:**
- `src/proxy/chatHandler.ts` (or equivalent proxy controller) — add usageLogger dependency and fire-and-forget call
- `src/app.ts` or DI setup — wire UsageLoggerService into the proxy handler

**Must NOT modify:**
- `src/usage/usageLoggerService.ts` (built in T1)
- `src/usage/usageRepository.ts` (built in F1-T5)

## TDD Sequence

1. Write test: response is sent before log write completes → add usageLogger.log() call after res.json() in handler
2. Write test: logs all required usage fields → extract fields from proxy result and auth context
3. Write test: log write failure does not affect response → add .catch() to the log promise
4. Write test: failed log write reported to console.error → add console.error in the .catch()
5. Write test: only logs on successful proxy requests → add conditional check
6. Write test: exactly one log entry per request → verify no duplicate calls

---
_Generated from: specs/plans/PLAN-F4-async-usage-logging.md_
_Next step: "Implement task: specs/tasks/F4-async-usage-logging/F4-T2-fire-and-forget-proxy-integration.md" using the TDD skill._
