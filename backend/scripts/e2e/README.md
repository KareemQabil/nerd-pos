# 🧪 NerdPOS E2E Test Suite

Comprehensive end-to-end test suite for validating all 16 business workflows.

## Overview

This test suite validates the complete NerdPOS system through live HTTP requests against a running backend. No mocks, no fakes - just real API calls and database operations.

### Coverage

| Category | Tests | Status |
|----------|-------|--------|
| Core Sales | 001-015 | ✅ Implemented |
| Inventory | 016-025 | ✅ Implemented |
| Sessions | 026-035 | 🔄 Planned |
| Payments | 036-042 | 🔄 Planned |
| Kitchen | 043-052 | 🔄 Planned |
| Customers | 053-058 | 🔄 Planned |
| Compliance | 059-065 | 🔄 Planned |
| Error Recovery | 066-075 | 🔄 Planned |
| Advanced | 076-087 | 🔄 Planned |

**Total: 87 test scenarios across 16 business workflows**

## Prerequisites

1. **Backend Running**
   ```bash
   cd k:\nerdREF\nerdPOS\backend
   npm run start:dev
   ```

2. **Database Seeded**
   ```bash
   npx prisma migrate deploy
   npx ts-node prisma/seed.ts
   ```

3. **Test Users Created**
   - Admin: `admin` / `nerdpos123`
   - Manager: `manager` / `manager123`
   - Cashier: `cashier` / `cashier123`

## Quick Start

```bash
# Run all tests
npx ts-node scripts/e2e/runner.ts

# Run smoke tests only (critical path)
npx ts-node scripts/e2e/runner.ts --smoke

# Run specific scenario
npx ts-node scripts/e2e/runner.ts --scenario 01
npx ts-node scripts/e2e/runner.ts 01 02

# Show help
npx ts-node scripts/e2e/runner.ts --help
```

## Configuration

Environment variables (optional):

```bash
export TEST_API_URL=http://localhost:3001/api/v1
export TEST_ADMIN_USER=admin
export TEST_ADMIN_PASS=nerdpos123
export TEST_DEBUG=true  # Enable verbose logging
```

## Test Scenarios

### 01 - Core Sales (Tests 001-015)

| Test | Description | Priority |
|------|-------------|----------|
| TEST-001 | Quick Sale - Cash Payment (Happy Path) | CRITICAL |
| TEST-002 | Quick Sale - Decimal Precision (ZATCA) | CRITICAL |
| TEST-003 | Quick Sale - Item with Discount | HIGH |
| TEST-004 | Quick Sale - Multiple Items | HIGH |
| TEST-005 | Quick Sale - Out of Stock (Negative) | CRITICAL |
| TEST-006 | Dine-In Order - Save Check | HIGH |
| TEST-007 | Dine-In Order - Complete Payment | HIGH |
| TEST-008 | Dine-In Order - Add Items | MEDIUM |
| TEST-009 | Takeout Order - No Table | HIGH |
| TEST-010 | Delivery Order - Address Required | HIGH |
| TEST-011 | Delivery Order - Zone Pricing | MEDIUM |
| TEST-012 | Quick Sale - Invalid Session (Negative) | HIGH |
| TEST-013 | Quick Sale - Negative Price (Validation) | MEDIUM |
| TEST-014 | Quick Sale - Arabic Item Notes | MEDIUM |
| TEST-015 | Quick Sale - Long Item Name | LOW |

### 02 - Inventory (Tests 016-025)

| Test | Description | Priority |
|------|-------------|----------|
| TEST-016 | Receive Stock (GRN) | CRITICAL |
| TEST-017 | Receive Stock - Multiple Products | HIGH |
| TEST-018 | Stock Deduction - FIFO Order | CRITICAL |
| TEST-019 | Stock Adjustment - Increase | HIGH |
| TEST-020 | Stock Adjustment - Decrease | HIGH |
| TEST-021 | Stock Adjustment - Manager Auth | MEDIUM |
| TEST-022 | Stock Transfer Between Warehouses | MEDIUM |
| TEST-023 | Low Stock Alert | MEDIUM |
| TEST-024 | Expiring Stock Alert | LOW |
| TEST-025 | Inventory Valuation Report | LOW |

## Architecture

```
scripts/e2e/
├── config/
│   ├── env.ts              # Environment configuration
│   └── client.ts           # Axios HTTP client
├── helpers/
│   ├── auth.helper.ts      # Authentication
│   ├── session.helper.ts   # POS sessions
│   ├── inventory.helper.ts # Stock operations
│   ├── sales.helper.ts     # Orders
│   ├── payments.helper.ts  # Payments
│   ├── kitchen.helper.ts   # KDS
│   ├── customers.helper.ts # Customer management
│   ├── compliance.helper.ts# ZATCA compliance
│   ├── assertions.helper.ts# Test assertions
│   ├── cleanup.helper.ts   # Test data cleanup
│   └── index.ts            # Re-exports
├── scenarios/
│   ├── 01-core-sales.ts    # Tests 001-015
│   ├── 02-inventory.ts     # Tests 016-025
│   └── ...                 # More scenarios
├── runner.ts               # Main orchestrator
└── README.md               # This file
```

## Key Features

### Decimal.js for Financial Calculations

All monetary calculations use `Decimal.js` for ZATCA compliance:

```typescript
import Decimal from 'decimal.js';

const subtotal = new Decimal(33.33);
const tax = subtotal.times(0.15);  // 4.9995 (NOT 5.00)
const total = subtotal.plus(tax);  // 38.3295 (NOT 38.33)
```

### 7-Step Order Pipeline

```
1. Subtotal (sum of items)
2. Item-level discounts
3. Order-level discounts
4. After-discount total
5. Service charge
6. Delivery fee
7. Tax (15% VAT)
```

### FIFO Inventory Deduction

Stock is deducted in First-In-First-Out order to ensure accurate COGS calculation.

## Writing New Tests

1. Create helper methods in `helpers/` for API interactions
2. Create scenario file in `scenarios/`
3. Add to `SCENARIOS` array in `runner.ts`

### Test Structure

```typescript
export async function test001_QuickSaleCash(ctx: TestContext): Promise<TestResult> {
    const startTime = Date.now();
    const testId = 'TEST-001';
    const testName = 'Quick Sale - Cash Payment';

    try {
        // Test implementation
        const assertions = [
            assertEqual(actual, expected, 'Description'),
            // ... more assertions
        ];

        const { allPassed, failed } = combineAssertions(assertions);

        return {
            id: testId,
            name: testName,
            passed: allPassed,
            duration: Date.now() - startTime,
            error: failed.length > 0 ? failed.map(f => f.message).join('; ') : undefined,
        };
    } catch (error) {
        return {
            id: testId,
            name: testName,
            passed: false,
            duration: Date.now() - startTime,
            error: (error as Error).message,
        };
    }
}
```

## Pass Criteria

| Metric | Target | Critical |
|--------|--------|----------|
| Pass Rate | > 95% | < 90% = BLOCK |
| Execution Time | < 45 min | > 2 hours = FAIL |
| Decimal Accuracy | 100% | Any error = CRITICAL |
| ZATCA Compliance | 100% | Any error = CRITICAL |

## Troubleshooting

### Backend Not Running
```
❌ Backend not responding at http://localhost:3001/api/v1
Run: npm run start:dev
```

### Authentication Failed
```
❌ Admin login failed
Check credentials or run seed script
```

### Session Already Open
```
Session may already exist, trying to get current...
```
This is normal - the test will use the existing session.

### Cleanup Errors
Cleanup errors are non-fatal and logged as warnings.

## Integration with CI/CD

```yaml
# Example GitHub Actions step
- name: Run E2E Tests
  run: |
    cd backend
    npm run start:dev &
    sleep 10
    npx ts-node scripts/e2e/runner.ts --smoke
```

## References

- [BRD.md](../../../FINAL/REFERENCE/BRD.md) - Business Requirements
- [WORKFLOWS.md](../../../FINAL/REFERENCE/WORKFLOWS.md) - Workflow Specifications
- [god-mode-live.ts](../god-mode-live.ts) - Original live test implementation
