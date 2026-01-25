# NerdPOS - Comprehensive Testing & Negative Test Suite Implementation Plan

**Version:** 1.0
**Date:** January 25, 2026
**Status:** Active Implementation Plan
**Owner:** QA & Engineering Teams

---

## Executive Summary

This document outlines the complete implementation strategy for testing NerdPOS, including:
1. **Reverse Engineering All Endpoints** - Catalog and test every API endpoint
2. **Negative Test Suite** - 150+ scenarios from TEST_SCENARIOS_NEGATIVE.md
3. **Event Bus Integrity** - Fix silent failures, add monitoring
4. **Production Simulation** - Load testing and chaos engineering
5. **Test Infrastructure** - Event spies, race condition tools, DLQ

### Critical Findings from Code Analysis

| Issue | Severity | Impact | Fix Required |
|-------|----------|--------|--------------|
| **Event Bus Silent Failures** | 🔴 CRITICAL | Handlers fail silently, no retry mechanism | Immediate |
| **No Event Handlers Registered** | 🔴 CRITICAL | Events published but nothing listening | Immediate |
| **No Race Condition Protection** | 🔴 CRITICAL | Concurrent stock deduction possible | Immediate |
| **No Dead Letter Queue** | 🟠 HIGH | Failed events lost forever | High Priority |
| **No Event Replay Mechanism** | 🟠 HIGH | Cannot recover from failures | High Priority |
| **Missing Transaction Wrappers** | 🟠 HIGH | Partial updates possible | High Priority |

---

## TABLE OF CONTENTS

1. [Phase 1: Infrastructure Setup](#phase-1-infrastructure-setup)
2. [Phase 2: Endpoint Discovery & Catalog](#phase-2-endpoint-discovery--catalog)
3. [Phase 3: Test Framework Enhancement](#phase-3-test-framework-enhancement)
4. [Phase 4: Negative Test Suite Implementation](#phase-4-negative-test-suite-implementation)
5. [Phase 5: Event Bus Overhaul](#phase-5-event-bus-overhaul)
6. [Phase 6: Production Simulation](#phase-6-production-simulation)
7. [Phase 7: CI/CD Integration](#phase-7-ci-cd-integration)
8. [Phase 8: Monitoring & Alerting](#phase-8-monitoring--alerting)
9. [Task Breakdown](#task-breakdown)
10. [Timeline & Milestones](#timeline--milestones)

---

## Phase 1: Infrastructure Setup (Week 1)

### 1.1 Test Database Setup

**Objective:** Isolated test database with automated seeding and cleanup.

```bash
# File: docker-compose.test.yml
version: '3.8'
services:
  postgres-test:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: nerdpos_test
      POSTGRES_USER: test_user
      POSTGRES_PASSWORD: test_pass
    ports:
      - "5433:5432"
    volumes:
      - pg_test_data:/var/lib/postgresql/data

volumes:
  pg_test_data:
```

**Tasks:**
- [ ] Create `docker-compose.test.yml`
- [ ] Add test database scripts to `package.json`
- [ ] Set up test data seeding fixtures
- [ ] Configure Jest to use test database
- [ ] Add automated cleanup between tests

### 1.2 Event Bus Testing Infrastructure

**Objective:** Capture, inspect, and verify all events during tests.

```typescript
// File: test/helpers/event-spy.ts
export class EventSpy {
  private capturedEvents: Map<string, DomainEvent[]> = new Map();
  private eventBus: IEventBus;

  constructor(eventBus: IEventBus) {
    this.eventBus = eventBus;
    this.setupInterception();
  }

  private setupInterception() {
    // Wrap publish to capture all events
    const originalPublish = this.eventBus.publish.bind(this.eventBus);
    this.eventBus.publish = async <T>(eventName: string, event: T) => {
      if (!this.capturedEvents.has(eventName)) {
        this.capturedEvents.set(eventName, []);
      }
      this.capturedEvents.get(eventName)!.push(event as DomainEvent);
      return originalPublish(eventName, event);
    };
  }

  assertEventFired(eventName: string, count: number = 1): boolean {
    const events = this.capturedEvents.get(eventName) || [];
    return events.length === count;
  }

  assertEventNotFired(eventName: string): boolean {
    return !this.capturedEvents.has(eventName) || this.capturedEvents.get(eventName)!.length === 0;
  }

  getEvents(eventName: string): DomainEvent[] {
    return this.capturedEvents.get(eventName) || [];
  }

  reset() {
    this.capturedEvents.clear();
  }

  getEventCount(eventName: string): number {
    return this.capturedEvents.get(eventName)?.length || 0;
  }

  verifyEventOrder(eventNames: string[]): boolean {
    const allEvents: Array<{ name: string; timestamp: Date }> = [];

    for (const [name, events] of this.capturedEvents) {
      for (const event of events) {
        allEvents.push({ name, timestamp: event.occurredAt });
      }
    }

    allEvents.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    const actualOrder = allEvents.map(e => e.name);
    return JSON.stringify(actualOrder) === JSON.stringify(eventNames);
  }
}
```

**Tasks:**
- [ ] Create `test/helpers/event-spy.ts`
- [ ] Create `test/helpers/seed-data.ts` with test fixtures
- [ ] Create `test/helpers/test-helpers.ts` with common utilities
- [ ] Add event spy setup to Jest configuration
- [ ] Create test database migration scripts

### 1.3 Race Condition Testing Framework

**Objective:** Execute concurrent operations and detect race conditions.

```typescript
// File: test/helpers/race-condition.ts
export class RaceConditionTester {
  /**
   * Execute multiple operations concurrently and detect conflicts
   */
  static async detectRaceCondition<T>(
    operations: (() => Promise<T>)[],
    validator: (results: T[]) => boolean
  ): Promise<{
    hasRaceCondition: boolean;
    results: T[];
    firstFailureIndex?: number;
  }> {
    const results = await Promise.all(
      operations.map(op => op().catch(e => e))
    );

    const hasRaceCondition = !validator(results);

    return {
      hasRaceCondition,
      results,
      firstFailureIndex: hasRaceCondition
        ? results.findIndex((r, i) => !validator([r]))
        : undefined
    };
  }

  /**
   * Simulate two terminals making the same request simultaneously
   */
  static async simulateDualTerminalRequest<T>(
    terminalA: () => Promise<T>,
    terminalB: () => Promise<T>
  ): Promise<{
    terminalAResult: T;
    terminalBResult: T;
    bothSucceeded: boolean;
    timeDifferenceMs: number;
  }> {
    const startTime = Date.now();
    const [resultA, resultB] = await Promise.all([
      terminalA().catch(e => ({ error: e })),
      terminalB().catch(e => ({ error: e }))
    ]);
    const endTime = Date.now();

    return {
      terminalAResult: resultA,
      terminalBResult: resultB,
      bothSucceeded: !('error' in resultA) && !('error' in resultB),
      timeDifferenceMs: endTime - startTime
    };
  }

  /**
   * Flood an endpoint with concurrent requests
   */
  static async floodEndpoint<T>(
    operation: () => Promise<T>,
    concurrency: number = 100
  ): Promise<{
    successful: number;
    failed: number;
    errors: Error[];
    averageResponseTimeMs: number;
  }> {
    const startTime = Date.now();
    const results = await Promise.allSettled(
      Array(concurrency).fill(null).map(() => operation())
    );
    const endTime = Date.now();

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    const errors = results
      .filter(r => r.status === 'rejected')
      .map(r => (r as PromiseRejectedResult).reason as Error);

    return {
      successful,
      failed,
      errors,
      averageResponseTimeMs: (endTime - startTime) / concurrency
    };
  }
}
```

**Tasks:**
- [ ] Create `test/helpers/race-condition.ts`
- [ ] Add concurrent request utilities
- [ ] Create timing measurement helpers
- [ ] Add result validation utilities

---

## Phase 2: Endpoint Discovery & Catalog (Week 2)

### 2.1 Automated Endpoint Discovery

**Objective:** Catalog every single API endpoint with its parameters and responses.

```typescript
// File: scripts/discover-endpoints.ts
import { readdirSync } from 'fs';
import { join } from 'path';
import { DocumentBuilder, SwaggerDocument } from '@nestjs/swagger';

interface EndpointInfo {
  controller: string;
  path: string;
  method: string;
  summary: string;
  description: string;
  tags: string[];
  parameters: ParameterInfo[];
  responses: ResponseInfo[];
}

interface ParameterInfo {
  name: string;
  in: 'path' | 'query' | 'body' | 'header';
  type: string;
  required: boolean;
  description: string;
}

interface ResponseInfo {
  statusCode: number;
  description: string;
  schema?: any;
}

export async function discoverAllEndpoints(): Promise<EndpointInfo[]> {
  const controllersPath = join(process.cwd(), 'dist', 'modules');
  const controllers = readdirSync(controllersPath, { recursive: true })
    .filter(f => f.endsWith('.controller.js'));

  const endpoints: EndpointInfo[] = [];

  for (const controller of controllers) {
    // Scan controller metadata for route decorators
    const metadata = Reflect.getMetadata('__routes__', controller);
    endpoints.push(...parseControllerMetadata(metadata));
  }

  return endpoints;
}

// Output: ENDPOINT_CATALOG.md
```

**Tasks:**
- [ ] Create endpoint discovery script
- [ ] Parse all controller decorators
- [ ] Extract DTO schemas
- [ ] Generate `docs/ENDPOINT_CATALOG.md`
- [ ] Create Postman collection from catalog

### 2.2 Endpoint Catalog Template

```markdown
# NerdPOS API Endpoint Catalog

Generated: DATE
Total Endpoints: COUNT

## Auth Module

### POST /api/v1/auth/login
**Description:** User authentication
**Tags:** auth
**Access:** Public

**Request Body:**
```typescript
{
  username: string;
  password: string;
}
```

**Responses:**
- 200: Authentication successful
- 401: Invalid credentials
- 429: Too many attempts

**Test Scenarios:**
- Valid credentials → 200
- Invalid password → 401
- SQL injection attempt → 400
- Empty username → 400
- Concurrent login attempts → Rate limit

**Events Fired:**
- `UserLoggedInEvent`
```

**Tasks:**
- [ ] Generate complete endpoint catalog
- [ ] Mark each endpoint with test coverage status
- [ ] Link to existing test files
- [ ] Identify untested endpoints
- [ ] Prioritize critical endpoints

---

## Phase 3: Test Framework Enhancement (Week 2-3)

### 3.1 Enhanced Jest Configuration

```typescript
// File: jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: [
    '**/*.spec.ts',
    '**/*.e2e-spec.ts',
    '**/*.negative.spec.ts'
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/main.ts',
    '!src/**/*.module.ts',
    '!src/**/*.dto.ts',
    '!src/**/*.entity.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './src/modules/sales/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    './src/modules/inventory/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  moduleNameMapper: {
    '^@modules/(.*)$': '<rootDir>/src/modules/$1',
    '^@core/(.*)$': '<rootDir>/src/core/$1'
  }
};
```

**Tasks:**
- [ ] Update Jest configuration
- [ ] Add coverage thresholds per module
- [ ] Configure test reporters (HTML, JSON, JUnit)
- [ ] Set up test database hooks
- [ ] Add global test setup/teardown

### 3.2 Test Organization Structure

```
test/
├── unit/                          # Unit Tests
│   ├── services/
│   │   ├── sales.service.spec.ts
│   │   ├── inventory.service.spec.ts
│   │   └── payments.service.spec.ts
│   ├── repositories/
│   └── strategies/
│
├── integration/                   # Integration Tests
│   ├── workflows/
│   │   ├── critical/              # Happy path workflows
│   │   ├── standard/
│   │   └── advanced/
│   └── lego-architecture/         # Core patterns
│
├── negative/                      # NEGATIVE TEST SUITE (NEW)
│   ├── inventory/                 # INV-01 to INV-10
│   │   ├── race-conditions.spec.ts
│   │   ├── stock-integrity.spec.ts
│   │   └── concurrent-operations.spec.ts
│   ├── financial/                 # FIN-01 to FIN-12
│   │   ├── decimal-precision.spec.ts
│   │   ├── payment-splitting.spec.ts
│   │   └── refund-integrity.spec.ts
│   ├── workflow/                  # WF-01 to WF-10
│   │   ├── state-jumping.spec.ts
│   │   └── ghost-events.spec.ts
│   ├── event-bus/                 # EB-01 to EB-10
│   │   ├── silent-failures.spec.ts
│   │   ├── handler-crashes.spec.ts
│   │   └── dead-letter-queue.spec.ts
│   ├── sessions/                  # SES-01 to SES-10
│   ├── multi-terminal/            # MT-01 to MT-07
│   ├── compliance/                # COMP-01 to COMP-07
│   ├── kitchen/                   # KDS-01 to KDS-06
│   └── edge-cases/                # EXT-01 to EXT-15
│
├── e2e/                           # End-to-End Tests
│   ├── api/
│   │   ├── auth.e2e-spec.ts
│   │   ├── sales.e2e-spec.ts
│   │   └── ...
│   └── workflows/
│
├── performance/                   # Performance Tests (NEW)
│   ├── load/
│   ├── stress/
│   └── spike/
│
├── helpers/                       # Test Utilities (NEW)
│   ├── event-spy.ts               # Event capture & verification
│   ├── race-condition.ts          # Concurrent operation testing
│   ├── seed-data.ts               # Test data generation
│   ├── test-helpers.ts            # Common test utilities
│   └── api-client.ts              # HTTP client wrapper
│
├── fixtures/                      # Test Fixtures (NEW)
│   ├── products.json
│   ├── orders.json
│   ├── customers.json
│   └── ...
│
├── setup.ts                       # Global test setup
└── teardown.ts                    # Global test teardown
```

**Tasks:**
- [ ] Create directory structure
- [ ] Move existing tests to new structure
- [ ] Create template test files
- [ ] Add test documentation

---

## Phase 4: Negative Test Suite Implementation (Weeks 3-8)

### 4.1 Inventory & Concurrency Tests (INV-01 to INV-10)

**File:** `test/negative/inventory/race-conditions.spec.ts`

```typescript
import { RaceConditionTester } from '../../helpers/race-condition';
import { EventSpy } from '../../helpers/event-spy';
import { Test, TestingModule } from '@nestjs/testing';
import { SalesService } from '../../../src/modules/sales/sales.service';
import { InventoryService } from '../../../src/modules/inventory/inventory.service';
import { PrismaService } from '../../../src/core/prisma/prisma.service';

describe('INV-01: Overselling Last Item (Race Condition)', () => {
  let salesService: SalesService;
  let inventoryService: InventoryService;
  let eventSpy: EventSpy;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      // ... module setup
    }).compile();

    salesService = module.get(SalesService);
    inventoryService = module.get(InventoryService);
    prisma = module.get(PrismaService);
    eventSpy = new EventSpy(module.get('IEventBus'));
  });

  beforeEach(async () => {
    // Setup: Product with stock = 3
    await prisma.product.create({
      data: {
        id: 'prod-oversell-test',
        name: 'Test Product',
        currentStock: 3,
        reorderPoint: 10
      }
    });

    // Setup: Warehouse with stock
    await prisma.inventoryItem.create({
      data: {
        productId: 'prod-oversell-test',
        warehouseId: 'warehouse-1',
        quantityOnHand: 3
      }
    });

    eventSpy.reset();
  });

  afterEach(async () => {
    await prisma.product.deleteMany();
    await prisma.inventoryItem.deleteMany();
    await prisma.salesOrder.deleteMany();
  });

  it('should prevent overselling when two terminals order simultaneously', async () => {
    // Arrange: Two terminals order same product
    const terminalAOrder = {
      type: 'DINE_IN',
      sessionId: 'session-a',
      items: [
        { productId: 'prod-oversell-test', name: 'Test', price: 50, quantity: 5 }
      ]
    };

    const terminalBOrder = {
      type: 'DINE_IN',
      sessionId: 'session-b',
      items: [
        { productId: 'prod-oversell-test', name: 'Test', price: 50, quantity: 5 }
      ]
    };

    // Act: Simulate concurrent requests
    const { terminalAResult, terminalBResult, bothSucceeded } =
      await RaceConditionTester.simulateDualTerminalRequest(
        () => salesService.createOrder(terminalAOrder, 'terminal-a'),
        () => salesService.createOrder(terminalBOrder, 'terminal-b')
      );

    // Assert: Only ONE should succeed
    expect([terminalAResult, terminalBResult]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ status: 201 }),
        expect.objectContaining({ status: 400 })
      ])
    );

    expect(bothSucceeded).toBe(false);

    // CRITICAL: Verify stock = 0 (not -2)
    const finalStock = await prisma.inventoryItem.findFirst({
      where: { productId: 'prod-oversell-test' }
    });
    expect(finalStock?.quantityOnHand?.toString()).toBe('0');

    // CRITICAL: Only 1 StockDeducted event fired
    expect(eventSpy.getEventCount('StockDeducted')).toBe(1);

    // CRITICAL: Only 1 OrderCreated event fired
    expect(eventSpy.getEventCount('OrderCreated')).toBe(1);
  });

  it('should handle rapid concurrent stock deductions correctly', async () => {
    // Setup: Product with stock = 10
    await prisma.inventoryItem.update({
      where: { productId_warehouseId: { productId: 'prod-oversell-test', warehouseId: 'warehouse-1' } },
      data: { quantityOnHand: 10 }
    });

    // Act: Flood with 20 concurrent orders (each requesting 1 unit)
    const { successful, failed } = await RaceConditionTester.floodEndpoint(
      async () => {
        try {
          return await salesService.createOrder({
            type: 'TAKEAWAY',
            sessionId: 'session-flood',
            items: [{ productId: 'prod-oversell-test', name: 'Test', price: 50, quantity: 1 }]
          }, 'user-1');
        } catch (e) {
          return { error: e };
        }
      },
      20
    );

    // Assert: Exactly 10 should succeed, 10 should fail
    expect(successful).toBe(10);
    expect(failed).toBe(10);

    // Verify stock = 0
    const stock = await prisma.inventoryItem.findFirst({
      where: { productId: 'prod-oversell-test' }
    });
    expect(stock?.quantityOnHand?.toString()).toBe('0');

    // Verify exactly 10 StockDeducted events
    expect(eventSpy.getEventCount('StockDeducted')).toBe(10);
  });
});
```

**File:** `test/negative/inventory/stock-integrity.spec.ts`

```typescript
describe('INV-02: Selling Zero-Stock Item', () => {
  it('should reject order when product has zero stock', async () => {
    // Setup: Product with stock = 0
    await setupZeroStockProduct();

    const order = {
      type: 'TAKEAWAY',
      items: [{ productId: 'zero-stock-prod', quantity: 1 }]
    };

    // Act & Assert
    await expect(salesService.createOrder(order, 'user'))
      .rejects.toThrow('Insufficient stock');

    // CRITICAL: Verify NO events fired
    expect(eventSpy.assertEventNotFired('OrderCreated')).toBe(true);
    expect(eventSpy.assertEventNotFired('StockDeducted')).toBe(true);

    // CRITICAL: Stock remains 0
    const stock = await getProductStock('zero-stock-prod');
    expect(stock.toString()).toBe('0');
  });
});
```

**Tasks for Inventory Tests:**
- [ ] Implement INV-01 (Overselling race condition)
- [ ] Implement INV-02 (Zero stock rejection)
- [ ] Implement INV-03 (Double stock deduction)
- [ ] Implement INV-04 (Negative stock adjustment)
- [ ] Implement INV-05 (Empty warehouse transfer)
- [ ] Implement INV-06 (Invalid product ID)
- [ ] Implement INV-07 (Concurrent warehouse transfer)
- [ ] Implement INV-08 (Modify product during sale)
- [ ] Implement INV-09 (Delete product with stock)
- [ ] Implement INV-10 (Direct stock deduction bypass)

### 4.2 Financial Integrity Tests (FIN-01 to FIN-12)

**File:** `test/negative/financial/payment-splitting.spec.ts`

```typescript
import Decimal from 'decimal.js';

describe('FIN-01: Split Payment Rounding Error', () => {
  it('should handle 10 / 3 split payment correctly', async () => {
    // Setup: Order with total = 10.00 SAR
    const order = await createOrderWithTotal(10.00);

    // Act: Split into 3 equal payments
    const payment1 = await processPayment(order.id, {
      amount: 3.33,
      method: 'CASH'
    });
    const payment2 = await processPayment(order.id, {
      amount: 3.33,
      method: 'CARD'
    });
    const payment3 = await processPayment(order.id, {
      amount: 3.34,  // Last payment absorbs remainder
      method: 'WALLET'
    });

    // Assert: Total paid = 10.00 (exact)
    const payments = await getPayments(order.id);
    const totalPaid = payments.reduce(
      (sum, p) => sum.plus(new Decimal(p.amount)),
      new Decimal(0)
    );

    expect(totalPaid.toNumber()).toBe(10.00);

    // CRITICAL: Order status = PAID (not PARTIALLY_PAID)
    const updatedOrder = await getOrder(order.id);
    expect(updatedOrder.status).toBe('PAID');

    // Verify PaymentReceived events fired correctly
    expect(eventSpy.getEventCount('PaymentReceived')).toBe(3);
  });

  it('should detect rounding errors in payment splits', async () => {
    // Setup: Order with total that cannot be evenly divided
    const order = await createOrderWithTotal(100);
    const splitCount = 7; // 100 / 7 = 14.285714...

    const payments: Decimal[] = [];
    let totalPaid = new Decimal(0);

    for (let i = 0; i < splitCount; i++) {
      const amount = new Decimal(100).dividedBy(splitCount)
        .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

      payments.push(amount);
      totalPaid = totalPaid.plus(amount);

      await processPayment(order.id, { amount: amount.toNumber(), method: 'CASH' });
    }

    // CRITICAL: Detect remainder
    const remainder = new Decimal(100).minus(totalPaid);
    const expectedRemainder = new Decimal(0).toDecimalPlaces(2);

    // If remainder exists, system should auto-adjust last payment
    expect(remainder.abs().toNumber()).toBeLessThanOrEqual(0.01);
  });
});
```

**File:** `test/negative/financial/tax-calculation.spec.ts`

```typescript
describe('FIN-07: Tax Calculation Rounding', () => {
  it('should calculate tax with exact precision', async () => {
    const order = {
      type: 'DINE_IN',
      items: [
        { price: 10.00, quantity: 1 },  // Tax: 1.50
        { price: 10.00, quantity: 1 },  // Tax: 1.50
        { price: 10.00, quantity: 1 },  // Tax: 1.50
      ]
    };

    // Act: Calculate with 15% VAT
    const calculated = await salesService.calculateOrder(order);

    // Assert: Total Tax = 4.50 (exact)
    expect(calculated.taxAmount.toNumber()).toBe(4.50);
    expect(calculated.grandTotal.toNumber()).toBe(34.50);

    // CRITICAL: No floating point errors
    expect(calculated.taxAmount.toString()).toBe('4.5');
    expect(calculated.grandTotal.toString()).toBe('34.5');
  });
});
```

**Tasks for Financial Tests:**
- [ ] Implement FIN-01 (Split payment rounding)
- [ ] Implement FIN-02 (Discount larger than total)
- [ ] Implement FIN-03 (Double refund)
- [ ] Implement FIN-04 (Negative price)
- [ ] Implement FIN-05 (Zero total order)
- [ ] Implement FIN-06 (Payment > total)
- [ ] Implement FIN-07 (Tax rounding)
- [ ] Implement FIN-08 (Void paid order)
- [ ] Implement FIN-09 (Partial refund overage)
- [ ] Implement FIN-10 (Service charge on takeaway)
- [ ] Implement FIN-11 (Currency mismatch)
- [ ] Implement FIN-12 (Session variance)

### 4.3 Workflow State Machine Tests (WF-01 to WF-10)

**File:** `test/negative/workflow/state-jumping.spec.ts`

```typescript
describe('WF-01: Add Item to Paid Order', () => {
  it('should reject item addition to paid order', async () => {
    // Setup: Paid order
    const order = await createPaidOrder();

    const itemDto = {
      productId: 'prod-new',
      quantity: 1
    };

    // Act & Assert
    await expect(salesService.addItem(order.id, itemDto))
      .rejects.toThrow('Cannot modify paid order');

    // CRITICAL: NO OrderItemAdded event
    expect(eventSpy.assertEventNotFired('OrderItemAdded')).toBe(true);

    // CRITICAL: NO stock deduction
    const stock = await getProductStock('prod-new');
    expect(stock.toString()).toBe('100'); // Unchanged
  });
});

describe('WF-02: Send Empty Order to Kitchen', () => {
  it('should reject empty kitchen ticket', async () => {
    const order = await createOrderWithItems([]);

    // Act & Assert
    await expect(kitchenService.createTicket(order.id))
      .rejects.toThrow('Cannot send empty order');

    // CRITICAL: NO KitchenTicketCreated event
    expect(eventSpy.assertEventNotFired('KitchenTicketCreated')).toBe(true);

    // Verify no ticket in database
    const ticket = await prisma.kitchenTicket.findFirst({
      where: { orderId: order.id }
    });
    expect(ticket).toBeNull();
  });
});
```

**Tasks for Workflow Tests:**
- [ ] Implement WF-01 (Add item to paid order)
- [ ] Implement WF-02 (Empty order to kitchen)
- [ ] Implement WF-03 (Complete completed order)
- [ ] Implement WF-04 (Pay cancelled order)
- [ ] Implement WF-05 (Cancel paid order)
- [ ] Implement WF-06 (Modify served ticket)
- [ ] Implement WF-07 (Reopen closed session)
- [ ] Implement WF-08 (Pay voided order)
- [ ] Implement WF-09 (Add items after kitchen)
- [ ] Implement WF-10 (State transition validation)

### 4.4 Event Bus Integrity Tests (EB-01 to EB-10)

**File:** `test/negative/event-bus/silent-failures.spec.ts`

```typescript
describe('EB-01: Order Created, Stock NOT Deducted', () => {
  it('should detect when stock deduction handler fails', async () => {
    // Setup: Mock failing handler
    const failingHandler = {
      handle: jest.fn().mockRejectedValue(new Error('Database connection lost'))
    };

    eventBus.subscribe('OrderCreated', failingHandler);

    // Act: Create order
    const order = await salesService.createOrder(validOrderDto, 'user');

    // Assert: Handler was called but failed
    expect(failingHandler.handle).toHaveBeenCalled();

    // CRITICAL: Verify data inconsistency detection
    const orderExists = await prisma.salesOrder.findUnique({
      where: { id: order.id }
    });
    expect(orderExists).toBeDefined(); // Order was created

    const stockDeducted = await prisma.inventoryMovement.findFirst({
      where: { referenceId: order.id, type: 'OUT' }
    });
    expect(stockDeducted).toBeNull(); // Stock NOT deducted!

    // CRITICAL: System should detect and alert
    // (This requires monitoring implementation)
  });
});
```

**File:** `test/negative/event-bus/handler-crashes.spec.ts`

```typescript
describe('EB-06: Multiple Handlers Fail Simultaneously', () => {
  it('should rollback all operations when critical handlers fail', async () => {
    // Setup: Mock all handlers to fail
    eventBus.subscribe('OrderCreated', {
      handle: jest.fn().mockRejectedValue(new Error('Handler 1 failed'))
    });
    eventBus.subscribe('OrderCreated', {
      handle: jest.fn().mockRejectedValue(new Error('Handler 2 failed'))
    });

    // Act: Attempt to create order
    let result;
    let error;
    try {
      result = await salesService.createOrder(validOrderDto, 'user');
    } catch (e) {
      error = e;
    }

    // Assert: Transaction should rollback
    expect(result).toBeUndefined();
    expect(error).toBeDefined();

    // CRITICAL: NO partial data in database
    const orders = await prisma.salesOrder.findMany({
      where: { orderNumber: { startsWith: 'ORD' } }
    });
    expect(orders.length).toBe(0);
  });
});
```

**Tasks for Event Bus Tests:**
- [ ] Implement EB-01 (Stock deduction failure)
- [ ] Implement EB-02 (Loyalty points failure)
- [ ] Implement EB-03 (Kitchen ticket failure)
- [ ] Implement EB-04 (Audit log failure)
- [ ] Implement EB-05 (ZATCA invoice failure)
- [ ] Implement EB-06 (Multiple handlers fail)
- [ ] Implement EB-07 (DLQ overflow)
- [ ] Implement EB-08 (Event replay idempotency)
- [ ] Implement EB-09 (Out of order events)
- [ ] Implement EB-10 (Listener timeout)

### 4.5 Session Management Tests (SES-01 to SES-10)

**File:** `test/negative/sessions/cash-reconciliation.spec.ts`

```typescript
describe('SES-01: Open Session While Another Open', () => {
  it('should reject duplicate open sessions for same user', async () => {
    // Setup: User has open session
    await sessionsService.openSession('user-1', { terminalId: 'term-1' });

    // Act & Assert
    await expect(
      sessionsService.openSession('user-1', { terminalId: 'term-2' })
    ).rejects.toThrow('User already has open session');

    // Verify only ONE session exists
    const sessions = await prisma.registerSession.findMany({
      where: { userId: 'user-1', status: 'OPEN' }
    });
    expect(sessions.length).toBe(1);
  });
});
```

**Tasks for Session Tests:**
- [ ] Implement SES-01 to SES-10

### 4.6 Multi-Terminal Conflict Tests (MT-01 to MT-07)

**File:** `test/negative/multi-terminal/conflicts.spec.ts`

```typescript
describe('MT-02: Pay Same Order Twice', () => {
  it('should prevent duplicate payments', async () => {
    const order = await createOrderWithTotal(100);

    // Act: Two terminals try to pay simultaneously
    const { terminalAResult, terminalBResult } =
      await RaceConditionTester.simulateDualTerminalRequest(
        () => paymentsService.processPayment(order.id, { amount: 100, method: 'CASH' }),
        () => paymentsService.processPayment(order.id, { amount: 100, method: 'CASH' })
      );

    // Assert: Only one payment accepted
    expect([terminalAResult, terminalBResult]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ status: 'success' }),
        expect.objectContaining({ status: 'error' })
      ])
    );

    // Verify order status = PAID (not OVERPAID)
    const updatedOrder = await getOrder(order.id);
    expect(updatedOrder.status).toBe('PAID');
    expect(updatedOrder.totalPaid?.toString()).toBe('100');
  });
});
```

**Tasks for Multi-Terminal Tests:**
- [ ] Implement MT-01 to MT-07

### 4.7 Compliance & Audit Trail Tests (COMP-01 to COMP-07)

**Tasks:**
- [ ] Implement COMP-01 (ZATCA hash chain)
- [ ] Implement COMP-02 to COMP-07

### 4.8 Kitchen Display System Tests (KDS-01 to KDS-06)

**Tasks:**
- [ ] Implement KDS-01 to KDS-06

### 4.9 Extreme Edge Cases Tests (EXT-01 to EXT-15)

**File:** `test/negative/edge-cases/chaos.spec.ts`

```typescript
describe('EXT-02: SQL Injection', () => {
  it('should sanitize product name input', async () => {
    const maliciousName = "'; DROP TABLE products; --";

    const result = await productsService.create({
      name: maliciousName,
      price: 50
    });

    // Verify name stored as-is (escaped)
    expect(result.name).toBe(maliciousName);

    // Verify products table still exists
    const products = await prisma.product.findMany();
    expect(products.length).toBeGreaterThan(0);
  });
});

describe('EXT-07: DDoS Protection', () => {
  it('should rate limit excessive requests', async () => {
    const requests = Array(1000).fill(null).map(() =>
      request(app).post('/api/v1/orders').send(validOrder)
    );

    const responses = await Promise.all(requests);

    // Most should be rate limited
    const rateLimited = responses.filter(r => r.status === 429).length;
    expect(rateLimited).toBeGreaterThan(500);
  });
});
```

**Tasks for Edge Cases:**
- [ ] Implement EXT-01 to EXT-15

---

## Phase 5: Event Bus Overhaul (Weeks 4-6)

### 5.1 Critical Event Bus Fixes

**Current Issue:** Silent failures in event handlers

**File:** `src/core/event-bus/event-bus.service.ts`

```typescript
// BEFORE (Current Implementation - HAS BUGS):
async publish<T>(eventName: string, event: T): Promise<void> {
  const handlers = this.handlers.get(eventName) || [];

  // BUG: Failed handlers are silently ignored
  await Promise.all(
    handlers.map((handler) =>
      handler.handle(event).catch((error) => {
        console.error(`Handler failed for ${eventName}:`, error);
        // Don't throw - let other handlers complete
      }),
    ),
  );
}

// AFTER (Fixed Implementation):
async publish<T>(eventName: string, event: T): Promise<void> {
  const handlers = this.handlers.get(eventName) || [];
  const failures: Array<{ handler: string; error: Error }> = [];

  // Execute handlers with individual error tracking
  const results = await Promise.allSettled(
    handlers.map(async (handler) => {
      const startTime = Date.now();
      try {
        await handler.handle(event);
        return {
          handler: handler.constructor.name,
          success: true,
          duration: Date.now() - startTime
        };
      } catch (error) {
        failures.push({
          handler: handler.constructor.name,
          error: error as Error
        });

        // CRITICAL: Log to Dead Letter Queue
        await this.deadLetterQueue.add({
          eventName,
          event,
          handler: handler.constructor.name,
          error: error as Error,
          timestamp: new Date()
        });

        throw error; // Re-throw for monitoring
      }
    })
  );

  // CRITICAL: Publish handler execution metrics
  await this.metricsService.publish('event_bus_execution', {
    eventName,
    totalHandlers: handlers.length,
    successful: results.filter(r => r.status === 'fulfilled').length,
    failed: failures.length,
    failures: failures.map(f => ({ handler: f.handler, error: f.error.message }))
  });

  // CRITICAL: Alert on critical failures
  const criticalEvents = ['OrderCreated', 'PaymentReceived', 'StockDeducted'];
  if (criticalEvents.includes(eventName) && failures.length > 0) {
    await this.alertService.sendCriticalAlert(
      `Event bus failure: ${failures.length} handlers failed for ${eventName}`,
      { eventName, failures }
    );
  }
}
```

**Tasks:**
- [ ] Update event bus service with failure tracking
- [ ] Add Dead Letter Queue implementation
- [ ] Add metrics publishing
- [ ] Add critical event alerting
- [ ] Update all event handlers with proper error handling

### 5.2 Dead Letter Queue Implementation

**File:** `src/core/event-bus/dead-letter-queue.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface DeadLetterEvent {
  id: string;
  eventName: string;
  eventData: any;
  handlerName: string;
  error: string;
  stackTrace?: string;
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
  lastAttemptAt?: Date;
  status: 'PENDING' | 'RETRYING' | 'FAILED_PERMANENTLY' | 'RESOLVED';
}

@Injectable()
export class DeadLetterQueueService {
  constructor(private readonly prisma: PrismaService) {}

  async add(event: {
    eventName: string;
    event: any;
    handler: string;
    error: Error;
  }): Promise<void> {
    await this.prisma.deadLetterEvent.create({
      data: {
        eventName: event.eventName,
        eventData: JSON.stringify(event.event),
        handlerName: event.handler,
        error: event.error.message,
        stackTrace: event.error.stack,
        retryCount: 0,
        maxRetries: 3,
        status: 'PENDING'
      }
    });
  }

  async retry(eventId: string): Promise<boolean> {
    const dlEvent = await this.prisma.deadLetterEvent.findUnique({
      where: { id: eventId }
    });

    if (!dlEvent || dlEvent.retryCount >= dlEvent.maxRetries) {
      return false;
    }

    // Attempt to re-process
    const eventData = JSON.parse(dlEvent.eventData);
    const success = await this.attemptReprocessing(
      dlEvent.eventName,
      eventData,
      dlEvent.handlerName
    );

    if (success) {
      await this.prisma.deadLetterEvent.update({
        where: { id: eventId },
        data: { status: 'RESOLVED' }
      });
      return true;
    } else {
      await this.prisma.deadLetterEvent.update({
        where: { id: eventId },
        data: {
          retryCount: dlEvent.retryCount + 1,
          lastAttemptAt: new Date(),
          status: dlEvent.retryCount + 1 >= dlEvent.maxRetries
            ? 'FAILED_PERMANENTLY'
            : 'PENDING'
        }
      });
      return false;
    }
  }

  async getFailedEvents(limit: number = 100): Promise<DeadLetterEvent[]> {
    return this.prisma.deadLetterEvent.findMany({
      where: { status: { in: ['PENDING', 'RETRYING'] } },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }

  private async attemptReprocessing(
    eventName: string,
    eventData: any,
    handlerName: string
  ): Promise<boolean> {
    // Find and re-execute the handler
    // Implementation depends on handler registry
    return true; // Placeholder
  }
}
```

**Tasks:**
- [ ] Create DeadLetterEvent Prisma model
- [ ] Implement DLQ service
- [ ] Add retry mechanism
- [ ] Create DLQ monitoring dashboard
- [ ] Add admin API for manual retry

### 5.3 Event Replay Mechanism

**File:** `src/core/event-bus/event-replay.service.ts`

```typescript
@Injectable()
export class EventReplayService {
  async replayEvent(eventId: string): Promise<void> {
    const eventLog = await this.prisma.eventLog.findUnique({
      where: { id: eventId }
    });

    if (!eventLog) {
      throw new NotFoundException('Event not found');
    }

    const eventData = JSON.parse(eventLog.data);
    const domainEvent = this.deserializeEvent(eventLog.eventName, eventData);

    // Check idempotency - has this been processed?
    const processed = await this.prisma.eventProcessing.findUnique({
      where: { eventId_handler: { eventId, handler: 'ALL' } }
    });

    if (processed) {
      throw new BadRequestException('Event already processed');
    }

    // Re-publish to event bus
    await this.eventBus.publish(eventLog.eventName, domainEvent);
  }

  async replayEventsInRange(startDate: Date, endDate: Date): Promise<void> {
    const events = await this.prisma.eventLog.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate }
      },
      orderBy: { createdAt: 'asc' }
    });

    for (const event of events) {
      await this.replayEvent(event.id);
    }
  }
}
```

**Tasks:**
- [ ] Implement event replay service
- [ ] Add idempotency checking
- [ ] Create replay admin API
- [ ] Add replay safety measures (validation before replay)

---

## Phase 6: Production Simulation (Weeks 7-8)

### 6.1 Production Simulation Script

**File:** `scripts/production-simulation.ts`

```typescript
#!/usr/bin/env ts-node
/**
 * Production Simulation Script
 *
 * Simulates real-world POS usage patterns to:
 * - Test all endpoints under realistic load
 * - Expose race conditions
 * - Verify event bus integrity
 * - Generate performance metrics
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { SalesService } from '../src/modules/sales/sales.service';
import { InventoryService } from '../src/modules/inventory/inventory.service';
import { SessionsService } from '../src/modules/sessions/sessions.service';
import { EventSpy } from '../test/helpers/event-spy';

interface SimulationConfig {
  duration: number; // Duration in minutes
  terminals: number; // Number of concurrent terminals
  ordersPerMinute: number; // Order rate per terminal
  chaosMode: boolean; // Enable random failures
}

interface SimulationReport {
  startTime: Date;
  endTime: Date;
  totalOrders: number;
  successfulOrders: number;
  failedOrders: number;
  averageResponseTime: number;
  eventFiringStats: Record<string, number>;
  raceConditionsDetected: number;
  inconsistenciesFound: string[];
}

class ProductionSimulator {
  private app;
  private salesService: SalesService;
  private inventoryService: InventoryService;
  private eventSpy: EventSpy;
  private report: Partial<SimulationReport> = {};

  async initialize() {
    this.app = await NestFactory.createApplicationContext(AppModule);
    this.salesService = this.app.get(SalesService);
    this.inventoryService = this.app.get(InventoryService);
    this.eventSpy = new EventSpy(this.app.get('IEventBus'));
  }

  async runSimulation(config: SimulationConfig): Promise<SimulationReport> {
    console.log('🚀 Starting Production Simulation');
    console.log(`   Duration: ${config.duration} minutes`);
    console.log(`   Terminals: ${config.terminals}`);
    console.log(`   Orders/Min: ${config.ordersPerMinute}`);
    console.log(`   Chaos Mode: ${config.chaosMode ? 'ENABLED' : 'disabled'}`);

    this.report.startTime = new Date();

    // Launch terminal simulators
    const terminalSimulators = Array(config.terminals).fill(null).map((_, i) =>
      this.runTerminal(i, config)
    );

    // Wait for simulation duration
    await this.waitFor(config.duration * 60 * 1000);

    // Stop all simulators
    terminalSimulators.forEach(t => t.stop());

    this.report.endTime = new Date();

    // Generate report
    return await this.generateReport();
  }

  private async runTerminal(terminalId: number, config: SimulationConfig) {
    const session = await this.salesService.openSession(`terminal-${terminalId}`);
    let stopped = false;

    const runOrders = async () => {
      while (!stopped) {
        try {
          const order = this.generateRandomOrder();
          await this.salesService.createOrder(order, `terminal-${terminalId}`);
          await this.randomDelay(60000 / config.ordersPerMinute);
        } catch (error) {
          console.error(`Terminal ${terminalId} error:`, error.message);
        }
      }
    };

    runOrders(); // Start processing orders

    return {
      stop: () => { stopped = true; }
    };
  }

  private async generateReport(): Promise<SimulationReport> {
    // Collect statistics from database
    const totalOrders = await this.prisma.salesOrder.count({
      where: {
        createdAt: { gte: this.report.startTime, lte: this.report.endTime }
      }
    });

    // Verify data integrity
    const inconsistencies = await this.verifyDataIntegrity();

    return {
      ...this.report,
      totalOrders,
      successfulOrders: totalOrders, // Simplified
      failedOrders: 0,
      averageResponseTime: 0,
      eventFiringStats: this.eventSpy.getStats(),
      raceConditionsDetected: 0,
      inconsistenciesFound: inconsistencies
    } as SimulationReport;
  }

  private async verifyDataIntegrity(): Promise<string[]> {
    const inconsistencies: string[] = [];

    // Check 1: Orders without stock deductions
    const ordersWithoutDeduction = await this.prisma.$queryRaw`
      SELECT o.id, o.order_number
      FROM sales_orders o
      LEFT JOIN inventory_movements m ON m.reference_id = o.id AND m.type = 'OUT'
      WHERE o.created_at >= $1
        AND o.status = 'COMPLETED'
        AND m.id IS NULL
    `;

    if (ordersWithoutDeduction.length > 0) {
      inconsistencies.push(
        `${ordersWithoutDeduction.length} orders without stock deductions`
      );
    }

    // Check 2: Orders without payments
    const ordersWithoutPayments = await this.prisma.$queryRaw`
      SELECT o.id, o.order_number
      FROM sales_orders o
      LEFT JOIN payments p ON p.order_id = o.id
      WHERE o.created_at >= $1
        AND o.status = 'PAID'
        AND p.id IS NULL
    `;

    if (ordersWithoutPayments.length > 0) {
      inconsistencies.push(
        `${ordersWithoutPayments.length} paid orders without payments`
      );
    }

    // Check 3: Negative stock
    const negativeStock = await this.prisma.inventoryItem.findMany({
      where: { quantityOnHand: { lt: 0 } }
    });

    if (negativeStock.length > 0) {
      inconsistencies.push(
        `${negativeStock.length} products with negative stock`
      );
    }

    return inconsistencies;
  }

  private generateRandomOrder() {
    const products = ['prod-1', 'prod-2', 'prod-3', 'prod-4', 'prod-5'];
    const itemCount = Math.floor(Math.random() * 5) + 1;

    const items = Array(itemCount).fill(null).map(() => ({
      productId: products[Math.floor(Math.random() * products.length)],
      quantity: Math.floor(Math.random() * 3) + 1,
      price: Math.floor(Math.random() * 100) + 10
    }));

    return {
      type: ['DINE_IN', 'TAKEAWAY', 'DELIVERY'][Math.floor(Math.random() * 3)],
      items
    };
  }

  private async randomDelay(ms: number) {
    const jitter = ms * 0.2; // 20% jitter
    const delay = ms + (Math.random() * jitter * 2) - jitter;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  private waitFor(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run simulation
async function main() {
  const simulator = new ProductionSimulator();
  await simulator.initialize();

  const config: SimulationConfig = {
    duration: 5, // 5 minutes
    terminals: 5,
    ordersPerMinute: 10,
    chaosMode: true
  };

  const report = await simulator.runSimulation(config);

  console.log('\n📊 SIMULATION REPORT');
  console.log(JSON.stringify(report, null, 2));

  if (report.inconsistenciesFound.length > 0) {
    console.log('\n⚠️  INCONSISTENCIES FOUND:');
    report.inconsistenciesFound.forEach(inc => console.log(`   - ${inc}`));
  }

  process.exit(report.inconsistenciesFound.length > 0 ? 1 : 0);
}

main();
```

**Tasks:**
- [ ] Create production simulation script
- [ ] Add data integrity verification
- [ ] Add event tracking
- [ ] Add report generation
- [ ] Add to package.json scripts

---

## Phase 7: CI/CD Integration (Week 8)

### 7.1 GitHub Actions Workflow

**File:** `.github/workflows/test.yml`

```yaml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test -- --testPathPattern=test/unit --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_DB: nerdpos_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run database migrations
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/nerdpos_test

      - name: Run integration tests
        run: npm run test -- --testPathPattern=test/integration
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/nerdpos_test

  negative-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_DB: nerdpos_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test

    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run negative test suite
        run: npm run test:negative
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/nerdpos_test

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: negative-test-results
          path: test-results/

  event-bus-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Test event bus integrity
        run: npm run test:event-bus

      - name: Verify event handlers
        run: npm run test:verify-handlers

  race-condition-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Test concurrent operations
        run: npm run test:concurrency

  performance-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run load tests
        run: npm run test:load

      - name: Upload performance report
        uses: actions/upload-artifact@v3
        with:
          name: performance-report
          path: performance-report.json
```

**Tasks:**
- [ ] Create CI/CD workflows
- [ ] Add test result artifacts
- [ ] Add coverage reporting
- [ ] Add performance benchmarks
- [ ] Add deployment gates

---

## Phase 8: Monitoring & Alerting (Week 8)

### 8.1 Event Bus Metrics Dashboard

**File:** `src/core/event-bus/metrics.service.ts`

```typescript
@Injectable()
export class EventBusMetricsService {
  private readonly metrics = new Map<string, EventMetric>();

  record(eventName: string, handler: string, duration: number, success: boolean) {
    const key = `${eventName}:${handler}`;
    if (!this.metrics.has(key)) {
      this.metrics.set(key, {
        eventName,
        handler,
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        totalDuration: 0,
        lastExecution: new Date(),
        lastFailure: null
      });
    }

    const metric = this.metrics.get(key)!;
    metric.totalExecutions++;
    metric.totalDuration += duration;
    metric.lastExecution = new Date();

    if (success) {
      metric.successfulExecutions++;
    } else {
      metric.failedExecutions++;
      metric.lastFailure = new Date();
    }
  }

  getMetrics() {
    return Array.from(this.metrics.values()).map(m => ({
      ...m,
      successRate: m.totalExecutions > 0
        ? m.successfulExecutions / m.totalExecutions
        : 0,
      averageDuration: m.totalExecutions > 0
        ? m.totalDuration / m.totalExecutions
        : 0
    }));
  }

  getCriticalFailures() {
    return this.getMetrics()
      .filter(m => m.failedExecutions > 0 && m.successRate < 0.95)
      .sort((a, b) => a.successRate - b.successRate);
  }
}
```

**Tasks:**
- [ ] Implement metrics collection
- [ ] Create monitoring dashboard API
- [ ] Add alerting for critical failures
- [ ] Integrate with logging system

---

## Task Breakdown

### Week 1 Tasks

| ID | Task | Priority | Owner | Status |
|----|------|----------|-------|--------|
| 1.1 | Create test database setup | P0 | DevOps | Pending |
| 1.2 | Create event spy helper | P0 | QA | Pending |
| 1.3 | Create race condition tester | P0 | QA | Pending |
| 1.4 | Create test data fixtures | P1 | QA | Pending |
| 1.5 | Update Jest configuration | P0 | QA | Pending |

### Week 2 Tasks

| ID | Task | Priority | Owner | Status |
|----|------|----------|-------|--------|
| 2.1 | Create endpoint discovery script | P0 | Backend | Pending |
| 2.2 | Generate endpoint catalog | P1 | Backend | Pending |
| 2.3 | Create Postman collection | P2 | QA | Pending |
| 2.4 | Organize test directory structure | P0 | QA | Pending |
| 2.5 | Create test template files | P1 | QA | Pending |

### Week 3 Tasks

| ID | Task | Priority | Owner | Status |
|----|------|----------|-------|--------|
| 3.1 | Implement INV-01 to INV-05 | P0 | QA | Pending |
| 3.2 | Implement FIN-01 to FIN-06 | P0 | QA | Pending |
| 3.3 | Fix event bus silent failures | P0 | Backend | Pending |
| 3.4 | Implement Dead Letter Queue | P0 | Backend | Pending |

### Week 4 Tasks

| ID | Task | Priority | Owner | Status |
|----|------|----------|-------|--------|
| 4.1 | Implement INV-06 to INV-10 | P0 | QA | Pending |
| 4.2 | Implement FIN-07 to FIN-12 | P0 | QA | Pending |
| 4.3 | Implement WF-01 to WF-05 | P0 | QA | Pending |
| 4.4 | Implement EB-01 to EB-05 | P0 | QA | Pending |

### Week 5 Tasks

| ID | Task | Priority | Owner | Status |
|----|------|----------|-------|--------|
| 5.1 | Implement WF-06 to WF-10 | P0 | QA | Pending |
| 5.2 | Implement EB-06 to EB-10 | P0 | QA | Pending |
| 5.3 | Implement SES-01 to SES-10 | P0 | QA | Pending |
| 5.4 | Implement MT-01 to MT-07 | P0 | QA | Pending |

### Week 6 Tasks

| ID | Task | Priority | Owner | Status |
|----|------|----------|-------|--------|
| 6.1 | Implement COMP-01 to COMP-07 | P0 | QA | Pending |
| 6.2 | Implement KDS-01 to KDS-06 | P0 | QA | Pending |
| 6.3 | Implement EXT-01 to EXT-15 | P1 | QA | Pending |
| 6.4 | Create event replay mechanism | P0 | Backend | Pending |

### Week 7 Tasks

| ID | Task | Priority | Owner | Status |
|----|------|----------|-------|--------|
| 7.1 | Create production simulation script | P0 | Backend | Pending |
| 7.2 | Add data integrity checks | P0 | Backend | Pending |
| 7.3 | Run initial simulation and fix bugs | P0 | All | Pending |
| 7.4 | Document all findings | P1 | QA | Pending |

### Week 8 Tasks

| ID | Task | Priority | Owner | Status |
|----|------|----------|-------|--------|
| 8.1 | Set up CI/CD pipelines | P0 | DevOps | Pending |
| 8.2 | Implement metrics dashboard | P1 | Backend | Pending |
| 8.3 | Add monitoring alerts | P1 | DevOps | Pending |
| 8.4 | Final regression testing | P0 | QA | Pending |
| 8.5 | Generate test coverage report | P1 | QA | Pending |

---

## Timeline & Milestones

| Week | Milestone | Deliverables | Success Criteria |
|------|-----------|--------------|------------------|
| 1 | Infrastructure | Test DB, helpers, Jest config | All helpers created and tested |
| 2 | Discovery | Endpoint catalog, test structure | All endpoints documented |
| 3 | Core Negative Tests | INV, FIN tests (50%) | Race conditions detected |
| 4 | Workflow & Event Bus | WF, EB tests | Silent failures fixed |
| 5 | Multi-Terminal & Sessions | SES, MT tests | Concurrent operations verified |
| 6 | Compliance & Edge Cases | COMP, KDS, EXT tests | All 150+ tests passing |
| 7 | Production Simulation | Sim script, integrity checks | Simulation runs without errors |
| 8 | CI/CD & Monitoring | Pipelines, metrics, alerts | Automated testing active |

---

## Success Criteria

### Coverage Goals
- [ ] Unit test coverage: 80%+
- [ ] Integration test coverage: 90%+
- [ ] E2E test coverage: 100% for critical workflows
- [ ] Negative test coverage: 100% (all 150+ scenarios)

### Quality Gates
- [ ] Zero race conditions in production simulation
- [ ] Zero data integrity inconsistencies
- [ ] Zero silent event handler failures
- [ ] All critical tests pass before deployment

### Performance Targets
- [ ] API response time: P95 < 200ms
- [ ] Event bus handler latency: P95 < 50ms
- [ ] Support 50+ transactions/minute/terminal
- [ ] Zero data loss during failures

---

## Next Steps

1. **Immediate (Today):**
   - Review and approve this plan
   - Set up test database
   - Create event spy helper

2. **This Week:**
   - Set up test infrastructure
   - Begin endpoint discovery
   - Start implementing INV-01

3. **Next Sprint:**
   - Complete all Phase 1-4 tasks
   - Fix critical event bus issues
   - Run first negative test suite

---

**Document Status:** Ready for Implementation
**Last Updated:** 2025-01-25
**Next Review:** After Week 4 milestone
