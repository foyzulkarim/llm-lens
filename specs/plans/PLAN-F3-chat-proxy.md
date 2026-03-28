# Plan: Chat Proxy Endpoint (F3)

> **Date:** 2026-03-28
> **Project source:** specs/plans/PROJECT-ollama-usage-intelligence-api.md
> **Estimated tasks:** 4
> **Planning session:** detailed

## Summary

Implement the `POST /api/chat` proxy endpoint — the core of the application. It accepts chat requests from authenticated clients, forwards them to Ollama (via IOllamaClient), and returns the response. This is a transparent proxy: the client sends messages, gets back an AI response. Usage logging (F4) will be integrated later; this feature delivers the proxy flow without logging.

## Requirements

### Functional Requirements
1. `POST /api/chat` accepts a JSON body with `model` (string) and `messages` (array of `{ role, content }`)
2. The endpoint is protected by auth middleware (requires valid X-API-Key)
3. The request is forwarded to IOllamaClient.chat() with the provided model and messages
4. The Ollama response is returned to the client as JSON: `{ message: { role, content }, model, usage: { promptTokens, completionTokens, totalTokens } }`
5. Latency is measured (time from forwarding to Ollama to receiving response)
6. If Ollama returns an error, the proxy returns an appropriate error to the client
7. Request validation rejects malformed requests before calling Ollama

### Non-Functional Requirements
1. Response time overhead (proxy layer) should be < 50ms excluding Ollama processing time
2. The proxy must not modify the message content in either direction
3. The endpoint must work identically with MockOllamaClient and RealOllamaClient

## Detailed Specifications

### POST /api/chat

**Request:**
```json
{
  "model": "llama3",
  "messages": [
    { "role": "user", "content": "What is TypeScript?" }
  ]
}
```

**Successful Response (200):**
```json
{
  "message": {
    "role": "assistant",
    "content": "TypeScript is a superset of JavaScript..."
  },
  "model": "llama3",
  "usage": {
    "promptTokens": 12,
    "completionTokens": 45,
    "totalTokens": 57
  }
}
```

**Validation Rules:**
- `model`: required, non-empty string
- `messages`: required, non-empty array
- Each message: must have `role` (string, one of "user", "assistant", "system") and `content` (string, can be empty)

**Error Scenarios:**

| Condition | Status | Code | Message |
|-----------|--------|------|---------|
| Missing `model` field | 400 | VALIDATION_ERROR | "model is required" |
| Empty `messages` array | 400 | VALIDATION_ERROR | "messages array must not be empty" |
| Invalid message role | 400 | VALIDATION_ERROR | "invalid message role: {role}" |
| Missing auth (no key) | 401 | MISSING_API_KEY | "API key is required" |
| Invalid auth (bad key) | 401 | INVALID_API_KEY | "Invalid API key" |
| Ollama connection refused | 502 | OLLAMA_UNAVAILABLE | "Ollama service is unavailable" |
| Ollama returns error | 502 | OLLAMA_ERROR | "Ollama returned an error: {detail}" |
| Ollama timeout (30s) | 504 | OLLAMA_TIMEOUT | "Ollama request timed out" |
| Internal server error | 500 | INTERNAL_ERROR | "Internal server error" |

### ProxyService

```typescript
interface ProxyResult {
  message: { role: string; content: string };
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latencyMs: number;
}

class ProxyService {
  constructor(private ollamaClient: IOllamaClient) {}

  async forwardChat(request: ChatRequest): Promise<ProxyResult> {
    // Measures latency, calls ollamaClient.chat(), wraps response
  }
}
```

The `latencyMs` is measured by the service but NOT included in the client response — it's internal metadata for the usage logger (F4) to consume later.

### Route Wiring

```
POST /api/chat
  → authMiddleware (F2)
  → validateChatRequest (validation middleware)
  → proxyController.chat (calls ProxyService, returns response)
```

## Edge Cases & Failure Modes

| Scenario | Decision | Rationale |
|----------|----------|-----------|
| Messages array contains 100+ messages | Accept without limit | Ollama handles context window limits; we're a transparent proxy |
| Model name contains special characters | Pass through as-is | Ollama validates model names; we don't restrict |
| Message content is empty string | Accept | Valid use case (e.g., system message placeholder) |
| Ollama returns unexpected JSON shape | Throw OllamaResponseError, return 502 | Don't pass malformed data to client |
| Concurrent requests from same user | Handle independently; no request queuing | Each request is stateless |
| Request body exceeds Express default limit | Use express.json({ limit: '1mb' }) | Reasonable limit for chat messages |
| Ollama returns 0 tokens | Accept and forward; downstream features handle gracefully | Some Ollama models don't report token counts |

## Decisions Log

| # | Decision | Alternatives Considered | Chosen Because |
|---|----------|------------------------|----------------|
| 1 | Latency measured in ProxyService, not in middleware | Middleware timer, route-level timer | Service owns the Ollama call; most accurate measurement |
| 2 | latencyMs excluded from client response | Include in response | Internal metric for logging; don't expose infrastructure details |
| 3 | 502 for Ollama errors (not 500) | 500 for all errors | 502 Bad Gateway is semantically correct — we're a proxy and the upstream failed |
| 4 | No request body transformation | Map to different format | Transparent proxy philosophy; Ollama's chat format is the API |
| 5 | Validate message roles (user/assistant/system) | Accept any string | Catches obvious errors; these are Ollama's supported roles |
| 6 | 30s timeout for Ollama requests | No timeout, 10s, 60s | LLM inference can be slow; 30s balances patience with resource protection |

## Scope Boundaries

### In Scope
- POST /api/chat route, controller, validation
- ProxyService with latency measurement
- Error mapping for Ollama failures (connection, timeout, error response)
- Unit tests for ProxyService (mocked IOllamaClient)
- Unit tests for request validation
- API tests for happy path, validation errors, auth errors, Ollama failures (Supertest)

### Out of Scope
- Usage logging after response (F4)
- Streaming responses (project-level exclusion)
- Request/response caching
- Model listing or discovery endpoints

## Dependencies

### Depends On
- F1 — IOllamaClient interface, MockOllamaClient, Express app, error classes, test infrastructure
- F2 — Auth middleware protecting the endpoint

### Depended On By
- F4 (Async Usage Logging) — integrates into the proxy flow after response
- F5 (Prompt Templates) — execute endpoint uses the same IOllamaClient
- F8 (Conversation History) — may capture conversations from proxy requests

## Architecture Notes

The ProxyService is a thin orchestration layer: validate → call Ollama → measure latency → return structured result. It does NOT log usage (that's F4's responsibility). The controller maps ProxyResult to the HTTP response shape.

The ProxyService returns `latencyMs` as part of its result so that F4 can capture it without re-measuring. This is a deliberate design choice: the service produces metadata that downstream consumers (the logger) can use.

---
_This plan is the input for the Feature Planning skill._
_Review this document, then run: "Generate task from plan: specs/plans/PLAN-F3-chat-proxy.md"_
