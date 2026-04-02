# TASK: Prisma Conversation + Message Models & ConversationRepository

> **Date:** 2026-03-28
> **Phase:** Phase 3 — Student Features
> **Epic:** F8 — Conversation History & Search
> **Effort:** m
> **Priority:** medium
> **Depends on:** F1-T1-project-scaffolding.md, F1-T2-prisma-schema-seed.md, F1-T5-usage-repo-test-infra.md
> **Plan source:** specs/plans/PLAN-F8-conversation-history.md

## Description

Add the Conversation and Message Prisma models to the schema, run the migration, and implement the IConversationRepo interface with a PrismaConversationRepository. The repository provides `create`, `findById`, `findMany` (with filters/pagination), `delete`, and `countMatching` operations. The Conversation-to-Message relation uses cascade delete. Integration tests run against a real test database using the testDb helper from F1-T5.

## Test Plan

### Test File(s)

- `src/__tests__/integration/conversations/conversationRepository.test.ts`

### Test Scenarios

#### PrismaConversationRepository — create()

- **creates a conversation with messages** — GIVEN a valid userId, model, totalTokens, title, and messages array WHEN create() is called THEN a Conversation row exists with correct fields AND associated Message rows exist with correct role, content, tokenCount, and orderIndex values
- **assigns orderIndex from array position** — GIVEN a messages array with 3 entries WHEN create() is called THEN messages are stored with orderIndex 0, 1, 2 matching their array positions
- **cascades delete to messages** — GIVEN a conversation with 2 messages WHEN delete(conversationId) is called THEN the Conversation row and both Message rows are removed from the database

#### PrismaConversationRepository — findById()

- **returns conversation with messages ordered by orderIndex** — GIVEN a stored conversation with 3 messages WHEN findById(id, userId) is called THEN the conversation is returned with messages sorted by orderIndex ascending
- **returns null when conversation belongs to different user** — GIVEN a conversation owned by userA WHEN findById(id, userB) is called THEN null is returned
- **returns null when conversation does not exist** — GIVEN no matching conversation in the database WHEN findById("nonexistent-id", userId) is called THEN null is returned

#### PrismaConversationRepository — findMany() with filters

- **filters by model** — GIVEN conversations with models "llama3" and "mistral" WHEN findMany is called with model="llama3" THEN only the llama3 conversation is returned
- **filters by date range** — GIVEN conversations created on different dates WHEN findMany is called with dateFrom and dateTo THEN only conversations within the range are returned

## Implementation Notes

- **Layer(s):** Prisma schema (`prisma/schema.prisma`), Interface (`src/interfaces/`), Repository (`src/conversations/`)
- **Pattern reference:** Follows PrismaUsageRepository and PrismaApiKeyRepository patterns (same testDb helper)
- **Key decisions:**
  - IConversationRepo is the interface; PrismaConversationRepository is the concrete implementation
  - `create` accepts a DTO with messages array; the repo wraps it in a Prisma `createMany` nested write
  - `findMany` accepts an options object: `{ userId, search?, model?, dateFrom?, dateTo?, page?, pageSize? }`
  - `findMany` returns `{ conversations: Conversation[], total: number }` for pagination metadata
  - Search by keyword is implemented as a SQL LIKE query against Message content; the repo finds matching conversationIds first, then loads conversations
  - SQL wildcards (`%`, `_`) in search terms must be escaped before building the LIKE pattern
  - `onDelete: Cascade` on the Message relation ensures cascade delete
- **Indexes:**
  - Conversation: `[userId, createdAt]` for per-user listing
  - Conversation: `[model]` for model filtering
  - Message: `[conversationId, orderIndex]` for ordered retrieval
- **Libraries:** @prisma/client

## Scope Boundaries

- Do NOT implement ConversationService (that is T2/T3)
- Do NOT implement any routes or endpoints (that is T2/T4)
- Do NOT implement title auto-generation logic (that is T2, service-layer concern)
- The repository is a pure data-access layer; all business logic lives in the service

## Files Expected

**New files:**

- `src/interfaces/IConversationRepo.ts` — IConversationRepo interface definition
- `src/conversations/conversationRepository.ts` — PrismaConversationRepository implementing IConversationRepo
- `src/__tests__/integration/conversations/conversationRepository.test.ts`

**Modified files:**

- `prisma/schema.prisma` — add Conversation and Message models with indexes and relations
- `src/interfaces/index.ts` — add IConversationRepo to barrel export

## TDD Sequence

1. Add Conversation and Message models to Prisma schema, run migration
2. Create IConversationRepo interface (type-only, no tests needed)
3. Write create integration test -> implement create in PrismaConversationRepository
4. Write findById integration tests -> implement findById
5. Write cascade delete test -> implement delete
6. Write findMany with filter tests -> implement findMany with filter/search/pagination support
7. Add IConversationRepo to barrel export

---

_Generated from: specs/plans/PLAN-F8-conversation-history.md_
_Next step: "Implement task: specs/tasks/F8-conversation-history/F8-T1-conversation-models-repo.md" using the TDD skill._
