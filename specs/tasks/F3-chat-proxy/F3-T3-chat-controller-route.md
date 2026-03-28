# TASK: Chat Controller and Route Wiring

> **Date:** 2026-03-28
> **Phase:** Phase 1 — Foundation
> **Epic:** F3 — Chat Proxy Endpoint
> **Effort:** s
> **Priority:** high
> **Depends on:** F3-T1-chat-request-validation.md, F3-T2-proxy-service.md, F1-T3-interfaces-errors-middleware.md
> **Plan source:** specs/plans/PLAN-F3-chat-proxy.md

## Description

Implement the `ProxyController` class with a `chat` method that takes the validated request, calls `ProxyService.forwardChat()`, and maps the `ProxyResult` to the HTTP response shape (excluding `latencyMs`). Wire the `POST /api/chat` route with the full middleware chain: authMiddleware, validateChatRequest, and proxyController.chat.

## Test Plan

### Test File(s)
- `src/__tests__/unit/controllers/ProxyController.test.ts`

### Test Scenarios

#### ProxyController.chat

- **returns 200 with correct response shape** — GIVEN ProxyService.forwardChat resolves with a ProxyResult WHEN controller.chat handles the request THEN response is 200 with `{ message: { role, content }, model, usage: { promptTokens, completionTokens, totalTokens } }`
- **excludes latencyMs from response body** — GIVEN ProxyService returns a ProxyResult with latencyMs: 150 WHEN controller.chat handles the request THEN the response JSON does NOT contain a `latencyMs` field
- **passes request body to ProxyService** — GIVEN a request with model "llama3" and messages WHEN controller.chat handles the request THEN ProxyService.forwardChat is called with matching model and messages
- **calls next with error when ProxyService throws** — GIVEN ProxyService.forwardChat rejects with an OllamaConnectionError WHEN controller.chat handles the request THEN `next()` is called with the error (delegating to error handler)
- **maps OllamaConnectionError to error handler** — GIVEN ProxyService throws OllamaConnectionError WHEN controller.chat handles the request THEN `next(error)` is called and the error is an instance of OllamaConnectionError
- **maps OllamaResponseError to error handler** — GIVEN ProxyService throws OllamaResponseError WHEN controller.chat handles the request THEN `next(error)` is called and the error is an instance of OllamaResponseError

## Implementation Notes

- **Layer(s):** Controller (`src/controllers/`), Route (`src/routes/`)
- **Pattern reference:** Express route handler pattern — controller method has signature `(req, res, next) => void`
- **Key decisions:**
  - Controller is a class with `ProxyService` injected via constructor for testability
  - The controller does NOT contain business logic — it maps HTTP request to service call and service result to HTTP response
  - `latencyMs` is deliberately excluded from the response — it is internal metadata for F4
  - Errors are passed to `next()` for the global error handler to process
  - Route wiring: `router.post('/chat', authMiddleware, validateChatRequest, controller.chat.bind(controller))`
  - The route file creates the dependency chain (IOllamaClient -> ProxyService -> ProxyController)

## Scope Boundaries

- Do NOT implement auth middleware — reference it from F2
- Do NOT re-implement validation — use validateChatRequest from T1
- Do NOT add usage logging — that is F4
- Do NOT handle streaming responses — project exclusion
- Controller tests mock ProxyService, not IOllamaClient (testing the controller layer in isolation)

## Files Expected

**New files:**
- `src/controllers/ProxyController.ts`
- `src/routes/chat.ts`
- `src/__tests__/unit/controllers/ProxyController.test.ts`

**Modified files:**
- `src/app.ts` — mount the chat router at `/api` and configure `express.json({ limit: '1mb' })`

**Must NOT modify:**
- `src/services/ProxyService.ts`
- `src/middleware/validateChatRequest.ts`
- `src/interfaces/`

## TDD Sequence

1. Write controller tests (mock ProxyService) -> implement ProxyController
2. Create route file wiring middleware chain
3. Mount router in app.ts

---
_Generated from: specs/plans/PLAN-F3-chat-proxy.md_
_Next step: "Implement task: specs/tasks/F3-chat-proxy/F3-T3-chat-controller-route.md" using the TDD skill._
