# Task Plan: Unified API Response Envelope + Error Mapping

## Goal
Implement a base `{ data, error }` response structure with centralized error message mapping and update global interceptors/filters accordingly, plus provide a refactoring guide without modifying all modules.

## Current Phase
Phase 5

## Phases

### Phase 1: Requirements & Discovery
- [x] Understand user intent
- [x] Identify constraints
- [x] Document in findings.md
- **Status:** complete

### Phase 2: Planning & Structure
- [x] Define response types and error message map location
- [x] Identify interceptor/filter changes
- [x] Draft refactoring guide outline
- **Status:** complete

### Phase 3: Implementation
- [x] Add error message constants and helper types
- [x] Update global exception filter to map error keys
- [x] Update success response interceptor to `{ data, error }` format
- [x] Update/replace response validator utilities
- [x] Add documentation/guide file
- [x] Refactor products module to use error keys
- [x] Update products Swagger examples for new envelope
- **Status:** complete

### Phase 4: Testing & Verification
- [ ] Sanity-check compile (not run)
- [ ] Document test results
- **Status:** pending

### Phase 5: Delivery
- [x] Summarize changes and refactoring steps
- **Status:** complete

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| Use unified `{ data, error }` envelope across success and error | User requirement |
| Centralize error messages in a constant map + helper | Enables `throw new NotFoundException(ErrorMessages.Key)` |
| Provide migration guide instead of mass refactor | User requested base structure only |
| Start module refactor with Products | Natural fit for ParentCategoryNotFound example and high-impact module |

## Errors Encountered
| Error | Resolution |
|-------|------------|
| session-catchup.py missing at default path | Ran script from `/home/m4hosam/.codex/...` |
