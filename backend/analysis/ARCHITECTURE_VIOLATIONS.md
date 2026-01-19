# Architecture Compliance Report

## Rule 1: Direct Prisma Usage (0 Violations Allowed)
- `src/modules/sales/sales.service.ts:128` - Calls `this.prisma.$transaction`
- `src/modules/inventory/inventory.service.ts` - Calls `this.prisma.$transaction`
- `src/modules/reports/reports.service.ts` - Widespread usage (`this.prisma as any`), coupled with `any` casting.
- `src/modules/audit/audit.service.ts` - Calls `this.prisma.auditLog`
- **Action**: Refactor to use Repositories. For transactions, implement a `UnitOfWork` pattern or `runInTransaction` method in repositories/base repository.

## Rule 2: Missing @Permissions (0 Violations Allowed)
- `src/modules/sales/sales.controller.ts` - **ALL** endpoints (10+) are missing `@Permissions`.
- Likely widespread across other controllers (e.g., `ProductsController` - not fully scanned but pattern suggests high probability).
- **Action**: Add `@Permissions('module:action')` to all endpoints.

## Rule 3: Decimal Without .toFixed (0 Violations Allowed)
- `src/modules/sales/sales.service.ts` - Uses `.toNumber()` for calculated values before saving to DB.
  - Example: `grandTotal: calculated.grandTotal.toNumber()`
  - **Violation**: Potential precision loss. Should use string representation or ensure Decimal type safety.
- **Action**: Ensure all financial calculations result in `.toFixed(3)` strings for DTOs and potentially for DB persistence (depending on Prisma Decimal mapping, but `.toNumber()` is definitely risky).

## Rule 4: Direct Service Calls (Should Use Events)
- `src/modules/auth/auth.service.ts` - Injects `UsersService`.
  - **Violation**: Tightly coupled.
- **Action**: Refactor to use Event Bus or strictly scoped Repositories if absolutely necessary (but Events preferred for cross-module logic).
