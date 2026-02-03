# Findings & Decisions

## Requirements
- Standardize all API responses to `{ data: object | null, error: object | null }`.
- On success: `error` is `null` and `data` contains the response payload.
- On error: `data` is `null` and `error` contains `{ messageKey, messageAr, messageEn, details? }`.
- Global exception handler should accept an error key (e.g., `ErrorMessages.ParentCategoryNotFound`) and map it to the response.
- Create base structure and refactoring guide; do not retrofit all modules.

## Research Findings
- Global success responses are currently wrapped by `TransformInterceptor` in `src/common/interceptors/transform.interceptor.ts`.
- Global error responses are currently RFC 9457 Problem Details in `src/common/filters/http-exception.filter.ts`.
- `DecimalTransformInterceptor` defines a different envelope but is not registered in `src/main.ts`.
- `response-validator.utils.ts` validates the existing success/error envelopes.

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| Introduce new unified response types and update the global exception filter + success interceptor to use them | Required to meet `{data, error}` envelope without refactoring all modules |
| Add centralized error message map (e.g., `ErrorMessages`) and helper to resolve keys | Enables throwing `NotFoundException(ErrorMessages.X)` consistently |
| Keep current modules unchanged; provide migration guide | User requested base structure only |

## Issues Encountered
| Issue | Resolution |
|-------|------------|
| session-catchup.py path mismatch | Used `/home/m4hosam/.codex/skills/planning-with-files/scripts/session-catchup.py` |

## Resources
- `src/common/filters/http-exception.filter.ts`
- `src/common/interceptors/transform.interceptor.ts`
- `src/common/interceptors/decimal-transform.interceptor.ts`
- `src/main.ts`
