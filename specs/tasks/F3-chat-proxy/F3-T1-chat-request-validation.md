# TASK: Chat Request Validation Middleware

> **Date:** 2026-03-28
> **Phase:** Phase 1 — Foundation
> **Epic:** F3 — Chat Proxy Endpoint
> **Effort:** s
> **Priority:** critical
> **Depends on:** P1-E1-T3-interfaces-errors-middleware.md
> **Plan source:** specs/plans/PLAN-F3-chat-proxy.md

## Description

Implement a `validateChatRequest` middleware function that validates the `POST /api/chat` request body before it reaches the proxy controller. It checks that `model` is a non-empty string, `messages` is a non-empty array, and each message has a valid `role` (one of "user", "assistant", "system") and a `content` field (string, may be empty). On validation failure it throws a `ValidationError` which the existing error handler maps to a 400 response.

## Test Plan

### Test File(s)
- `src/__tests__/unit/middleware/validateChatRequest.test.ts`

### Test Scenarios

#### validateChatRequest Middleware

- **passes valid request to next** — GIVEN a request body with model "llama3" and messages `[{ role: "user", content: "hi" }]` WHEN middleware runs THEN `next()` is called with no arguments
- **rejects missing model field** — GIVEN a request body with no `model` field WHEN middleware runs THEN `next()` is called with a ValidationError containing "model is required"
- **rejects empty model string** — GIVEN a request body with `model: ""` WHEN middleware runs THEN `next()` is called with a ValidationError containing "model is required"
- **rejects missing messages field** — GIVEN a request body with model but no `messages` WHEN middleware runs THEN `next()` is called with a ValidationError containing "messages array must not be empty"
- **rejects empty messages array** — GIVEN a request body with `messages: []` WHEN middleware runs THEN `next()` is called with a ValidationError containing "messages array must not be empty"
- **rejects invalid message role** — GIVEN a message with `role: "bot"` WHEN middleware runs THEN `next()` is called with a ValidationError containing "invalid message role: bot"
- **accepts all valid roles** — GIVEN messages with roles "user", "assistant", and "system" WHEN middleware runs THEN `next()` is called with no arguments
- **accepts empty content string** — GIVEN a message with `role: "user"` and `content: ""` WHEN middleware runs THEN `next()` is called with no arguments (empty content is valid)

## Implementation Notes

- **Layer(s):** Express middleware (`src/middleware/`)
- **Pattern reference:** Same pattern as error handler middleware from T3 — a function that inspects the request and either calls `next()` or `next(error)`
- **Key decisions:**
  - Throws `ValidationError` (from `src/errors/`) — the global error handler already maps it to 400
  - Validates role against a whitelist: `["user", "assistant", "system"]`
  - Does NOT validate message `content` type beyond checking it is a string — empty strings are accepted per the plan's edge case table
  - Does NOT limit messages array length — Ollama handles context window limits (transparent proxy philosophy)
  - Model names with special characters are passed through — Ollama validates model names

## Scope Boundaries

- Do NOT call IOllamaClient or ProxyService — this is validation only
- Do NOT add routes — just export the middleware function
- Do NOT validate request body size — `express.json({ limit: '1mb' })` is handled in app setup

## Files Expected

**New files:**
- `src/middleware/validateChatRequest.ts`
- `src/__tests__/unit/middleware/validateChatRequest.test.ts`

**Modified files:** None

**Must NOT modify:**
- `src/middleware/errorHandler.ts`
- `src/interfaces/`
- `src/app.ts` (route wiring is T3)

## TDD Sequence

1. Write tests for valid request passing through
2. Write tests for each validation failure (model, messages, roles)
3. Implement middleware to make all tests pass

---
_Generated from: specs/plans/PLAN-F3-chat-proxy.md_
_Next step: "Implement task: specs/tasks/P1-E3-T1-chat-request-validation.md" using the TDD skill._
