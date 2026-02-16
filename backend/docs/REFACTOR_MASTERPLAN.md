# NerdPOS Refactor Master Plan

## Executive Summary
- **Total Violations**: 2 Major
- **Critical**: 0
- **High**: 2
- **Moderate**: 1
- **Estimated Effort**: 4-6 hours
- **Risk Level**: LOW

## Priority 1: HIGH (Do First)

### H1: Fix DTO Naming Convention (Sales)
**Impact**: Consistency & Clarity
**Files**: `src/modules/sales/dto/index.ts`
**Changes**:
```diff
export class CreateOrderItemDto {
- name: string;
+ nameEn: string;
}
```
**Update**: `src/modules/sales/sales.service.ts` mapping logic.

### H2: Refactor Decimal Precison (Sales)
**Impact**: Financial Accuracy
**Files**: `src/modules/sales/sales.service.ts`
**Changes**:
- Remove `safeToNumber` conversion for intermediate calculations?
- Actually, `SalesOrder` entity uses `@db.Decimal(12, 3)`. Prisma expects String or Number or Decimal.
- **Immediate Fix**: Ensure rounding is handled explicitly.
- **Plan**: Replace `toNumber()` with `.toFixed(3)` where string representation is needed, or keep as Decimal if Repository supports it.
- **Decision**: Update `SalesService` to ensure `grandTotal` and monetary values are treated as Decimals/Strings to prevent float artifacts.

## Priority 2: MODERATE

### M1: Extract Workflow Service (Sales)
**Impact**: SRP & Testability
**Files**: `src/modules/sales/sales.service.ts`
**Action**:
- The `SalesService` is handling calculation pipeline + transaction + event emission.
- Extract `createOrder` orchestration into `SalesWorkflowService`?
- **Decision**: Defer to Phase 4 (later), current complexity is manageable (475 lines).

## Execution Order

1. **H1 (Naming)**: Rename `name` -> `nameEn` in `CreateOrderItemDto`.
2. **H2 (Decimal)**: Audit `SalesService` calculation mapping and switch to `.toFixed(3)` string or strict Decimal passing.

## Verification
- Run `npm test` after each change.
- Verify `createOrder` endpoint still accepts payload (update frontend mock/client if needed).
