# TASK: Ollama Clients (Mock + Real)

> **Date:** 2026-03-28
> **Phase:** Phase 1 — Foundation
> **Epic:** F1 — Scaffolding & Core Interfaces
> **Effort:** m
> **Priority:** high
> **Depends on:** F1-T3-interfaces-errors-middleware.md
> **Plan source:** specs/plans/PLAN-F1-scaffolding-core-interfaces.md

## Description

Implement MockOllamaClient and RealOllamaClient — both implementing the IOllamaClient interface. The mock returns deterministic responses with configurable token counts and latency (used in all tests). The real client calls Ollama's HTTP API and maps responses to the ChatResponse interface. These clients are the core of the dependency inversion pattern: the entire app works with MockOllamaClient for testing, and swaps to RealOllamaClient in production.

## Test Plan

### Test File(s)
- `src/__tests__/unit/clients/MockOllamaClient.test.ts`
- `src/__tests__/unit/clients/RealOllamaClient.test.ts`

### Test Scenarios

#### MockOllamaClient

- **returns assistant response with model name** — GIVEN a chat request with model "llama3" WHEN chat() is called THEN response.message.role is "assistant" AND content contains "llama3"
- **calculates prompt tokens from message lengths** — GIVEN messages with total content length 100 WHEN chat() is called THEN promptTokens is approximately 25 (length / 4)
- **uses default completion tokens** — GIVEN default constructor WHEN chat() is called THEN completionTokens is 20
- **allows configurable completion tokens** — GIVEN constructor with completionTokens=50 WHEN chat() is called THEN completionTokens is 50
- **simulates latency** — GIVEN default constructor (50ms) WHEN chat() is called THEN response takes at least 50ms
- **allows configurable latency** — GIVEN constructor with latencyMs=100 WHEN chat() is called THEN response takes at least 100ms
- **calculates totalTokens** — GIVEN any request WHEN chat() is called THEN totalTokens equals promptTokens + completionTokens
- **throws error for "error-model"** — GIVEN model name "error-model" WHEN chat() is called THEN throws an Error
- **returns correct model in response** — GIVEN model "mistral" WHEN chat() is called THEN response.model is "mistral"

#### RealOllamaClient

- **sends POST to Ollama API** — GIVEN a valid request WHEN chat() is called THEN fetch is called with POST to `{baseUrl}/api/chat` with `stream: false`
- **maps Ollama response to ChatResponse** — GIVEN Ollama returns a valid response WHEN chat() is called THEN response is mapped to ChatResponse with correct fields
- **throws OllamaConnectionError on network failure** — GIVEN fetch throws a network error WHEN chat() is called THEN throws OllamaConnectionError
- **throws OllamaResponseError on non-200** — GIVEN Ollama returns 404 WHEN chat() is called THEN throws OllamaResponseError
- **throws OllamaResponseError on non-JSON response** — GIVEN Ollama returns HTML WHEN chat() is called THEN throws OllamaResponseError
- **respects timeout (30s default)** — GIVEN constructor with default timeout WHEN creating the client THEN AbortSignal timeout is set to 30000ms
- **sends messages array in request body** — GIVEN messages with multiple entries WHEN chat() is called THEN request body contains the full messages array

## Implementation Notes

- **Layer(s):** Client implementations (`src/clients/`)
- **Pattern reference:** Implements IOllamaClient from `src/interfaces/IOllamaClient.ts`
- **Key decisions:**
  - MockOllamaClient: deterministic, configurable via constructor, no I/O
  - RealOllamaClient: uses native `fetch` (Node 18+), typed errors for different failure modes
  - RealOllamaClient sends `stream: false` to get a single JSON response from Ollama
  - Timeout via AbortSignal.timeout()
- **Libraries:** No additional libraries — uses native fetch

## Scope Boundaries

- Do NOT add any routes or middleware
- Do NOT test RealOllamaClient against a live Ollama instance — mock fetch in unit tests
- MockOllamaClient is purely in-memory, no I/O
- RealOllamaClient unit tests mock the `fetch` global

## Files Expected

**New files:**
- `src/clients/MockOllamaClient.ts`
- `src/clients/RealOllamaClient.ts`
- `src/__tests__/unit/clients/MockOllamaClient.test.ts`
- `src/__tests__/unit/clients/RealOllamaClient.test.ts`

**Modified files:** None

**Must NOT modify:**
- `src/interfaces/` (already defined in T3)
- `src/app.ts` (wiring happens later)

## TDD Sequence

1. MockOllamaClient tests → implement MockOllamaClient (simpler, no mocking needed)
2. RealOllamaClient tests → implement RealOllamaClient (requires mocking fetch)

---
_Generated from: specs/plans/PLAN-F1-scaffolding-core-interfaces.md_
_Next step: "Implement task: specs/tasks/F1-scaffolding-core-interfaces/F1-T4-ollama-clients.md" using the TDD skill._
