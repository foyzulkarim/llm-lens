# TASK: Template CRUD Endpoints (POST, GET list, GET detail, PUT, DELETE)

> **Date:** 2026-03-28
> **Phase:** Phase 3 — Student Features
> **Epic:** F5 — Prompt Templates
> **Effort:** m
> **Priority:** medium
> **Depends on:** F5-T1-template-rendering-pure-functions.md, F5-T2-prisma-model-template-repository.md
> **Plan source:** specs/plans/PLAN-F5-prompt-templates.md

## Description

Implement the five CRUD endpoints for prompt templates: `POST /api/templates`, `GET /api/templates`, `GET /api/templates/:id`, `PUT /api/templates/:id`, and `DELETE /api/templates/:id`. Build a `TemplateService` class that depends on `ITemplateRepo` for persistence and uses `extractVariables` to enrich responses with variable lists. Wire up `templateRoutes.ts` with input validation. All endpoints are scoped to the authenticated user via auth middleware.

## Test Plan

### Test File(s)
- `src/__tests__/unit/templates/templateService.test.ts`
- `src/__tests__/api/templates/templateCrud.test.ts`

### Test Scenarios

#### TemplateService (unit tests with mocked ITemplateRepo)

- **create returns template with extracted variables** — GIVEN valid input with content `"Hello {{name}}"` WHEN service.create is called THEN it delegates to repo.create and returns the result enriched with `variables: ["name"]`
- **getById returns template with variables** — GIVEN repo.findById returns a template WHEN service.getById is called THEN returns the template enriched with extracted variables
- **getById throws NotFoundError when repo returns null** — GIVEN repo.findById returns null WHEN service.getById is called THEN throws NotFoundError

#### Template CRUD API (integration/API tests)

- **POST /api/templates creates a template** — GIVEN valid auth and body `{ name: "Greeting", content: "Hello {{name}}" }` WHEN POST /api/templates THEN responds 201 with the template including `variables: ["name"]`
- **POST /api/templates returns 400 for missing name** — GIVEN valid auth and body `{ content: "Hello" }` WHEN POST /api/templates THEN responds 400 with code VALIDATION_ERROR
- **POST /api/templates returns 400 for content exceeding 10000 chars** — GIVEN valid auth and body with content of 10001 characters WHEN POST /api/templates THEN responds 400 with code VALIDATION_ERROR
- **GET /api/templates returns user's templates** — GIVEN the authenticated user has 2 templates WHEN GET /api/templates THEN responds 200 with `{ templates: [...] }` containing 2 items
- **GET /api/templates?search=keyword filters results** — GIVEN the user has templates "Code Review" and "Email Draft" WHEN GET /api/templates?search=code THEN responds 200 with only the matching template
- **GET /api/templates/:id returns 404 for another user's template** — GIVEN a template owned by user-A WHEN user-B requests GET /api/templates/:id THEN responds 404 (does not leak existence)
- **PUT /api/templates/:id updates and returns updated template** — GIVEN an existing template WHEN PUT with `{ name: "Updated Name" }` THEN responds 200 with the updated name and recalculated variables
- **DELETE /api/templates/:id removes the template** — GIVEN an existing template WHEN DELETE /api/templates/:id THEN responds 204 and subsequent GET returns 404

## Implementation Notes

- **Layer(s):** Service, routes, validation
- **Pattern reference:** Follow the vertical slice pattern — all template files live under `src/templates/`
- **Key decisions:**
  - Response shape for list: `{ templates: [...] }` (array wrapper for extensibility)
  - Response shape for detail/create/update includes `variables` array extracted from content
  - Validation on the route layer before calling service (name required + max 200, content required + max 10000, description optional + max 500, modelHint optional + non-empty if provided)
  - DELETE returns 204 No Content
  - Auth middleware provides `req.user.id` as userId
- **Libraries:** express, existing auth middleware from F2

## Scope Boundaries

- Do NOT implement the execute endpoint (that is T4)
- Do NOT call IOllamaClient from this task
- Do NOT implement authentication — depend on existing auth middleware from F2
- Validation logic should be inline or in a small helper, not a separate validation library

## Files Expected

**New files:**
- `src/templates/templateService.ts` — TemplateService class
- `src/templates/templateRoutes.ts` — Express router with 5 CRUD routes
- `src/__tests__/unit/templates/templateService.test.ts`
- `src/__tests__/api/templates/templateCrud.test.ts`

**Modified files:**
- `src/app.ts` — register template routes under `/api/templates`

**Must NOT modify:**
- `prisma/schema.prisma` (already done in T2)
- Template rendering functions (already done in T1)

## TDD Sequence

1. Write TemplateService unit tests (create, getById, list) → implement TemplateService methods
2. Write TemplateService unit tests (update, delete) → implement remaining methods
3. Write API tests for POST and GET endpoints → implement routes + validation + wire to service
4. Write API tests for PUT and DELETE → implement remaining routes
5. Register routes in app.ts

---
_Generated from: specs/plans/PLAN-F5-prompt-templates.md_
_Next step: "Implement task: specs/tasks/F5-prompt-templates/F5-T3-template-crud-endpoints.md" using the TDD skill._
