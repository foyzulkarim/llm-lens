# TASK: Template Rendering Pure Functions (extractVariables, renderTemplate)

> **Date:** 2026-03-28
> **Phase:** Phase 3 — Student Features
> **Epic:** F5 — Prompt Templates
> **Effort:** xs
> **Priority:** medium
> **Depends on:** F1-T3-interfaces-errors-middleware.md
> **Plan source:** specs/plans/PLAN-F5-prompt-templates.md

## Description

Implement two pure functions for template variable extraction and rendering. `extractVariables(content)` parses `{{variableName}}` placeholders from template content and returns unique variable names in order of first appearance. `renderTemplate(content, variables)` performs single-pass substitution of all placeholders with provided values, throwing a `ValidationError` when a required variable is missing. These functions have zero dependencies beyond the existing `ValidationError` class — they are the ideal TDD starting point for the entire feature.

## Test Plan

### Test File(s)
- `src/__tests__/unit/templates/templateRendering.test.ts`

### Test Scenarios

#### extractVariables

- **extracts variables from template content** — GIVEN content `"Hello {{name}}, welcome to {{city}}"` WHEN extractVariables is called THEN returns `["name", "city"]`
- **returns unique variables in first-appearance order** — GIVEN content `"{{name}} and {{city}} and {{name}} again"` WHEN extractVariables is called THEN returns `["name", "city"]` (no duplicates)
- **returns empty array for content with no variables** — GIVEN content `"Hello world, no placeholders here"` WHEN extractVariables is called THEN returns `[]`
- **handles content that is entirely a single variable** — GIVEN content `"{{var}}"` WHEN extractVariables is called THEN returns `["var"]`
- **only matches word characters in variable names** — GIVEN content `"{{valid_name1}} and {{invalid-name}} and {{also invalid}}"` WHEN extractVariables is called THEN returns `["valid_name1"]` only

#### renderTemplate

- **replaces all variables with provided values** — GIVEN content `"Hello {{name}}, welcome to {{city}}"` and variables `{ name: "Alice", city: "Paris" }` WHEN renderTemplate is called THEN returns `"Hello Alice, welcome to Paris"`
- **throws ValidationError for missing required variable** — GIVEN content `"{{name}} in {{city}}"` and variables `{ name: "Alice" }` WHEN renderTemplate is called THEN throws ValidationError with message indicating "city" is missing
- **accepts empty string as a valid variable value** — GIVEN content `"Hello {{name}}"` and variables `{ name: "" }` WHEN renderTemplate is called THEN returns `"Hello "`
- **ignores extra variables not present in template** — GIVEN content `"Hello {{name}}"` and variables `{ name: "Alice", unused: "ignored" }` WHEN renderTemplate is called THEN returns `"Hello Alice"` without error
- **replaces all occurrences of the same variable** — GIVEN content `"{{x}} and {{x}} and {{x}}"` and variables `{ x: "hi" }` WHEN renderTemplate is called THEN returns `"hi and hi and hi"`
- **does not perform recursive substitution** — GIVEN content `"Hello {{name}}"` and variables `{ name: "{{city}}" }` WHEN renderTemplate is called THEN returns `"Hello {{city}}"` literally (no further expansion)
- **handles content with no variables** — GIVEN content `"Static prompt"` and variables `{}` WHEN renderTemplate is called THEN returns `"Static prompt"`
- **handles triple braces by matching innermost** — GIVEN content `"{{{name}}}"` and variables `{ name: "Alice" }` WHEN renderTemplate is called THEN returns `"{Alice}"` (outer braces are literal)

## Implementation Notes

- **Layer(s):** Pure utility functions — no service, no repository, no Express
- **Pattern reference:** None (greenfield)
- **Key decisions:**
  - Regex for extraction: `/\{\{(\w+)\}\}/g`
  - Single-pass replacement prevents injection via variable values containing `{{...}}`
  - Variable names are case-sensitive
  - Functions are standalone exports, not class methods, enabling import without instantiation
- **Libraries:** None (pure TypeScript)

## Scope Boundaries

- Do NOT create any service class, repository, or route
- Do NOT interact with Prisma or Express
- Do NOT handle template CRUD — only rendering logic
- These functions must remain pure (no side effects, no I/O)

## Files Expected

**New files:**
- `src/templates/templateRendering.ts` — extractVariables, renderTemplate
- `src/__tests__/unit/templates/templateRendering.test.ts`

**Modified files:**
- None

**Must NOT modify:**
- `prisma/` directory
- Any existing route or middleware files

## TDD Sequence

1. Write extractVariables tests (basic, duplicates, empty, edge cases) → implement extractVariables
2. Write renderTemplate tests (happy path, missing var, empty string, extras, no recursion) → implement renderTemplate

---
_Generated from: specs/plans/PLAN-F5-prompt-templates.md_
_Next step: "Implement task: specs/tasks/F5-prompt-templates/F5-T1-template-rendering-pure-functions.md" using the TDD skill._
