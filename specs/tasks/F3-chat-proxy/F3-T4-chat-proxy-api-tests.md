# TASK: Chat Proxy API Integration Tests

> **Date:** 2026-03-28
> **Phase:** Phase 1 — Foundation
> **Epic:** F3 — Chat Proxy Endpoint
> **Effort:** m
> **Priority:** high
> **Depends on:** F3-T3-chat-controller-route.md, F1-T5-usage-repo-test-infra.md
> **Plan source:** specs/plans/PLAN-F3-chat-proxy.md

## Description

Write API-level integration tests for `POST /api/chat` using Supertest against the Express app configured with MockOllamaClient. These tests exercise the full middleware chain (auth, validation, controller, error handler) end-to-end. They cover the happy path, all validation error scenarios, auth errors, and Ollama failure modes (connection refused, bad response, timeout) to ensure the error mapping produces correct HTTP status codes and response shapes.

## Test Plan

### Test File(s)

- `src/__tests__/api/chat.api.test.ts`

### Test Scenarios

#### POST /api/chat — Happy Path

- **returns 200 with assistant message** — GIVEN a valid API key and a valid chat request WHEN POST /api/chat is called THEN response is 200 with `{ message: { role: "assistant", content }, model, usage: { promptTokens, completionTokens, totalTokens } }`
- **does not include latencyMs in response** — GIVEN a valid request WHEN POST /api/chat is called THEN the response body does NOT contain a `latencyMs` property
- **accepts multiple messages** — GIVEN a valid request with 3 messages (system, user, assistant) WHEN POST /api/chat is called THEN response is 200 with a valid assistant message

#### POST /api/chat — Validation Errors

- **returns 400 for missing model** — GIVEN a valid API key and request body without `model` WHEN POST /api/chat is called THEN response is 400 with `{ error: { code: "VALIDATION_ERROR", message: "model is required" } }`
- **returns 400 for empty messages array** — GIVEN a valid API key and `messages: []` WHEN POST /api/chat is called THEN response is 400 with error message "messages array must not be empty"
- **returns 400 for invalid message role** — GIVEN a valid API key and a message with `role: "bot"` WHEN POST /api/chat is called THEN response is 400 with error message containing "invalid message role: bot"

#### POST /api/chat — Auth Errors

- **returns 401 when no API key provided** — GIVEN no X-API-Key header WHEN POST /api/chat is called THEN response is 401 with code "MISSING_API_KEY"
- **returns 401 when invalid API key provided** — GIVEN an invalid X-API-Key header WHEN POST /api/chat is called THEN response is 401 with code "INVALID_API_KEY"

#### POST /api/chat — Ollama Failure Modes

- **returns 502 when Ollama is unavailable** — GIVEN a MockOllamaClient configured to throw OllamaConnectionError WHEN POST /api/chat is called THEN response is 502 with code "OLLAMA_UNAVAILABLE" and message "Ollama service is unavailable"
- **returns 502 when Ollama returns unexpected response** — GIVEN a MockOllamaClient configured to throw OllamaResponseError WHEN POST /api/chat is called THEN response is 502 with code "OLLAMA_ERROR" and message containing "Ollama returned an error"
- **returns 504 when Ollama times out** — GIVEN a MockOllamaClient configured to simulate a timeout WHEN POST /api/chat is called THEN response is 504 with code "OLLAMA_TIMEOUT" and message "Ollama request timed out"

## Implementation Notes

- **Layer(s):** API integration tests
- **Pattern reference:** Supertest against Express app — same pattern as F1-T5 test infrastructure
- **Key decisions:**
  - Tests use `supertest(app)` where `app` is configured with MockOllamaClient
  - Auth is tested by providing or omitting the `X-API-Key` header — requires a seeded test API key
  - Ollama failure modes are tested by configuring MockOllamaClient behavior (e.g., setting model to "error-model" for errors, or providing a custom mock that throws specific error types)
  - The error handler must map OllamaConnectionError to 502/OLLAMA_UNAVAILABLE and OllamaResponseError to 502/OLLAMA_ERROR — these mappings may need to be added to the error handler if not already present from T3
  - Timeout mapping (AbortError -> 504/OLLAMA_TIMEOUT) requires the error handler to distinguish timeout errors
  - These tests validate the full chain: request -> auth -> validation -> controller -> service -> mock client -> response
- **Test setup:**
  - Create a test app factory that accepts an IOllamaClient and returns a configured Express app
  - Seed a valid API key for auth tests (or use a test auth provider)

## Scope Boundaries

- Do NOT test against a real Ollama instance — all tests use MockOllamaClient or jest mocks
- Do NOT test usage logging — that is F4
- Do NOT test endpoints other than POST /api/chat
- These are integration tests (full middleware chain), NOT unit tests — unit tests live in T1/T2/T3
- May require minor updates to the error handler to support OllamaConnectionError -> 502 and timeout -> 504 mappings if not already present

## Files Expected

**New files:**

- `src/__tests__/api/chat.api.test.ts`

**Modified files:**

- `src/middleware/errorHandler.ts` — add mappings for OllamaConnectionError (502) and OllamaResponseError (502) if not already present
- `src/__tests__/helpers/` — test app factory or test setup utilities if needed

**Must NOT modify:**

- `src/services/ProxyService.ts`
- `src/controllers/ProxyController.ts`
- `src/middleware/validateChatRequest.ts`

## TDD Sequence

1. Write happy path API test -> verify it passes with existing wiring
2. Write validation error tests -> verify 400 responses
3. Write auth error tests -> verify 401 responses
4. Write Ollama failure mode tests -> update error handler mappings if needed to produce correct 502/504 codes
5. Write edge case test (no latencyMs in response) -> verify response shape

---

_Generated from: specs/plans/PLAN-F3-chat-proxy.md_
_Next step: "Implement task: specs/tasks/F3-chat-proxy/F3-T4-chat-proxy-api-tests.md" using the TDD skill._
