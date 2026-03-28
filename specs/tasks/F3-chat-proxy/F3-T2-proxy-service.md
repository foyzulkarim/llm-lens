# TASK: ProxyService — Chat Forwarding with Latency Measurement

> **Date:** 2026-03-28
> **Phase:** Phase 1 — Foundation
> **Epic:** F3 — Chat Proxy Endpoint
> **Effort:** m
> **Priority:** critical
> **Depends on:** P1-E1-T3-interfaces-errors-middleware.md, P1-E1-T4-ollama-clients.md
> **Plan source:** specs/plans/PLAN-F3-chat-proxy.md

## Description

Implement the `ProxyService` class that accepts a `ChatRequest`, forwards it to `IOllamaClient.chat()`, measures latency, and returns a `ProxyResult`. The service is a thin orchestration layer that owns the Ollama call and wraps the result with timing metadata. It maps Ollama client errors (connection, timeout, response errors) into appropriate error types that the error handler middleware can convert to 502/504 responses.

## Test Plan

### Test File(s)
- `src/__tests__/unit/services/ProxyService.test.ts`

### Test Scenarios

#### ProxyService.forwardChat

- **returns ProxyResult with message and model** — GIVEN a MockOllamaClient that returns a successful response WHEN forwardChat is called with model "llama3" and messages THEN result contains message with role "assistant", content from the mock, and model "llama3"
- **returns usage token counts** — GIVEN a MockOllamaClient WHEN forwardChat is called THEN result.usage contains promptTokens, completionTokens, and totalTokens matching the mock response
- **measures latency in milliseconds** — GIVEN a MockOllamaClient with 50ms simulated latency WHEN forwardChat is called THEN result.latencyMs is >= 50
- **passes messages through without modification** — GIVEN messages with specific content WHEN forwardChat is called THEN the IOllamaClient receives the exact same messages array (transparent proxy)
- **wraps OllamaConnectionError on connection failure** — GIVEN an IOllamaClient that throws OllamaConnectionError WHEN forwardChat is called THEN the OllamaConnectionError propagates (not swallowed or wrapped in a generic error)
- **wraps OllamaResponseError on bad upstream response** — GIVEN an IOllamaClient that throws OllamaResponseError WHEN forwardChat is called THEN the OllamaResponseError propagates with the original message
- **handles zero token counts gracefully** — GIVEN an IOllamaClient that returns 0 for all token counts WHEN forwardChat is called THEN result.usage contains promptTokens: 0, completionTokens: 0, totalTokens: 0
- **propagates timeout errors** — GIVEN an IOllamaClient that throws an AbortError (timeout) WHEN forwardChat is called THEN an OllamaConnectionError with a timeout message is thrown

## Implementation Notes

- **Layer(s):** Service (`src/services/`)
- **Pattern reference:** Constructor injection of `IOllamaClient`
- **Key decisions:**
  - Latency is measured using `Date.now()` or `performance.now()` around the `ollamaClient.chat()` call
  - `latencyMs` is included in `ProxyResult` but NOT in the HTTP response — it is internal metadata for F4 (usage logging)
  - The service does NOT catch and re-throw errors as 500s — it lets typed errors (OllamaConnectionError, OllamaResponseError) propagate so the error handler can map them to 502
  - Timeout errors (AbortError from fetch) should be caught and re-thrown as OllamaConnectionError with a descriptive message so the error handler can map to 504
- **Types to define:**
  - `ProxyResult` interface (message, model, usage, latencyMs)
  - `ChatProxyRequest` type alias if needed (or reuse `ChatRequest` from interfaces)

## Scope Boundaries

- Do NOT add routes, controllers, or middleware
- Do NOT log usage — that is F4's responsibility
- Do NOT modify messages in any direction — transparent proxy
- Do NOT implement retry logic — single attempt per request
- Tests use MockOllamaClient (or a jest mock implementing IOllamaClient)

## Files Expected

**New files:**
- `src/services/ProxyService.ts`
- `src/__tests__/unit/services/ProxyService.test.ts`

**Modified files:** None

**Must NOT modify:**
- `src/interfaces/IOllamaClient.ts`
- `src/clients/MockOllamaClient.ts`
- `src/middleware/`

## TDD Sequence

1. Write test for happy path (returns message, model, usage) -> implement basic forwardChat
2. Write test for latency measurement -> add timing logic
3. Write test for transparent message passthrough -> verify no mutation
4. Write tests for error propagation (connection, response, timeout) -> add error handling

---
_Generated from: specs/plans/PLAN-F3-chat-proxy.md_
_Next step: "Implement task: specs/tasks/P1-E3-T2-proxy-service.md" using the TDD skill._
