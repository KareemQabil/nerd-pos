# High Churn Files Analysis

## Critical (20+ commits)
- `src/modules/sales/sales.service.ts` (Active Development)
  - **Reason**: Central business logic for Order Creation, Calculation Pipeline integration, and Transaction management.
  - **Recommendation**: Split into `SalesService` (CRUD) and `SalesWorkflowService` (Orchestration).

## High (15-19 commits)
- `src/modules/sales/sales.repository.ts`
  - **Reason**: Complex queries for Order management.
  - **Recommendation**: Monitor.

## Files to Monitor
- `src/modules/products/products.service.ts`: Frequent updates for inventory integration.
- `prisma/schema.prisma`: Core source of truth, expected to change but requires care.
