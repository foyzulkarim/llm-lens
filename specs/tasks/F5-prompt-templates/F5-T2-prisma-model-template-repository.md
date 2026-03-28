# TASK: Prisma Model & TemplateRepository

> **Date:** 2026-03-28
> **Phase:** Phase 3 — Student Features
> **Epic:** F5 — Prompt Templates
> **Effort:** s
> **Priority:** medium
> **Depends on:** F1-T2-prisma-schema-seed.md, F1-T5-usage-repo-test-infra.md
> **Plan source:** specs/plans/PLAN-F5-prompt-templates.md

## Description

Add the `PromptTemplate` model to the Prisma schema and implement `ITemplateRepo` interface plus `PrismaTemplateRepository`. The repository provides CRUD operations scoped to a userId: create, findById (with ownership check), findAllByUser (with optional search), update, and delete. The interface enables dependency injection so the service layer can be tested with a mock repository.

## Test Plan

### Test File(s)
- `src/__tests__/integration/templates/templateRepository.test.ts`

### Test Scenarios

#### PrismaTemplateRepository

- **creates a template and returns it with id and timestamps** — GIVEN valid template data and a userId WHEN create is called THEN returns the saved template with a generated id, createdAt, and updatedAt
- **finds a template by id for the owning user** — GIVEN a template exists for user-A WHEN findById is called with the template id and user-A's userId THEN returns the template
- **returns null when template belongs to a different user** — GIVEN a template exists for user-A WHEN findById is called with the template id and user-B's userId THEN returns null
- **returns null when template id does not exist** — GIVEN no template with id "nonexistent" WHEN findById is called THEN returns null
- **lists all templates for a user** — GIVEN user-A has 3 templates and user-B has 1 WHEN findAllByUser is called with user-A's userId THEN returns exactly 3 templates
- **filters templates by search keyword in name or content** — GIVEN user-A has templates named "Code Review" and "Email Draft" WHEN findAllByUser is called with search "review" THEN returns only the "Code Review" template
- **updates a template's fields** — GIVEN an existing template WHEN update is called with a new name and content THEN the returned template reflects the updated values and updatedAt has changed
- **deletes a template (hard delete)** — GIVEN an existing template WHEN delete is called with its id THEN findById returns null afterwards

## Implementation Notes

- **Layer(s):** Prisma schema, interface definition, repository implementation
- **Pattern reference:** Follow the same pattern as IUsageRepo / PrismaUsageRepository from F1
- **Key decisions:**
  - Hard delete, not soft delete (per plan decision #2)
  - userId index for efficient per-user queries
  - Search uses case-insensitive `contains` on both `name` and `content` fields (Prisma `OR` + `contains` + `mode: 'insensitive'`)
  - findById enforces ownership by including userId in the where clause
- **Libraries:** @prisma/client

## Scope Boundaries

- Do NOT implement any route or service logic
- Do NOT implement template rendering (that is T1)
- Do NOT add authentication middleware — the repository receives userId as a parameter
- Integration tests require the test database infrastructure from F1-T5

## Files Expected

**New files:**
- `src/templates/ITemplateRepo.ts` — ITemplateRepo interface with TemplateData type
- `src/templates/templateRepository.ts` — PrismaTemplateRepository class
- `src/__tests__/integration/templates/templateRepository.test.ts`

**Modified files:**
- `prisma/schema.prisma` — add PromptTemplate model with userId index

**Must NOT modify:**
- Existing models in schema.prisma (only add new model)
- Any route or middleware files

## TDD Sequence

1. Add PromptTemplate model to Prisma schema and run migration
2. Write create + findById tests → implement create and findById
3. Write findAllByUser tests (with and without search) → implement findAllByUser
4. Write update and delete tests → implement update and delete
5. Define ITemplateRepo interface to match the implemented methods

---
_Generated from: specs/plans/PLAN-F5-prompt-templates.md_
_Next step: "Implement task: specs/tasks/F5-prompt-templates/F5-T2-prisma-model-template-repository.md" using the TDD skill._
