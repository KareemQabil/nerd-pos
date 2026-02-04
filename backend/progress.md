# Progress Log

## Session: 2026-02-03

### Current Status
- **Phase:** 5 - Delivery
- **Started:** 2026-02-03

### Actions Taken
- Replaced legacy `ForbiddenException` usage in auth permissions guard with custom exceptions.
- Replaced JWT strategy raw `Error` throws with `InternalServerErrorAppException` and `UnauthorizedAppException`.
- Replaced inventory FIFO strategy `BadRequestException` throws with `BadRequestAppException`.
- Added error keys for JWT secret invalid and invalid token payload.

### Test Results
| Test | Expected | Actual | Status |
|------|----------|--------|--------|

### Errors
| Error | Resolution |
|-------|------------|
