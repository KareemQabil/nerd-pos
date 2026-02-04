# Findings & Decisions
<!-- 
  WHAT: Your knowledge base for the task. Stores everything you discover and decide.
  WHY: Context windows are limited. This file is your "external memory" - persistent and unlimited.
  WHEN: Update after ANY discovery, especially after 2 view/browser/search operations (2-Action Rule).
-->

## Requirements
<!-- 
  WHAT: What the user asked for, broken down into specific requirements.
  WHY: Keeps requirements visible so you don't forget what you're building.
  WHEN: Fill this in during Phase 1 (Requirements & Discovery).
  EXAMPLE:
    - Command-line interface
    - Add tasks
    - List all tasks
    - Delete tasks
    - Python implementation
-->
<!-- Captured from user request -->
- Refactor Swagger API response examples to be clearer, using DTO-based schemas instead of inline examples.
- Ensure API responses follow the generic `{ result, error }` format.
- Unify Swagger configuration and response documentation across the system (start with customer controller).

## Research Findings
<!-- 
  WHAT: Key discoveries from web searches, documentation reading, or exploration.
  WHY: Multimodal content (images, browser results) doesn't persist. Write it down immediately.
  WHEN: After EVERY 2 view/browser/search operations, update this section (2-Action Rule).
  EXAMPLE:
    - Python's argparse module supports subcommands for clean CLI design
    - JSON module handles file persistence easily
    - Standard pattern: python script.py <command> [args]
-->
<!-- Key discoveries during exploration -->
- Swagger setup lives in `src/main.ts` using `SwaggerModule.createDocument` and `SwaggerModule.setup`.
- Many controllers use `@ApiResponse` with inline `content` + `example` objects.
- Example fixtures exist in `src/common/fixtures/swagger-examples.ts`.
- Shared API response type is defined in `src/common/types/api-response.types.ts`.
- `CustomersController` uses inline `schema.example` blocks for success responses; error responses are only descriptive.
- Core envelope is `{ result, error }` in runtime code, but several comments/docs still reference `{ data, error }`.
- `response-validator.utils.ts` validates `data`, which is inconsistent with the runtime envelope.
- Added shared Swagger envelope DTOs and response decorators to standardize `{ result, error }` schemas.
- Controllers with inline response examples still to migrate: Auth, Sessions, Payments, Inventory, Products/Categories/Modifiers, Sales.
- Created response DTOs for Auth, Sessions, Payments, Inventory, Products, and Sales modules and swapped controllers to `{ result, error }` decorators.
- Inventory/product Swagger examples were out of sync with entity shapes; new DTOs align with current entities.
- Remaining controllers still using `@ApiResponse`: Users, Kitchen, Discounts, Compliance, Tables, Lookup, Reports, Delivery, Settings, Audit.

## Technical Decisions
<!-- 
  WHAT: Architecture and implementation choices you've made, with reasoning.
  WHY: You'll forget why you chose a technology or approach. This table preserves that knowledge.
  WHEN: Update whenever you make a significant technical choice.
  EXAMPLE:
    | Use JSON for storage | Simple, human-readable, built-in Python support |
    | argparse with subcommands | Clean CLI: python todo.py add "task" |
-->
<!-- Decisions made with rationale -->
| Decision | Rationale |
|----------|-----------|
| Introduce `ApiResponseEnvelopeDto` + `ApiResultResponse`/`ApiErrorResponse` decorators | Centralizes Swagger response envelope `{ result, error }` and removes inline examples. |

## Issues Encountered
<!-- 
  WHAT: Problems you ran into and how you solved them.
  WHY: Similar to errors in task_plan.md, but focused on broader issues (not just code errors).
  WHEN: Document when you encounter blockers or unexpected challenges.
  EXAMPLE:
    | Empty file causes JSONDecodeError | Added explicit empty file check before json.load() |
-->
<!-- Errors and how they were resolved -->
| Issue | Resolution |
|-------|------------|
|       |            |

## Resources
<!-- 
  WHAT: URLs, file paths, API references, documentation links you've found useful.
  WHY: Easy reference for later. Don't lose important links in context.
  WHEN: Add as you discover useful resources.
  EXAMPLE:
    - Python argparse docs: https://docs.python.org/3/library/argparse.html
    - Project structure: src/main.py, src/utils.py
-->
<!-- URLs, file paths, API references -->
- `src/main.ts`
- `src/common/fixtures/swagger-examples.ts`
- `src/common/types/api-response.types.ts`
- `src/common/utils/response-validator.utils.ts`
- `src/common/interceptors/transform.interceptor.ts`
- `src/common/filters/http-exception.filter.ts`
- `src/common/dto/api-response.dto.ts`
- `src/common/decorators/api-response.decorator.ts`
- `src/modules/customers/dto/customer-response.dto.ts`
- `src/modules/auth/dto/auth-response.dto.ts`
- `src/modules/sessions/dto/session-response.dto.ts`
- `src/modules/payments/dto/payment-response.dto.ts`
- `src/modules/inventory/dto/inventory-response.dto.ts`
- `src/modules/sales/dto/sales-response.dto.ts`
- `src/modules/products/dto/catalog-response.dto.ts`
- `src/modules/customers/customers.controller.ts`

## Visual/Browser Findings
<!-- 
  WHAT: Information you learned from viewing images, PDFs, or browser results.
  WHY: CRITICAL - Visual/multimodal content doesn't persist in context. Must be captured as text.
  WHEN: IMMEDIATELY after viewing images or browser results. Don't wait!
  EXAMPLE:
    - Screenshot shows login form has email and password fields
    - Browser shows API returns JSON with "status" and "data" keys
-->
<!-- CRITICAL: Update after every 2 view/browser operations -->
<!-- Multimodal content must be captured as text immediately -->
-

---
<!-- 
  REMINDER: The 2-Action Rule
  After every 2 view/browser/search operations, you MUST update this file.
  This prevents visual information from being lost when context resets.
-->
*Update this file after every 2 view/browser/search operations*
*This prevents visual information from being lost*
