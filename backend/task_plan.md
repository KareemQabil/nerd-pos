# Task Plan: Module-by-Module Refactor Verification

## Goal
Check every module under `src/modules` to verify whether exceptions are refactored to the new custom exceptions / ErrorMessages pattern, and provide a module-by-module summary. Apply fixes for remaining legacy spots in auth and inventory.

## Current Phase
Phase 5

## Phases

### Phase 1: Requirements & Discovery
- [x] Confirm modules list and scope
- [x] Document initial findings
- **Status:** complete

### Phase 2: Planning & Structure
- [x] Define verification criteria
- [x] Identify scan approach (throw sites, exception types)
- **Status:** complete

### Phase 3: Implementation
- [x] Scan each module for exception usage
- [x] Classify modules (custom exceptions vs legacy vs none)
- [x] Refactor remaining legacy throws in auth and inventory
- **Status:** complete

### Phase 4: Testing & Verification
- [ ] Sanity-check summary against scan outputs
- **Status:** pending

### Phase 5: Delivery
- [x] Provide module-by-module verification summary
- **Status:** complete

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| Use `rg "throw new"` per module to enumerate exception types | Fast, consistent scan across modules |
| Consider custom exceptions as refactored when they use `*AppException` or `BusinessValidationException` | Matches new exception pattern |
| Introduce JWT-specific error keys for config/payload failures | Keep auth errors structured |

## Errors Encountered
| Error | Resolution |
|-------|------------|
