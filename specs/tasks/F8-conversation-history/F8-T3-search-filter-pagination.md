# TASK: Conversation Search, Filter & Pagination Service Logic

> **Date:** 2026-03-28
> **Phase:** Phase 3 — Student Features
> **Epic:** F8 — Conversation History & Search
> **Effort:** m
> **Priority:** medium
> **Depends on:** F8-T1-conversation-models-repo.md, F8-T2-save-conversation-endpoint.md
> **Plan source:** specs/plans/PLAN-F8-conversation-history.md

## Description

Implement the ConversationService `listConversations` method that builds search/filter/pagination queries and delegates to IConversationRepo. The service handles keyword search across message content, optional model and date range filters, and offset/limit pagination with metadata (total, page, pageSize, hasMore). Unit tests use a mocked repository to verify correct query construction and pagination math.

## Test Plan

### Test File(s)
- `src/__tests__/unit/conversations/conversationService.list.test.ts`

### Test Scenarios

#### ConversationService — listConversations() — search and filters (unit)

- **passes keyword search to repository** — GIVEN search="typescript" WHEN listConversations() is called THEN the repo's findMany receives search="typescript" in its options
- **combines keyword search with model filter** — GIVEN search="typescript" and model="llama3" WHEN listConversations() is called THEN the repo's findMany receives both search and model in its options
- **passes date range filter to repository** — GIVEN dateFrom="2026-03-01" and dateTo="2026-03-28" WHEN listConversations() is called THEN the repo's findMany receives parsed Date objects for dateFrom and dateTo

#### ConversationService — listConversations() — pagination (unit)

- **defaults to page=1 and pageSize=20** — GIVEN no pagination params WHEN listConversations() is called THEN the repo's findMany is called with page=1, pageSize=20
- **computes hasMore=true when more results exist** — GIVEN repo returns total=25 and page=1, pageSize=20 WHEN listConversations() returns THEN pagination.hasMore is true
- **computes hasMore=false on last page** — GIVEN repo returns total=25 and page=2, pageSize=20 WHEN listConversations() returns THEN pagination.hasMore is false
- **returns empty array when page exceeds total** — GIVEN repo returns total=5 and page=2, pageSize=20 WHEN listConversations() returns THEN conversations is an empty array and hasMore is false
- **rejects search keyword shorter than 2 characters** — GIVEN search="a" (1 character) WHEN listConversations() is called THEN a validation error is thrown with code VALIDATION_ERROR

## Implementation Notes

- **Layer(s):** Service (`src/conversations/conversationService.ts`)
- **Pattern reference:** Pagination metadata shape: `{ total, page, pageSize, hasMore }`
- **Key decisions:**
  - hasMore is computed as `page * pageSize < total`
  - Offset is calculated as `(page - 1) * pageSize`
  - The service parses dateFrom/dateTo strings into Date objects before passing to the repo
  - Search keyword minimum length (2 chars) is enforced at the service level
  - Invalid pagination params (page < 1, pageSize < 1 or > 100) throw VALIDATION_ERROR
  - Results are always ordered by createdAt descending (enforced by the repo, specified by the service)
  - The service does not escape SQL wildcards — that responsibility is in the repo layer (T1)
- **Libraries:** None beyond existing project dependencies

## Scope Boundaries

- Do NOT implement the GET endpoints (that is T4)
- Do NOT implement the repository search logic (that is T1)
- Only implement the service-layer `listConversations` method
- All tests mock the repository; no database interaction in this task

## Files Expected

**New files:**
- `src/__tests__/unit/conversations/conversationService.list.test.ts`

**Modified files:**
- `src/conversations/conversationService.ts` — add listConversations() method

## TDD Sequence

1. Write test for keyword search pass-through -> implement basic listConversations with search forwarding
2. Write test for combined filters -> extend to handle model + date range options
3. Write test for default pagination -> implement pagination defaults
4. Write tests for hasMore computation (true/false/exceeds) -> implement pagination metadata calculation
5. Write test for short keyword rejection -> add validation guard

---
_Generated from: specs/plans/PLAN-F8-conversation-history.md_
_Next step: "Implement task: specs/tasks/F8-conversation-history/F8-T3-search-filter-pagination.md" using the TDD skill._
