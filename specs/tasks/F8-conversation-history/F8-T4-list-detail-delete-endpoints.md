# TASK: List, Detail & Delete Conversation Endpoints

> **Date:** 2026-03-28
> **Phase:** Phase 3 — Student Features
> **Epic:** F8 — Conversation History & Search
> **Effort:** m
> **Priority:** medium
> **Depends on:** F8-T3-search-filter-pagination.md
> **Plan source:** specs/plans/PLAN-F8-conversation-history.md

## Description

Implement the remaining three conversation endpoints: `GET /api/conversations` (list with search/filter/pagination), `GET /api/conversations/:id` (detail with messages), and `DELETE /api/conversations/:id`. Each endpoint delegates to ConversationService methods and returns appropriate HTTP responses. API integration tests verify the full HTTP flow including auth scoping, query parameter handling, and error responses.

## Test Plan

### Test File(s)
- `src/__tests__/api/conversations/listConversations.test.ts`
- `src/__tests__/api/conversations/getConversation.test.ts`
- `src/__tests__/api/conversations/deleteConversation.test.ts`

### Test Scenarios

#### GET /api/conversations — list (API)

- **returns paginated conversations with default pagination** — GIVEN 3 saved conversations for the authenticated user WHEN GET /api/conversations is called THEN 200 is returned with conversations array (3 items) and pagination { total: 3, page: 1, pageSize: 20, hasMore: false }
- **filters by keyword search across message content** — GIVEN two conversations, one containing "TypeScript" in a message WHEN GET /api/conversations?search=TypeScript is called THEN only the matching conversation is returned
- **returns 400 for search keyword shorter than 2 characters** — GIVEN no preconditions WHEN GET /api/conversations?search=a is called THEN 400 VALIDATION_ERROR is returned

#### GET /api/conversations/:id — detail (API)

- **returns conversation with messages ordered by orderIndex** — GIVEN a saved conversation with 3 messages WHEN GET /api/conversations/:id is called THEN 200 is returned with the conversation and messages array sorted by orderIndex
- **returns 404 when conversation does not exist** — GIVEN no matching conversation WHEN GET /api/conversations/nonexistent-id is called THEN 404 NOT_FOUND is returned
- **returns 404 when conversation belongs to different user** — GIVEN a conversation owned by userA WHEN userB calls GET /api/conversations/:id THEN 404 NOT_FOUND is returned

#### DELETE /api/conversations/:id — delete (API)

- **returns 204 after successful deletion** — GIVEN a saved conversation WHEN DELETE /api/conversations/:id is called by the owning user THEN 204 No Content is returned and the conversation no longer exists
- **returns 404 when conversation does not exist** — GIVEN no matching conversation WHEN DELETE /api/conversations/nonexistent-id is called THEN 404 NOT_FOUND is returned

## Implementation Notes

- **Layer(s):** Routes (`src/conversations/conversationRoutes.ts`), Service (`src/conversations/conversationService.ts`)
- **Pattern reference:** Follows existing route/controller patterns from prior features
- **Key decisions:**
  - `GET /api/conversations` accepts query params: search, model, dateFrom, dateTo, page, pageSize
  - Query params are parsed and validated at the route/controller level before calling the service
  - `GET /api/conversations/:id` calls service.getConversation(id, userId); service calls repo.findById and throws NOT_FOUND if null
  - `DELETE /api/conversations/:id` calls service.deleteConversation(id, userId); service verifies ownership via findById before calling repo.delete; throws NOT_FOUND if not found or wrong user
  - DELETE returns 204 with no body on success
  - All endpoints require auth middleware; userId is extracted from the authenticated request
  - Conversation detail response shape matches the plan spec: id, model, title, totalTokens, createdAt, messages[]
  - List response shape: { conversations: [...], pagination: { total, page, pageSize, hasMore } }
- **Libraries:** express, supertest (tests)

## Scope Boundaries

- Do NOT modify the repository layer (that is T1)
- Do NOT modify title generation or save logic (that is T2)
- Do NOT modify search/filter/pagination service logic (that is T3)
- Only add the three endpoint handlers and any thin service methods (getConversation, deleteConversation) needed to support them

## Files Expected

**New files:**
- `src/__tests__/api/conversations/listConversations.test.ts`
- `src/__tests__/api/conversations/getConversation.test.ts`
- `src/__tests__/api/conversations/deleteConversation.test.ts`

**Modified files:**
- `src/conversations/conversationRoutes.ts` — add GET / , GET /:id, DELETE /:id route handlers
- `src/conversations/conversationService.ts` — add getConversation() and deleteConversation() methods

## TDD Sequence

1. Write GET /:id API test (happy path + 404) -> implement getConversation service method + route handler
2. Write DELETE /:id API test (204 + 404) -> implement deleteConversation service method + route handler
3. Write GET / API tests (list + search filter + validation) -> implement list route handler with query param parsing
4. Write ownership test (404 for wrong user) -> verify auth scoping is correct

---
_Generated from: specs/plans/PLAN-F8-conversation-history.md_
_Next step: "Implement task: specs/tasks/F8-conversation-history/F8-T4-list-detail-delete-endpoints.md" using the TDD skill._
