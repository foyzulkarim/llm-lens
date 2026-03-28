# TASK: Template Execute Endpoint (Render + Call IOllamaClient)

> **Date:** 2026-03-28
> **Phase:** Phase 3 — Student Features
> **Epic:** F5 — Prompt Templates
> **Effort:** s
> **Priority:** medium
> **Depends on:** P3-E1-T3-template-crud-endpoints.md, P1-E1-T4-ollama-clients.md
> **Plan source:** specs/plans/PLAN-F5-prompt-templates.md

## Description

Implement `POST /api/templates/:id/execute` — the endpoint that combines template rendering with Ollama inference. The flow is: fetch the template (must belong to the authenticated user), extract variables, validate that all required variables are provided, render the template via `renderTemplate`, resolve the model (from request body or template's `modelHint`), call `IOllamaClient.chat()` with the rendered content as a single user message, and return the response in the same shape as the `/api/chat` proxy endpoint. The `TemplateService.execute` method orchestrates this, depending on both `ITemplateRepo` and `IOllamaClient` via constructor injection.

## Test Plan

### Test File(s)
- `src/__tests__/unit/templates/templateService.execute.test.ts`
- `src/__tests__/api/templates/templateExecute.test.ts`

### Test Scenarios

#### TemplateService.execute (unit tests with mocked ITemplateRepo and IOllamaClient)

- **renders template and calls IOllamaClient.chat with rendered content** — GIVEN a template `"Review {{language}} code: {{code}}"` and variables `{ language: "TS", code: "const x=1" }` WHEN execute is called with model "codellama" THEN IOllamaClient.chat is called with `messages: [{ role: "user", content: "Review TS code: const x=1" }]` and model "codellama"
- **falls back to modelHint when no model in request** — GIVEN a template with modelHint "llama3" and no model in the request WHEN execute is called THEN IOllamaClient.chat is called with model "llama3"
- **throws ValidationError when no model and no modelHint** — GIVEN a template with no modelHint and no model in the request WHEN execute is called THEN throws ValidationError with message indicating model is required
- **throws ValidationError when required variables are missing** — GIVEN a template with `{{name}}` and variables `{}` WHEN execute is called THEN throws ValidationError indicating "name" is missing (via renderTemplate)
- **throws NotFoundError when template does not exist** — GIVEN repo.findById returns null WHEN execute is called THEN throws NotFoundError
- **executes template with zero variables (static prompt)** — GIVEN a template `"List prime numbers"` with no variables WHEN execute is called with model "llama3" and variables `{}` THEN IOllamaClient.chat is called with the static content

#### Template Execute API (integration/API tests)

- **POST /api/templates/:id/execute returns Ollama response** — GIVEN an existing template and valid variables WHEN POST /api/templates/:id/execute THEN responds 200 with `{ message, model, usage }` matching the chat response shape
- **POST /api/templates/:id/execute returns 400 for missing variables** — GIVEN a template with `{{name}}` WHEN POST with `{ variables: {} }` THEN responds 400 with code MISSING_VARIABLES
- **POST /api/templates/:id/execute returns 404 for non-existent template** — GIVEN a non-existent template id WHEN POST execute THEN responds 404

## Implementation Notes

- **Layer(s):** Service method (execute), route handler, IOllamaClient integration
- **Pattern reference:** Execute flow mirrors the 7-step sequence from the plan's "Execute flow" section
- **Key decisions:**
  - Model resolution order: request body `model` > template `modelHint` > 400 error
  - Response shape matches `/api/chat` exactly for consistency (per plan decision #5)
  - The rendered content is sent as a single message with role "user"
  - Ollama errors during execution map to 502 OLLAMA_ERROR via the existing error handler
  - Error code for missing variables is MISSING_VARIABLES (distinct from generic VALIDATION_ERROR)
- **Libraries:** Uses existing IOllamaClient interface from F1

## Scope Boundaries

- Do NOT modify the CRUD endpoints (already done in T3)
- Do NOT modify the rendering functions (already done in T1)
- Do NOT add streaming support — simple request/response only
- Do NOT log template execution usage (out of scope per plan)

## Files Expected

**New files:**
- `src/__tests__/unit/templates/templateService.execute.test.ts`
- `src/__tests__/api/templates/templateExecute.test.ts`

**Modified files:**
- `src/templates/templateService.ts` — add execute method
- `src/templates/templateRoutes.ts` — add POST /:id/execute route

**Must NOT modify:**
- `prisma/schema.prisma`
- `src/templates/templateRendering.ts`
- `src/templates/ITemplateRepo.ts`

## TDD Sequence

1. Write TemplateService.execute unit tests (happy path, model fallback, no model error) → implement execute method
2. Write TemplateService.execute unit tests (missing variables, not found, static prompt) → handle edge cases
3. Write API tests for POST /api/templates/:id/execute → implement route handler and wire up
4. Verify Ollama error propagation maps to 502 via existing error handler

---
_Generated from: specs/plans/PLAN-F5-prompt-templates.md_
_Next step: "Implement task: specs/tasks/P3-E1-T4-template-execute-endpoint.md" using the TDD skill._
