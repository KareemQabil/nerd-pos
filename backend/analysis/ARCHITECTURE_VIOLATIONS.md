# Architecture Compliance Report

## Rule 1: No Direct Prisma in Services
- **Status**: MOSTLY COMPLIANT
- **Note**: `SalesService` uses `PrismaService` for `$transaction` orchestration (`this.prisma.$transaction`). This is a necessary pattern for ACID compliance unless a dedicated `TransactionManager` is abstracted.
- **Action**: Accept as valid pattern for now, or abstract later.

## Rule 2: All Controllers Must Have @Permissions
- **Status**: COMPLIANT
- **Verified**: `SalesController` has `@Permissions` on all endpoints.

## Rule 3: All Decimals Must Use .toFixed(3)
- **Status**: VIOLATION DETECTED
- **File**: `src/modules/sales/sales.service.ts`
- **Violation**: Uses `.toNumber()` extensively via `safeToNumber` helper.
- **Risk**: Precision loss for high-value calculations or non-integer division.
- **Action**: Refactor to pass `Decimal` objects to Repository, and only convert to string/number at the very edge (Serializer/DB Adapter).

## Rule 4: No Direct Service Calls
- **Status**: COMPLIANT
- **Verified**: `SalesService` uses `eventBus.publish` for `OrderCreated`, `OrderConfirmed`, etc. No direct calls to Inventory/Kitchen observed.
