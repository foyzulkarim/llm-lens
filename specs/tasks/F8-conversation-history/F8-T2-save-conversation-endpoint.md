# TASK: Save Conversation Endpoint with Title Auto-Generation

> **Date:** 2026-03-28
> **Phase:** Phase 3 — Student Features
> **Epic:** F8 — Conversation History & Search
> **Effort:** m
> **Priority:** medium
> **Depends on:** P3-E4-T1-conversation-models-repo.md
> **Plan source:** specs/plans/PLAN-F8-conversation-history.md

## Description

Implement the ConversationService `saveConversation` method and the `POST /api/conversations` endpoint. The service handles title auto-generation from the first user message (first 100 characters), input validation, and delegates persistence to IConversationRepo. The endpoint returns 201 with the created conversation summary. Unit tests cover the service layer with a mocked repository; API integration tests verify the full HTTP flow.

## Test Plan

### Test File(s)
- `src/__tests__/unit/conversations/conversationService.test.ts`
- `src/__tests__/api/conversations/createConversation.test.ts`

### Test Scenarios

#### ConversationService — saveConversation() — title generation (unit)

- **generates title from first user message** — GIVEN messages where the first user message content is "What is TypeScript and why should I use it?" WHEN saveConversation() is called without an explicit title THEN the title is set to "What is TypeScript and why should I use it?"
- **truncates title to 100 characters** — GIVEN a first user message with 150 characters of content WHEN saveConversation() is called without a title THEN the title is truncated to the first 100 characters
- **uses "Untitled conversation" when no user message exists** — GIVEN messages containing only system and assistant roles WHEN saveConversation() is called THEN the title is "Untitled conversation"
- **uses "Empty prompt" when first user message content is empty** — GIVEN a user message with content "" WHEN saveConversation() is called THEN the title is "Empty prompt"
- **respects explicit title override** — GIVEN an explicit title "My custom title" in the request WHEN saveConversation() is called THEN the title is "My custom title" regardless of message content

#### POST /api/conversations — validation (API)

- **returns 201 with conversation summary on valid input** — GIVEN a valid request body with model, messages, and totalTokens WHEN POST /api/conversations is called THEN 201 is returned with id, model, title, totalTokens, messageCount, and createdAt
- **returns 400 when messages array is empty** — GIVEN a request body with an empty messages array WHEN POST /api/conversations is called THEN 400 VALIDATION_ERROR is returned
- **returns 400 when message has invalid role** — GIVEN a request body with a message whose role is "unknown" WHEN POST /api/conversations is called THEN 400 VALIDATION_ERROR is returned

## Implementation Notes

- **Layer(s):** Service (`src/conversations/conversationService.ts`), Routes (`src/conversations/conversationRoutes.ts`)
- **Pattern reference:** Follows existing service/route patterns from prior features
- **Key decisions:**
  - Title auto-generation logic lives in the service layer, not the repository
  - The service calls `repo.create()` with the computed title
  - Validation rules: model required (non-empty string), messages required (non-empty array), each message must have role in ["user", "assistant", "system"] and content as string, totalTokens required (non-negative integer)
  - The endpoint response includes `messageCount` (derived from messages array length) for convenience
  - Route is mounted under `/api/conversations` and requires auth middleware
- **Libraries:** express, supertest (tests)

## Scope Boundaries

- Do NOT implement search, filtering, or pagination (that is T3)
- Do NOT implement GET or DELETE endpoints (that is T4)
- Only implement the POST endpoint and the `saveConversation` service method
- Validation covers the POST request body only

## Files Expected

**New files:**
- `src/conversations/conversationService.ts` — ConversationService class with saveConversation()
- `src/conversations/conversationRoutes.ts` — Express router with POST /api/conversations
- `src/__tests__/unit/conversations/conversationService.test.ts`
- `src/__tests__/api/conversations/createConversation.test.ts`

**Modified files:**
- `src/app.ts` — mount conversation routes

## TDD Sequence

1. Write unit tests for title generation (all 5 scenarios) -> implement saveConversation in ConversationService
2. Write API test for valid 201 response -> wire up route + controller
3. Write API tests for validation errors -> add request validation logic
4. Mount routes in app.ts

---
_Generated from: specs/plans/PLAN-F8-conversation-history.md_
_Next step: "Implement task: specs/tasks/P3-E4-T2-save-conversation-endpoint.md" using the TDD skill._
