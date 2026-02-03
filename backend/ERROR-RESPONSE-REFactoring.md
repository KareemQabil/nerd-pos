# Error Response Refactoring Guide

## Overview
The API now returns a unified envelope for both success and error:
```json
{ "data": { ... }, "error": null }
```
```json
{ "data": null, "error": { "messageKey": "...", "messageEn": "...", "messageAr": "...", "details": { } } }
```

## How to Throw Keyed Errors
Prefer throwing custom exceptions with a constant from `ErrorMessages`:
```ts
throw new NotFoundAppException(ErrorMessages.ParentCategoryNotFound, {
  parentId,
});
```
To attach details:
```ts
throw new BusinessValidationException(ErrorMessages.InvalidPrice, {
  field: 'price',
});
```

## Adding New Error Messages
Add new entries in `src/common/constants/error-messages.ts`:
```ts
export const ErrorMessages = {
  ProductNotFound: {
    key: 'PRODUCT_NOT_FOUND',
    messageEn: 'Product not found.',
    messageAr: 'المنتج غير موجود.',
  },
};
```

## Suggested Refactoring Steps (Per Module)
1. Replace string-based exceptions with keyed constants.
2. Add `details` for IDs or validation context.
3. Update Swagger examples in controllers or `src/common/fixtures/swagger-examples.ts`.
4. Adjust tests that assert legacy response fields (`success`, `statusCode`, RFC 9457).

## Notes
- Validation errors are automatically mapped to `ErrorMessages.ValidationError` with details.
- Existing string exceptions still work; they map to a default error by HTTP status.

## Available Custom Exceptions
Use these when you want status-specific responses with typed error keys:
- `BadRequestAppException` (400)
- `UnauthorizedAppException` (401)
- `ForbiddenAppException` (403)
- `NotFoundAppException` (404)
- `ConflictAppException` (409)
- `UnprocessableEntityAppException` (422)
- `TooManyRequestsAppException` (429)
- `InternalServerErrorAppException` (500)

`BusinessValidationException` is a convenience alias for 422.
