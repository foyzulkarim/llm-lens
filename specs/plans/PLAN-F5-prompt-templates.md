# Plan: Prompt Templates with Variable Substitution (F5)

> **Date:** 2026-03-28
> **Project source:** specs/plans/PROJECT-ollama-usage-intelligence-api.md
> **Estimated tasks:** 5
> **Planning session:** detailed

## Summary

Users save reusable prompt templates with `{{variable}}` placeholders, then execute them by providing variable values. The system renders the final prompt and sends it through IOllamaClient to Ollama. This feature includes full CRUD for templates plus a render/execute flow. The template rendering logic is a pure function — TDD-ideal.

## Requirements

### Functional Requirements

1. `POST /api/templates` — Create a new template with name, content (containing `{{variables}}`), optional description, optional modelHint
2. `GET /api/templates` — List user's templates; optional search by name or content keyword
3. `GET /api/templates/:id` — Get template detail including extracted variable names
4. `PUT /api/templates/:id` — Update a template (any field)
5. `DELETE /api/templates/:id` — Soft delete (or hard delete) a template
6. `POST /api/templates/:id/execute` — Provide variable values, render the template, send to Ollama, return the response
7. Templates are scoped to the authenticated user (users only see their own templates)
8. Variable extraction: parse `{{variableName}}` from template content and return the list of unique variable names
9. Variable substitution: replace all `{{variableName}}` occurrences with provided values
10. Execute endpoint validates that all required variables are provided before sending to Ollama

### Non-Functional Requirements

1. Template rendering is a pure function with no side effects (testable without mocks)
2. Variable names are case-sensitive
3. Maximum template content length: 10,000 characters

## Detailed Specifications

### Prisma Model: PromptTemplate

| Field       | Type     | Constraints                              |
| ----------- | -------- | ---------------------------------------- |
| id          | String   | @id @default(uuid())                     |
| name        | String   |                                          |
| content     | String   |                                          |
| description | String?  | optional                                 |
| modelHint   | String?  | optional — suggested model for execution |
| userId      | String   |                                          |
| createdAt   | DateTime | @default(now())                          |
| updatedAt   | DateTime | @updatedAt                               |

**Index:** `[userId]` for per-user queries.

### Template Rendering (Pure Function)

**extractVariables(content: string): string[]**

- Regex: `/\{\{(\w+)\}\}/g`
- Returns unique variable names in order of first appearance
- `"Hello {{name}}, welcome to {{city}}"` → `["name", "city"]`

**renderTemplate(content: string, variables: Record<string, string>): string**

- Replaces all `{{variableName}}` with the corresponding value
- Throws `ValidationError` if a required variable is missing from the provided values
- Extra variables (provided but not in template) are silently ignored
- Empty string is a valid variable value

### Endpoints

**POST /api/templates**

```json
// Request
{ "name": "Code Review", "content": "Review this {{language}} code:\n{{code}}", "description": "Code review prompt", "modelHint": "codellama" }
// Response 201
{ "id": "...", "name": "Code Review", "content": "...", "description": "...", "modelHint": "codellama", "variables": ["language", "code"], "createdAt": "..." }
```

**GET /api/templates?search=review**

```json
// Response 200
{
  "templates": [
    {
      "id": "...",
      "name": "Code Review",
      "description": "...",
      "modelHint": "codellama",
      "variables": ["language", "code"],
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

**GET /api/templates/:id**

```json
// Response 200
{
  "id": "...",
  "name": "Code Review",
  "content": "Review this {{language}} code:\n{{code}}",
  "description": "...",
  "modelHint": "codellama",
  "variables": ["language", "code"],
  "createdAt": "...",
  "updatedAt": "..."
}
```

**POST /api/templates/:id/execute**

```json
// Request
{ "variables": { "language": "TypeScript", "code": "const x = 1;" }, "model": "codellama" }
// Response 200 (same shape as /api/chat response)
{ "message": { "role": "assistant", "content": "..." }, "model": "codellama", "usage": { "promptTokens": 25, "completionTokens": 80, "totalTokens": 105 } }
```

**Execute flow:**

1. Fetch template by ID (must belong to authenticated user)
2. Extract variables from template content
3. Validate all required variables are provided
4. Render template with provided values
5. Use `model` from request body, or fall back to `modelHint`, or return 400 if neither
6. Call IOllamaClient.chat() with rendered content as a single user message
7. Return Ollama response in the standard proxy response format

**Validation Rules:**

| Field               | Rule                                                           |
| ------------------- | -------------------------------------------------------------- |
| name                | Required, non-empty, max 200 chars                             |
| content             | Required, non-empty, max 10,000 chars                          |
| description         | Optional, max 500 chars                                        |
| modelHint           | Optional, non-empty if provided                                |
| variables (execute) | All template variables must be present; values must be strings |
| model (execute)     | Required if no modelHint on template                           |

**Error Scenarios:**

| Condition                             | Status | Code                             |
| ------------------------------------- | ------ | -------------------------------- |
| Missing name or content               | 400    | VALIDATION_ERROR                 |
| Template not found                    | 404    | NOT_FOUND                        |
| Template belongs to different user    | 404    | NOT_FOUND (don't leak existence) |
| Missing required variables in execute | 400    | MISSING_VARIABLES                |
| No model specified and no modelHint   | 400    | VALIDATION_ERROR                 |
| Ollama error during execute           | 502    | OLLAMA_ERROR                     |

## Edge Cases & Failure Modes

| Scenario                                   | Decision                                                | Rationale                                                    |
| ------------------------------------------ | ------------------------------------------------------- | ------------------------------------------------------------ |
| Template content has no variables          | Valid template; execute requires empty variables object | Static prompts are a valid use case                          |
| Variable value contains `{{other}}` syntax | Substitute literally, no recursive rendering            | Prevents injection; single-pass replacement                  |
| Nested braces `{{{name}}}`                 | Outer pair is literal braces around the variable value  | Regex matches innermost `{{name}}`; outer braces are literal |
| Template content is just `{{var}}`         | Valid; entire content becomes the variable value        | Edge case but functional                                     |
| Same variable used multiple times          | All occurrences replaced                                | Standard template behavior                                   |
| Search query matches no templates          | Return empty array, not 404                             | Empty results are valid                                      |
| User has 0 templates                       | Return empty array                                      | Valid state                                                  |
| Execute on a template with 0 variables     | Send content as-is to Ollama                            | Static prompt execution                                      |

## Decisions Log

| #   | Decision                                             | Alternatives Considered                 | Chosen Because                                                                                       |
| --- | ---------------------------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 1   | Execute endpoint depends directly on IOllamaClient   | Call proxy endpoint internally via HTTP | Simpler; avoids HTTP self-call; consistent with DI pattern; resolved from project plan open question |
| 2   | Hard delete (not soft delete)                        | Soft delete with isDeleted flag         | Workshop scope; simpler; no need for template recovery                                               |
| 3   | Single-pass variable substitution                    | Recursive/multi-pass                    | Prevents injection attacks; simpler; predictable behavior                                            |
| 4   | Variables are `\w+` only (alphanumeric + underscore) | Allow any characters between braces     | Prevents ambiguity; clean variable names                                                             |
| 5   | Execute returns same shape as /api/chat              | Custom response format                  | Consistency across proxy and template execution                                                      |

## Scope Boundaries

### In Scope

- PromptTemplate Prisma model and migration
- ITemplateRepo interface and PrismaTemplateRepository
- TemplateService with rendering logic
- All 6 endpoints (CRUD + execute)
- Pure function unit tests for extractVariables and renderTemplate
- Unit tests for TemplateService (mocked repo and IOllamaClient)
- Integration tests for PrismaTemplateRepository
- API tests for all endpoints

### Out of Scope

- Template sharing between users
- Template versioning
- Template categories or tags
- Batch execution of templates
- Usage logging for template executions (could be added but not required)

## Dependencies

### Depends On

- F1 — IOllamaClient interface, Express app, error classes, test infrastructure
- F2 — Auth middleware for user scoping

### Depended On By

- None (leaf feature)

## Architecture Notes

This feature follows the vertical slice pattern: `src/templates/` contains templateRoutes.ts, templateService.ts, templateRepository.ts, and the rendering pure functions. The TemplateService depends on ITemplateRepo (for CRUD) and IOllamaClient (for execute). Both are injected via constructor.

The rendering functions (extractVariables, renderTemplate) should be standalone exported functions — not methods on the service — so they can be tested in complete isolation as pure functions.

---

_This plan is the input for the Feature Planning skill._
_Review this document, then run: "Generate task from plan: specs/plans/PLAN-F5-prompt-templates.md"_
