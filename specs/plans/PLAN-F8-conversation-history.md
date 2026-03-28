# Plan: Conversation History with Search (F8)

> **Date:** 2026-03-28
> **Project source:** specs/plans/PROJECT-ollama-usage-intelligence-api.md
> **Estimated tasks:** 5
> **Planning session:** detailed

## Summary

Store full conversation exchanges (prompt and response messages) from chat interactions, allowing users to browse, search, and review their past Ollama conversations. Conversations are saved explicitly via a separate API call (not automatically by the proxy). The feature includes keyword search across message content, filtering by model/date/user, and pagination.

## Requirements

### Functional Requirements
1. `POST /api/conversations` — Save a conversation (messages array, model, totalTokens)
2. `GET /api/conversations` — List conversations with filters: keyword search, model, dateFrom, dateTo. Paginated.
3. `GET /api/conversations/:id` — Full conversation detail with all messages in order
4. `DELETE /api/conversations/:id` — Delete a conversation and its messages
5. Conversations are scoped to the authenticated user
6. Messages are stored with their role (user/assistant/system), content, token count, and ordering index
7. Keyword search matches across message content (both user prompts and assistant responses)
8. Pagination uses offset/limit with a default page size of 20
9. Results are ordered by createdAt descending (most recent first)

### Non-Functional Requirements
1. Search should work on content up to 10,000 characters per message
2. Pagination metadata includes: total count, page, pageSize, hasMore
3. Deleting a conversation cascades to its messages

## Detailed Specifications

### Prisma Models

**Conversation:**

| Field | Type | Constraints |
|-------|------|------------|
| id | String | @id @default(uuid()) |
| userId | String | |
| model | String | |
| totalTokens | Int | |
| title | String? | optional — auto-generated from first user message (first 100 chars) |
| createdAt | DateTime | @default(now()) |

**Message:**

| Field | Type | Constraints |
|-------|------|------------|
| id | String | @id @default(uuid()) |
| conversationId | String | @relation |
| role | String | "user", "assistant", or "system" |
| content | String | |
| tokenCount | Int? | optional |
| orderIndex | Int | 0-based ordering |

**Indexes:**
- Conversation: `[userId, createdAt]` for per-user listing
- Conversation: `[model]` for model filtering
- Message: `[conversationId, orderIndex]` for ordered retrieval

**Relations:**
- Conversation has many Messages (cascade delete)

### Endpoints

**POST /api/conversations**
```json
// Request
{
  "model": "llama3",
  "messages": [
    { "role": "user", "content": "What is TypeScript?", "tokenCount": 8 },
    { "role": "assistant", "content": "TypeScript is a typed superset of JavaScript...", "tokenCount": 45 }
  ],
  "totalTokens": 53
}
// Response 201
{
  "id": "...",
  "model": "llama3",
  "title": "What is TypeScript?",
  "totalTokens": 53,
  "messageCount": 2,
  "createdAt": "..."
}
```

**GET /api/conversations?search=typescript&model=llama3&dateFrom=2026-03-01&page=1&pageSize=20**
```json
// Response 200
{
  "conversations": [
    {
      "id": "...",
      "model": "llama3",
      "title": "What is TypeScript?",
      "totalTokens": 53,
      "messageCount": 2,
      "createdAt": "..."
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "pageSize": 20,
    "hasMore": false
  }
}
```

**GET /api/conversations/:id**
```json
// Response 200
{
  "id": "...",
  "model": "llama3",
  "title": "What is TypeScript?",
  "totalTokens": 53,
  "createdAt": "...",
  "messages": [
    { "id": "...", "role": "user", "content": "What is TypeScript?", "tokenCount": 8, "orderIndex": 0 },
    { "id": "...", "role": "assistant", "content": "TypeScript is a typed superset of JavaScript...", "tokenCount": 45, "orderIndex": 1 }
  ]
}
```

### Search Logic

Keyword search uses SQL LIKE with wildcards: `WHERE content LIKE '%keyword%'`

When a search keyword is provided:
1. Find all Messages where content matches the keyword
2. Return the distinct Conversations that contain those messages
3. Apply additional filters (model, date range) on the Conversation level
4. Paginate the result

This is a two-step query: find matching message conversationIds, then load conversations.

### Title Auto-Generation

When saving a conversation:
- Find the first message with role "user"
- Take the first 100 characters of its content
- If no user message exists, use "Untitled conversation"
- If content is empty, use "Empty prompt"
- Title can be overridden by providing a `title` field in the POST request

**Validation Rules:**

| Field | Rule |
|-------|------|
| model | Required, non-empty string |
| messages | Required, non-empty array, at least 1 message |
| messages[].role | Required, one of "user", "assistant", "system" |
| messages[].content | Required, string (can be empty) |
| messages[].tokenCount | Optional, non-negative integer |
| totalTokens | Required, non-negative integer |
| search (GET) | Optional, min 2 characters if provided |
| page | Optional, positive integer, default 1 |
| pageSize | Optional, 1-100, default 20 |
| dateFrom/dateTo | Optional, valid ISO 8601 dates |

**Error Scenarios:**

| Condition | Status | Code |
|-----------|--------|------|
| Missing model or messages | 400 | VALIDATION_ERROR |
| Empty messages array | 400 | VALIDATION_ERROR |
| Invalid message role | 400 | VALIDATION_ERROR |
| Conversation not found | 404 | NOT_FOUND |
| Conversation belongs to different user | 404 | NOT_FOUND |
| Search keyword too short (< 2 chars) | 400 | VALIDATION_ERROR |
| Invalid page/pageSize | 400 | VALIDATION_ERROR |

## Edge Cases & Failure Modes

| Scenario | Decision | Rationale |
|----------|----------|-----------|
| Conversation with only system messages | Valid; title = "Untitled conversation" | System-only conversations are technically possible |
| Message content contains SQL wildcards (%, _) | Escape in LIKE query | Prevent unintended pattern matching |
| Very long message content (> 10,000 chars) | Accept without truncation | Let the DB handle storage; don't lose data |
| Search returns 0 results | Return empty array with pagination showing total: 0 | Not an error condition |
| Page number exceeds available pages | Return empty array, hasMore: false | Consistent pagination behavior |
| page=0 or pageSize=0 | Return 400 validation error | Invalid pagination params |
| Concurrent deletes while listing | Eventual consistency; list may include recently deleted items | Standard behavior for non-transactional reads |
| Messages provided out of order | Store with provided order; use array index as orderIndex | Caller controls ordering |
| Duplicate conversations (same messages) | Allow; no deduplication | Each save creates a new conversation |

## Decisions Log

| # | Decision | Alternatives Considered | Chosen Because |
|---|----------|------------------------|----------------|
| 1 | Explicit save (not automatic from proxy) | Auto-save every proxy request | Privacy-respecting; self-contained feature; no proxy modification needed; resolved from project plan open question |
| 2 | SQL LIKE for search (not full-text search) | SQLite FTS5, external search engine | Simple; adequate for workshop scale; no additional infrastructure |
| 3 | Offset/limit pagination (not cursor-based) | Cursor/keyset pagination | Simpler; consistent page numbers; workshop-scale data won't have offset performance issues |
| 4 | Auto-generated title from first user message | No title, require user-provided title | Better UX for listing; still overridable |
| 5 | Cascade delete (conversation → messages) | Soft delete, orphan messages | Clean deletion; no audit trail needed for workshop scope |
| 6 | Minimum 2-char search keyword | No minimum, 3+ chars | Prevents overly broad searches; single-char search is rarely useful |

## Scope Boundaries

### In Scope
- Conversation and Message Prisma models and migration
- IConversationRepo interface and PrismaConversationRepository
- ConversationService with search/filter/pagination logic
- All 4 endpoints (create, list, detail, delete)
- Unit tests for ConversationService (mocked repo — search query building, pagination, title generation)
- Integration tests for PrismaConversationRepository (including search, cascade delete)
- API tests for all endpoints

### Out of Scope
- Automatic saving from proxy (explicit save only)
- Conversation editing / message appending
- Conversation export
- Conversation sharing between users
- Full-text search indexing
- Conversation threading / branching

## Dependencies

### Depends On
- F1 — Express app, error classes, test infrastructure
- F2 — Auth middleware for user scoping

### Depended On By
- None (leaf feature)

## Architecture Notes

This feature follows the vertical slice pattern: `src/conversations/` contains conversationRoutes.ts, conversationService.ts, conversationRepository.ts.

The search query building logic (combining optional filters into a Prisma query) is the key piece of service-layer logic. It should handle all filter combinations: keyword only, model only, date range only, all filters combined, no filters. Each combination is a test case.

The Prisma relation between Conversation and Message should use `onDelete: Cascade` so that deleting a conversation automatically removes its messages.

---
_This plan is the input for the Feature Planning skill._
_Review this document, then run: "Generate task from plan: specs/plans/PLAN-F8-conversation-history.md"_
