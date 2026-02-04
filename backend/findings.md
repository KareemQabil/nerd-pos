# Findings & Decisions

## Requirements
- Verify each module under `src/modules` for exception refactoring status.
- Provide a module-by-module summary indicating custom exceptions vs legacy usage.
- Refactor remaining legacy throws in auth and inventory (per user request).

## Research Findings
- Modules present: audit, auth, compliance, customers, delivery, discounts, inventory, kitchen, lookup, payments, products, reports, sales, sessions, settings, tables, users.
- Previously legacy spots in auth guards/JWT strategy and inventory FIFO strategy.

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| Replace legacy Nest exceptions in guards/strategy with custom exceptions | Align with `{ data, error }` envelope | 
| Use `ErrorMessages.JwtSecretInvalid` and `ErrorMessages.InvalidTokenPayload` for JWT strategy errors | Clear, structured error keys |

## Issues Encountered
| Issue | Resolution |
|-------|------------|

## Resources
- `src/modules/auth/guards/permissions.guard.ts`
- `src/modules/auth/strategies/jwt.strategy.ts`
- `src/modules/inventory/strategies/fifo.strategy.ts`
