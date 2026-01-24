# 🧪 NerdPOS E2E Testing Suite

Comprehensive End-to-End testing for the NerdPOS Restaurant Point of Sale System.

## 📂 Test Scripts

| Script | Description | Coverage |
|--------|-------------|----------|
| `production-simulation.ts` | Full production simulation | 14 Acts, all modules |
| `workflow-tests.ts` | WORKFLOWS.md validation | 9 key workflows |
| `security-tests.ts` | Security & RBAC | Auth, roles, input validation |
| `financial-tests.ts` | Financial calculations | Tax, discounts, FIFO |
| `run-all-tests.ts` | Master test runner | Orchestrates all suites |

## 🚀 Quick Start

```bash
# Navigate to backend directory
cd nerdPOS/backend

# Install dependencies (if not done)
npm install

# Run all tests
npx ts-node scripts/run-all-tests.ts

# Run specific suite
npx ts-node scripts/workflow-tests.ts
npx ts-node scripts/security-tests.ts
npx ts-node scripts/financial-tests.ts

# Run single workflow
npx ts-node scripts/workflow-tests.ts 1   # Quick Sale
npx ts-node scripts/workflow-tests.ts 2   # Dine-In
npx ts-node scripts/workflow-tests.ts all # All workflows
```

## 📋 Test Suites Detail

### 1. Production Simulation (`production-simulation.ts`)

Complete 14-Act simulation covering a full day of restaurant operations:

| Act | Scenario | Tests |
|-----|----------|-------|
| 1 | Foundation Setup | Users, products, inventory, categories |
| 2 | Session Management | Open session, drawer balance |
| 3 | Quick Sale | TAKEOUT order, cash payment |
| 4 | Dine-In Order | Table assignment, order creation |
| 5 | Kitchen Workflow | KDS state machine, ticket lifecycle |
| 6 | Payment & Compliance | Payment processing, ZATCA invoice |
| 7 | Security Verification | Auth, RBAC, invalid token handling |
| 8 | Delivery Order | Delivery address, driver assignment |
| 9 | Inventory Operations | Stock receiving, FIFO deduction |
| 10 | Session Close | Z-report, cash reconciliation |
| 11 | Reports | Daily sales, Z-report generation |
| 12 | Customer Management | Loyalty, customer profiles |
| 13 | Discount Application | Percentage & fixed discounts |
| 14 | Audit Trail | Audit log verification |

### 2. Workflow Tests (`workflow-tests.ts`)

Based on WORKFLOWS.md scenarios:

| Workflow | Description |
|----------|-------------|
| 1 | Quick Sale (Cash, No Table) |
| 2 | Dine-In Order with Table |
| 4 | Receive Stock (Purchase) |
| 5 | Stock Adjustment |
| 6 & 7 | Session Open & Close |
| 9 | Split Payment |
| 10 | Kitchen Display System (KDS) |
| 11 | ZATCA E-Invoicing |

### 3. Security Tests (`security-tests.ts`)

Comprehensive security validation:

- **Authentication**: Valid/invalid login, JWT validation
- **RBAC**: Role-based access for ADMIN, MANAGER, CASHIER, WAITER, KITCHEN_STAFF
- **Input Validation**: SQL injection, XSS, data types, oversized input
- **Session Security**: Token format, payload inspection, concurrent sessions
- **Data Isolation**: Non-existent resources, invalid UUIDs
- **Security Headers**: CORS, Content-Type, HSTS, X-Frame-Options

### 4. Financial Tests (`financial-tests.ts`)

Decimal precision and calculation validation:

- **Tax Calculations**: 15% VAT on various amounts
- **Multiple Items**: Multi-line order totals
- **Discounts**: Percentage and fixed amount
- **Edge Cases**: Repeating decimals, small/large amounts, precision
- **Payment Reconciliation**: Exact payment, change calculation
- **FIFO Costing**: Multi-batch inventory cost tracking

## ⚙️ Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `API_URL` | `http://localhost:3001/api/v1` | Target API endpoint |
| `VERBOSE` | `false` | Show detailed output |

```bash
# Custom API target
API_URL=http://staging:3001/api/v1 npx ts-node scripts/run-all-tests.ts

# Verbose output
VERBOSE=true npx ts-node scripts/financial-tests.ts
```

### Default Test Credentials

| User | Password | Role |
|------|----------|------|
| admin | nerdpos123 | ADMIN |

## 📊 Test Output

### Success Example

```
╔════════════════════════════════════════════════════════════════════╗
║       🚀 NERDPOS COMPREHENSIVE E2E TEST RUNNER 🚀                  ║
╚════════════════════════════════════════════════════════════════════╝

  Suite Results:
  ────────────────────────────────────────────────────────────────
  ✅ PASS  Production Simulation              2m 15s
  ✅ PASS  Workflow Tests                     1m 23s
  ✅ PASS  Security Tests                        45s
  ✅ PASS  Financial Tests                    1m 02s
  ────────────────────────────────────────────────────────────────
  Total Suites: 4
  Passed: 4
  Total Duration: 5m 25s

🏆 ALL TESTS PASSED! (100%)
   Your NerdPOS system is ready for production! 🎉
```

### Failure Example

```
  ────────────────────────────────────────────────────────────────
  ✅ PASS  Production Simulation              2m 15s
  ❌ FAIL  Security Tests                        45s
  ✅ PASS  Financial Tests                    1m 02s
  ────────────────────────────────────────────────────────────────
  
  Failed Suites:
    • Security Tests - Authentication, RBAC, input validation
```

## 🔧 Prerequisites

1. **Backend Running**: Ensure the NerdPOS backend is running
   ```bash
   cd nerdPOS/backend
   npm run start:dev
   ```

2. **Database Seeded**: Run database migrations and seed data
   ```bash
   npx prisma migrate deploy
   npx prisma db seed
   ```

3. **Dependencies**: Install test dependencies
   ```bash
   npm install axios decimal.js
   npm install -D ts-node typescript @types/node
   ```

## 📝 Writing New Tests

### Test Structure

```typescript
async function myNewTest(api: AxiosInstance) {
  // 1. Setup
  log('\n[Step 1] Setup', 'step');
  
  // 2. Execute
  log('\n[Step 2] Execute', 'step');
  const response = await api.post('/endpoint', { data });
  
  // 3. Assert
  log('\n[Step 3] Verify', 'step');
  assert(response.status === 201, 'Resource created');
  assertDecimal(response.data.total, '115.00', 'Total is correct');
  
  // 4. Cleanup (optional)
}
```

### Adding to Test Runner

1. Create new test file in `scripts/`
2. Add to `TEST_SUITES` array in `run-all-tests.ts`:
   ```typescript
   {
     name: 'My New Tests',
     script: 'my-new-tests.ts',
     description: 'Description of tests',
     category: 'full',
     timeout: 120000,
   }
   ```

## 🐛 Troubleshooting

### Connection Refused
```
Error: connect ECONNREFUSED 127.0.0.1:3001
```
➡️ Ensure backend is running on the correct port

### Authentication Failed
```
Assertion failed: Admin login returned 401
```
➡️ Check admin credentials in database seed

### Timeout
```
[TIMEOUT: Test exceeded time limit]
```
➡️ Increase timeout in test suite or check for infinite loops

### Database Errors
```
Prisma error: Foreign key constraint failed
```
➡️ Run migrations and ensure proper seed order

## 📈 CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: nerdpos_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx prisma migrate deploy
      - run: npm run start:dev &
      - run: sleep 10
      - run: npx ts-node scripts/run-all-tests.ts
```

## 📚 Related Documentation

- [WORKFLOWS.md](../FINAL/REFERENCE/WORKFLOWS.md) - Business workflow definitions
- [BRD.md](../FINAL/REFERENCE/BRD.md) - Business requirements
- [Backend Modules](../FINAL/BACKEND/) - Backend architecture documentation

---

*Generated for NerdPOS E2E Testing Suite*
