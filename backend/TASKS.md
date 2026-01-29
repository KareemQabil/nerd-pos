# NerdPOS - Complete Task List

**Branch:** `test/negative-test-suite`
**Goal:** Launch ready + Full negative test coverage
**Updated:** 2025-01-25

---

## PRIORITY LEGEND

- 🔴 **P0 - CRITICAL**: Must have for launch
- 🟠 **P1 - HIGH**: Important for quality, should have soon
- 🟡 **P2 - MEDIUM**: Nice to have, can defer
- 🔵 **P3 - LOW**: Backlog, do later

---

## LAUNCH BLOCKERS (P0) - Do These First ✓

### 1. TypeScript Compilation - COMPLETED ✓
- [x] Fix inventory.service.ts errors
- [x] Fix fifo.strategy.ts errors
- [x] Fix kitchen.repository.ts errors
- [x] Fix sales.repository.ts errors
- [x] Fix sales.service.ts errors
- [x] Fix swagger-examples.ts errors
- [x] Application code compiles with 0 errors

### 2. Application Starts Successfully
- [x] Verify `npm run start:dev` works ✅ 2026-01-28
- [ ] Fix any runtime errors
- [x] Verify database connection ✅ 2026-01-28
- [x] Verify all modules load ✅ 2026-01-28

### 3. Basic API Endpoints Work
- [x] Test health endpoint ✅ 2026-01-28
- [x] Test login endpoint ✅ 2026-01-28 (admin/nerdpos123)
- [ ] Test create order endpoint
- [ ] Verify responses return correctly

---

## WEEK 1: FOUNDATION (Days 1-7)

### 1.1 Test Database Setup (P0)
- [x] Create `docker-compose.test.yml`
  - [x] PostgreSQL service configuration
  - [x] Test database initialization
- [x] Add test scripts to package.json
  ```json
  "test:up": "docker-compose -f docker-compose.test.yml up -d",
  "test:down": "docker-compose -f docker-compose.test.yml down",
  "test:db:migrate": "npx prisma migrate deploy"
  ```
- [x] Configure test environment variables
- [x] Document `TEST_CONCURRENCY` for shared/remote DB (avoid Prisma transaction timeouts; recommend 12)
- [ ] Verify test database isolation

### 1.2 Test Helpers (P0)
- [ ] Create `test/helpers/event-spy.ts`
  - [ ] `EventSpy` class
  - [ ] `assertEventFired()` method
  - [ ] `assertEventNotFired()` method
  - [ ] `getEvents()` method
  - [ ] `reset()` method
  - [ ] `verifyEventOrder()` method
- [ ] Create `test/helpers/test-helpers.ts`
  - [ ] `createTestOrder()` helper
  - [ ] `createTestProduct()` helper
  - [ ] `createTestSession()` helper
  - [ ] `setupTestUser()` helper
  - [ ] `cleanupTestData()` helper
- [ ] Create `test/helpers/race-condition.ts`
  - [ ] `RaceConditionTester` class
  - [ ] `detectRaceCondition()` method
  - [ ] `simulateDualTerminalRequest()` method
  - [ ] `floodEndpoint()` method

### 1.3 Test Data Fixtures (P1)
- [x] Create `test/fixtures/products.json`
  - [x] Sample product data
  - [x] Product with modifiers
  - [ ] Product with variants
- [x] Create `test/fixtures/orders.json`
  - [x] Quick sale order
  - [x] Dine-in order
  - [ ] Delivery order
- [x] Create `test/fixtures/users.json`
  - [x] Admin user
  - [x] Cashier user
  - [x] Manager user
- [x] Create `test/fixtures/sessions.json`
  - [x] Open session
  - [x] Closed session with variance

### 1.4 Jest Configuration Update (P0)
- [ ] Update `jest.config.js`
  - [ ] Add test match patterns for negative tests
  - [ ] Configure coverage thresholds
  - [ ] Add module name mapper
  - [ ] Add setup files
- [x] Create `test/setup.ts`
  - [x] Global test setup
  - [x] Test database initialization
  - [x] Cleanup after tests
- [x] Create `test/teardown.ts`
  - [x] Global cleanup logic

---

## WEEK 2: DISCOVERY & ORGANIZATION (Days 8-14)

### 2.1 Endpoint Discovery (P1)
- [ ] Create `scripts/discover-endpoints.ts`
  - [ ] Scan all controllers
  - [ ] Extract route decorators
  - [ ] Extract DTO schemas
  - [ ] Generate catalog markdown
- [ ] Run discovery script
- [ ] Review `docs/ENDPOINT_CATALOG.md`
- [ ] Mark each endpoint with coverage status

### 2.2 Test Directory Structure (P0)
- [ ] Create directories:
  ```
  test/
  ├── unit/
  ├── integration/
  ├── negative/
  │   ├── inventory/
  │   ├── financial/
  │   ├── workflow/
  │   ├── event-bus/
  │   ├── sessions/
  │   ├── multi-terminal/
  │   ├── compliance/
  │   ├── kitchen/
  │   └── edge-cases/
  ├── e2e/
  ├── helpers/
  └── fixtures/
  ```
- [ ] Move existing tests to new structure
- [ ] Create README in each directory

### 2.3 Critical Test Templates (P0)
- [ ] Create `test/negative/inventory/template.spec.ts`
- [ ] Create `test/negative/financial/template.spec.ts`
- [ ] Create `test/negative/workflow/template.spec.ts`
- [ ] Create `test/negative/event-bus/template.spec.ts`

---

## WEEK 3-8: NEGATIVE TEST SUITE (Days 15-56)

### 3.1 INVENTORY TESTS (INV-01 to INV-10)

#### INV-01: Overselling Race Condition (P0) ✨ LAUNCH CRITICAL
- [ ] Create `test/negative/inventory/race-conditions.spec.ts`
- [ ] Test: Two terminals order same item simultaneously
  - [ ] Setup product with stock=3
  - [ ] Terminal A orders qty=5
  - [ ] Terminal B orders qty=5
  - [ ] Assert: Only one succeeds
  - [ ] Assert: Stock = 0 (not -2)
  - [ ] Assert: Only 1 StockDeducted event
  - [ ] Assert: Only 1 OrderCreated event

#### INV-02: Zero Stock Rejection (P0)
- [ ] Test: Order product with stock=0
  - [ ] Expect 400 Bad Request
  - [ ] Assert: No OrderCreated event
  - [ ] Assert: No StockDeducted event
  - [ ] Assert: Stock remains 0

#### INV-03: Double Stock Deduction (P0)
- [ ] Test: Send same order twice rapidly
  - [ ] First: 201 Created
  - [ ] Second: 409 Conflict
  - [ ] Assert: Stock deducted once only

#### INV-04: Negative Stock Adjustment (P1)
- [ ] Test: Adjust stock with negative amount
  - [ ] Current stock: 10
  - [ ] Adjustment: -999
  - [ ] Expect: 400 Bad Request

#### INV-05: Empty Warehouse Transfer (P1)
- [ ] Test: Transfer from warehouse with 0 stock
  - [ ] From: WH-A (stock=0)
  - [ ] To: WH-B
  - [ ] Expect: 400 Bad Request

#### INV-06: Invalid Product ID (P1)
- [ ] Test: Receive stock with fake product ID
  - [ ] ProductId: all zeros
  - [ ] Expect: 404 Not Found

#### INV-07: Concurrent Warehouse Transfer (P1)
- [ ] Test: Two transfers from same source
  - [ ] WH-A stock: 10
  - [ ] Transfer A: 10 to WH-B
  - [ ] Transfer B: 10 to WH-C
  - [ ] Assert: Only one succeeds

#### INV-08: Modify Product During Sale (P2)
- [ ] Test: Change price while order pending
  - [ ] Create pending order
  - [ ] Update product price
  - [ ] Assert: Pending order keeps old price
  - [ ] Assert: New orders use new price

#### INV-09: Delete Product With Stock (P1)
- [ ] Test: Delete product that has stock
  - [ ] Product stock: 50
  - [ ] Expect: 400 Bad Request

#### INV-10: Direct Service Call Bypass (P2)
- [ ] Document: Stock deduction only via OrderCreated
  - [ ] Verify: No direct deductStock endpoint exposed
  - [ ] Verify: All paths go through order creation

### 3.2 FINANCIAL TESTS (FIN-01 to FIN-12)

#### FIN-01: Split Payment Rounding (P0) ✨ LAUNCH CRITICAL
- [x] Create `test/negative/financial/split-payment-rounding.spec.ts`
- [x] Test: 10.00 / 3 split
  - [x] Payment 1: 3.33
  - [x] Payment 2: 3.33
  - [x] Payment 3: 3.34 (absorbs remainder)
  - [x] Assert: Total = 10.00
  - [ ] Assert: Order status = PAID (pending: order/payment linkage)

#### FIN-02: Discount > Total (P0)
- [ ] Test: Apply 100 discount on 50 order (pending: discount engine)
  - [ ] Expect: 400 Bad Request
  - [ ] Assert: No order created

#### FIN-03: Double Refund (P0)
- [ ] Test: Refund same item twice (skipped: refund model not in schema)
  - [ ] First refund: Success
  - [ ] Second refund: 400 Bad Request
  - [ ] Assert: Refunded once only

#### FIN-04: Negative Price (P0)
- [x] Test: Create product with price=-10
  - [x] Expect: 400 Bad Request

#### FIN-05: Zero Total Order (P1)
- [ ] Test: Order with all items price=0
  - [ ] Expect: 201 Created
  - [ ] Assert: Total = 0.00
  - [ ] Assert: Stock still deducted

#### FIN-06: Payment > Total (P0)
- [ ] Test: Pay 100 on 50 order (pending: enforcement in PaymentsService)
  - [ ] Expect: 400 Bad Request

#### FIN-07: Tax Rounding (P0) ✨ LAUNCH CRITICAL
- [x] Create `test/negative/financial/tax-calculation.spec.ts`
- [x] Test: 3 items × 10.00, 15% VAT
  - [x] Expected tax: 4.50
  - [x] Assert: Exact precision (Decimal.js)
  - [x] Assert: NOT 4.49 or 4.51

#### FIN-08: Void Paid Order (P1)
- [ ] Test: Void order that's already paid (pending: paid cancellation rule)
  - [ ] Expect: 400 Bad Request
  - [ ] Assert: No automatic refund

#### FIN-09: Refund Overage (P1)
- [ ] Test: Refund 150 from 100 order (pending: refund model)
  - [ ] Expect: 400 Bad Request

#### FIN-10: Takeaway Service Charge (P0)
- [x] Test: Service charge on TAKEAWAY
  - [x] Expect: Service charge = 0.00
  - [x] Assert: Only DINE_IN has service charge

#### FIN-11: Currency Mismatch (P2)
- [ ] Test: Pay USD on SAR order (pending: currency support)
  - [ ] Expect: 400 Bad Request

#### FIN-12: Session Variance (P1)
- [ ] Test: Close session with shortfall
  - [ ] Expected: 500
  - [ ] Counted: 450
  - [ ] Assert: Variance = -50 recorded

### 3.3 WORKFLOW TESTS (WF-01 to WF-10)

#### WF-01: Add Item to Paid Order (P0)
- [ ] Create `test/negative/workflow/state-jumping.spec.ts`
- [ ] Test: Add item to PAID order
  - [ ] Expect: 400 Bad Request
  - [ ] Assert: No OrderItemAdded event

#### WF-02: Empty Order to Kitchen (P1)
- [ ] Test: Send empty order to kitchen
  - [ ] Expect: 400 Bad Request
  - [ ] Assert: No KitchenTicketCreated event

#### WF-03: Complete Completed Order (P1)
- [ ] Test: Mark COMPLETED order as complete
  - [ ] Expect: 400 Bad Request
  - [ ] Assert: No duplicate event

#### WF-04: Pay Cancelled Order (P0)
- [ ] Test: Pay CANCELLED order
  - [ ] Expect: 400 Bad Request
  - [ ] Assert: No PaymentReceived event

#### WF-05: Cancel Paid Order (P0)
- [ ] Test: Cancel PAID order
  - [ ] Expect: 400 Bad Request
  - [ ] Assert: No OrderCancelled event

#### WF-06: Modify Served Ticket (P1)
- [ ] Test: Modify SERVED kitchen ticket
  - [ ] Expect: 400 Bad Request

#### WF-07: Reopen Closed Session (P0)
- [ ] Test: Reopen CLOSED session
  - [ ] Expect: 400 Bad Request

#### WF-08: Pay Voided Order (P1)
- [ ] Test: Pay VOIDED order
  - [ ] Expect: 400 Bad Request

#### WF-09: Add Items After Kitchen (P2)
- [ ] Test: Add item to PREPARING order
  - [ ] Business rule decision needed
  - [ ] Implement accordingly

#### WF-10: State Transition Validation (P0)
- [ ] Test: COMPLETED → PENDING transition
  - [ ] Expect: 400 Bad Request
  - [ ] Verify state machine enforces rules

### 3.4 EVENT BUS TESTS (EB-01 to EB-10)

#### EB-01: Stock Deduction Failure (P0) ✨ LAUNCH CRITICAL
- [ ] Create `test/negative/event-bus/silent-failures.spec.ts`
- [ ] Test: OrderCreated but stock not deducted
  - [ ] Mock failing handler
  - [ ] Detect data inconsistency
  - [ ] Verify alert mechanism

#### EB-02: Loyalty Points Failure (P2)
- [ ] Test: Payment succeeds but points not awarded
  - [ ] Mock failing loyalty handler
  - [ ] Verify payment still recorded
  - [ ] Verify points = 0

#### EB-03: Kitchen Ticket Failure (P0)
- [ ] Test: Order created but no kitchen ticket
  - [ ] Mock failing kitchen handler
  - [ ] Verify order exists
  - [ ] Verify ticket = NULL

#### EB-04: Audit Log Failure (P1)
- [ ] Test: Session closed but no audit log
  - [ ] Mock failing audit handler
  - [ ] Verify session closed
  - [ ] Verify no audit entry

#### EB-05: ZATCA Invoice Failure (P0) ✨ LAUNCH CRITICAL
- [ ] Test: Order created but no invoice
  - [ ] Mock failing compliance handler
  - [ ] Detect invoice = NULL
  - [ ] Alert on compliance failure

#### EB-06: Multiple Handlers Fail (P0)
- [ ] Test: All handlers fail simultaneously
  - [ ] Mock: Inventory + Kitchen + Loyalty fail
  - [ ] Assert: Transaction rolls back
  - [ ] Assert: No partial data

#### EB-07: DLQ Overflow (P1)
- [ ] Test: Flood with 1000 failed events
  - [ ] Expect: 503 Service Unavailable
  - [ ] Verify DLQ has max size
  - [ ] Verify oldest dropped or alerted

#### EB-08: Event Replay Idempotency (P1)
- [ ] Test: Replay already processed event
  - [ ] Assert: No duplicate effects
  - [ ] Assert: Event ID checked

#### EB-09: Out of Order Events (P2)
- [ ] Test: PaymentReceived before OrderCreated
  - [ ] Assert: Payment waits for order
  - [ ] Or: Events queued

#### EB-10: Handler Timeout (P2)
- [ ] Test: Handler takes 30+ seconds
  - [ ] Assert: Order created immediately
  - [ ] Assert: Kitchen ticket async

### 3.5 SESSION TESTS (SES-01 to SES-10)

#### SES-01: Duplicate Open Session (P0)
- [ ] Create `test/negative/sessions/duplicate-open.spec.ts`
- [ ] Test: Open session while one exists
  - [ ] Expect: 400 Bad Request
  - [ ] Assert: Only 1 open session

#### SES-02: Order Without Session (P0) ✨ LAUNCH CRITICAL
- [ ] Test: Create order without sessionId
  - [ ] Expect: 400 Bad Request
  - [ ] Error: "Session required"

#### SES-03: Close with Pending Orders (P0)
- [ ] Test: Close session with PENDING orders
  - [ ] Expect: 400 Bad Request

#### SES-04: Negative Opening Balance (P0)
- [ ] Test: Open session with balance=-100
  - [ ] Expect: 400 Bad Request

#### SES-05: Denomination Mismatch (P1)
- [ ] Test: Close with wrong denominations
  - [ ] Expected: 500
  - [ ] Denominations: 480
  - [ ] Expect: 400 Bad Request

#### SES-06: Cross-Terminal Session (P1)
- [ ] Test: Two terminals use same session
  - [ ] Terminal A: Creates order
  - [ ] Terminal B: Uses same session
  - [ ] Expect: 400 Bad Request

#### SES-07: Close Session Twice (P1)
- [ ] Test: Send close request twice
  - [ ] First: 200 OK
  - [ ] Second: 400 Bad Request

#### SES-08: Modify Closed Session (P0)
- [ ] Test: Modify denominations after close
  - [ ] Expect: 400 Bad Request

#### SES-09: Cash Transfer (P2)
- [ ] Test: Transfer cash between sessions
  - [ ] Expect: 400 Bad Request
  - [ ] Verify sessions isolated

#### SES-10: Currency Mismatch (P2)
- [ ] Test: Close session in different currency
  - [ ] Expect: 400 Bad Request

### 3.6 MULTI-TERMINAL TESTS (MT-01 to MT-07)

#### MT-01: Concurrent Order Modification (P1)
- [ ] Create `test/negative/multi-terminal/conflicts.spec.ts`
- [ ] Test: Two terminals add items to same order
  - [ ] Terminal A: Add item X
  - [ ] Terminal B: Add item Y
  - [ ] Assert: Both added OR conflict detected

#### MT-02: Pay Same Order Twice (P0) ✨ LAUNCH CRITICAL
- [ ] Test: Two terminals pay same order
  - [ ] Terminal A: Pay 100
  - [ ] Terminal B: Pay 100
  - [ ] Assert: Only one succeeds
  - [ ] Assert: Order = PAID (not OVERPAID)

#### MT-03: Delete Product In Use (P1)
- [ ] Test: Delete product while in use
  - [ ] Terminal A: Creating order with product
  - [ ] Terminal B: Deletes product
  - [ ] Expect: 400 Bad Request

#### MT-04: Concurrent Price Change (P1)
- [ ] Test: Two terminals update price
  - [ ] Terminal A: Price = 50
  - [ ] Terminal B: Price = 60
  - [ ] Assert: One wins (not undefined)

#### MT-05: Transfer Same Stock Twice (P0)
- [ ] Test: Two transfers from same warehouse
  - [ ] WH-A stock: 10
  - [ ] Transfer A: 10 to WH-B
  - [ ] Transfer B: 10 to WH-C
  - [ ] Assert: Only one succeeds

#### MT-06: Kitchen Status Conflict (P1)
- [ ] Test: Two terminals update same ticket
  - [ ] Terminal A: Mark PREPARING
  - [ ] Terminal B: Mark READY
  - [ ] Assert: Valid transition followed

#### MT-07: Concurrent Session Close (P1)
- [ ] Test: Two managers close same session
  - [ ] First: 200 OK
  - [ ] Second: 400 Bad Request

### 3.7 COMPLIANCE TESTS (COMP-01 to COMP-07)

#### COMP-01: ZATCA Hash Chain (P0) ✨ LAUNCH CRITICAL
- [x] Create `test/negative/compliance/hash-chain.spec.ts`
- [x] Test: Tamper with previousHash
  - [x] Expect: 500 Internal Server Error
  - [ ] Assert: Order creation blocked
  - [ ] Assert: Admin alerted

#### COMP-02: Invoice Without Order (P0)
- [ ] Test: Generate invoice without order (skipped - order validation missing)
  - [ ] Expect: 400 Bad Request

#### COMP-03: Delete Audit Log (P0)
- [ ] Test: DELETE audit log entry (skipped - no delete endpoint)
  - [ ] Expect: 403 Forbidden
  - [ ] Assert: Logs immutable

#### COMP-04: Backdated Transaction (P0)
- [ ] Test: Create order with past timestamp (skipped - rule not implemented)
  - [ ] createdAt: "2023-01-01"
  - [ ] Expect: 400 Bad Request

#### COMP-05: Invoice Without Tax ID (P1)
- [ ] Test: B2B order without taxId (skipped - rule not implemented)
  - [ ] Check if mandatory
  - [ ] Implement accordingly

#### COMP-06: Modify Invoice (P0)
- [ ] Test: PATCH invoice after generation (skipped - no endpoint)
  - [ ] Expect: 403 Forbidden

#### COMP-07: Regenerate Invoice (P2)
- [ ] Test: Force new hash on invoice (skipped - no endpoint)
  - [ ] Expect: 403 Forbidden

### 3.8 KITCHEN TESTS (KDS-01 to KDS-06)

#### KDS-01: Non-Existent Station (P1)
- [ ] Create `test/negative/kitchen/station.spec.ts`
- [ ] Test: Send ticket to fake station
  - [ ] Expect: 404 Not Found

#### KDS-02: Complete Empty Ticket (P1)
- [ ] Test: Mark empty ticket as complete
  - [ ] Expect: 400 Bad Request

#### KDS-03: Skip PREPARING State (P1)
- [ ] Test: PENDING → READY (skip PREPARING)
  - [ ] Expect: 400 Bad Request
  - [ ] Assert: State machine enforced

#### KDS-04: Modify Completed Ticket (P1)
- [ ] Test: Modify COMPLETED ticket
  - [ ] Expect: 400 Bad Request

#### KDS-05: Multi-Station Item (P2)
- [ ] Test: Item requires 3 stations
  - [ ] Assert: Appears on all 3 displays
  - [ ] Assert: Coordination required

#### KDS-06: Delete Active Station (P1)
- [ ] Test: Delete station with tickets
  - [ ] Expect: 400 Bad Request

### 3.9 EDGE CASES (EXT-01 to EXT-15)

#### EXT-01: Million Item Order (P2)
- [ ] Create `test/negative/edge-cases/chaos.spec.ts`
- [ ] Test: Order with 1,000,000 items
  - [ ] Expect: 400 Bad Request

#### EXT-02: SQL Injection (P0)
- [ ] Test: Product name = SQL injection
  - [ ] name: "'; DROP TABLE products; --"
  - [ ] Assert: Sanitized or rejected
  - [ ] Assert: Products table intact

#### EXT-03: Max Price (P2)
- [ ] Test: Price = MAX_SAFE_INTEGER
  - [ ] Expect: 400 Bad Request

#### EXT-04: Tiny Price (P2)
- [ ] Test: Price = 0.000000001
  - [ ] Expect: Rounded to 0.00

#### EXT-05: Unicode SKU (P2)
- [ ] Test: SKU = emoji
  - [ ] sku: "🍕🍔🌮"
  - [ ] Assert: Accepted or rejected

#### EXT-06: Long Name (P2)
- [ ] Test: Customer name = 10,000 chars
  - [ ] Expect: 400 Bad Request

#### EXT-07: DDoS Protection (P1)
- [ ] Test: 1000 requests in 1 second
  - [ ] Expect: 429 Too Many Requests

#### EXT-08: Circular Category (P2)
- [ ] Test: Category A → B, B → A
  - [ ] Expect: 400 Bad Request

#### EXT-09: Expensive Modifier (P2)
- [ ] Test: Modifier > product price
  - [ ] Product: 10 SAR
  - [ ] Modifier: 50 SAR
  - [ ] Assert: Allowed

#### EXT-10: Delete All Products (P0)
- [ ] Test: DELETE /products (bulk)
  - [ ] Expect: 403 Forbidden

#### EXT-11: Future Timestamp (P0)
- [ ] Test: createdAt in future
  - [ ] Expect: 400 Bad Request

#### EXT-12: Zero Quantity (P0)
- [ ] Test: Item quantity = 0
  - [ ] Expect: 400 Bad Request

#### EXT-13: Refund Excess (P1)
- [ ] Test: Refund 150 from 100 order
  - [ ] Expect: 400 Bad Request

#### EXT-14: Multi-Category Product (P2)
- [ ] Test: Product in 3 categories
  - [ ] Assert: Allowed or enforced

#### EXT-15: Item Without Product (P0)
- [ ] Test: Order item with productId=null
  - [ ] Expect: 400 Bad Request

---

## WEEK 3: CRITICAL FIXES (Days 15-21)

### 4.1 Event Bus Fixes (P0) ✨ LAUNCH CRITICAL
- [ ] Update `src/core/event-bus/event-bus.service.ts`
  - [ ] Add failure tracking
  - [ ] Remove silent catch blocks
  - [ ] Add error logging
  - [ ] Add metrics publishing
- [ ] Add Dead Letter Queue
  - [ ] Create Prisma model
  - [ ] Create DLQ service
  - [ ] Add retry mechanism
- [ ] Add event monitoring
  - [ ] Track handler execution time
  - [ ] Track failure rates
  - [ ] Add critical event alerts

### 4.2 Race Condition Protection (P0) ✨ LAUNCH CRITICAL
- [ ] Add database row-level locking
  - [ ] SELECT FOR UPDATE on stock checks
  - [ ] Transaction isolation levels
- [ ] Add optimistic locking
  - [ ] Version fields on critical entities
  - [ ] Conflict detection
- [ ] Add idempotency keys
  - [ ] Generate for orders
  - [ ] Check before processing

### 4.3 Transaction Wrappers (P0) ✨ LAUNCH CRITICAL
- [ ] Review all service methods
  - [ ] Add $transaction to critical paths
  - [ ] Order creation
  - [ ] Payment processing
  - [ ] Stock deduction
  - [ ] Session closing

---

## WEEK 4-5: TEST IMPLEMENTATION (Days 22-35)

### 5.1 Write All Tests (P0)
- [ ] Implement all 150+ test scenarios
  - [ ] Use test templates
  - [ ] Follow patterns from examples
  - [ ] Each test = 1 scenario
- [ ] Run tests continuously
  - [ ] Fix failures as they appear
  - [ ] Document workarounds
  - [ ] Update plan as needed

### 5.2 Test Data Management
- [ ] Create seed data script
  - [ ] Products, categories, modifiers
  - [ ] Users, roles, permissions
  - [ ] Warehouses, inventory
- [ ] Create cleanup script
  - [ ] Run after each test
  - [ ] Run after test suite

---

## WEEK 6: PRODUCTION SIMULATION (Days 36-42)

### 6.1 Production Simulator (P1)
- [ ] Create `scripts/production-simulation.ts`
  - [ ] Multi-terminal simulation
  - [ ] Realistic order patterns
  - [ ] Random delays
  - [ ] Chaos mode
- [ ] Add data integrity checks
  - [ ] Orders without deductions
  - [ ] Payments without orders
  - [ ] Negative stock detection
- [ ] Add report generation
  - [ ] Success/failure rates
  - [ ] Response times
  - [ ] Event statistics
  - [ ] Inconsistency list

### 6.2 Load Testing (P2)
- [ ] Run production simulator
  - [ ] Start with 5 minutes
  - [ ] Scale to 60 minutes
  - [ ] Analyze results
- [ ] Fix issues found
  - [ ] Race conditions
  - [ ] Deadlocks
  - [ ] Performance bottlenecks

---

## WEEK 7: CI/CD SETUP (Days 43-49)

### 7.1 GitHub Actions (P1)
- [ ] Create `.github/workflows/test.yml`
  - [ ] Unit tests job
  - [ ] Integration tests job
  - [ ] Negative tests job
  - [ ] Event bus tests job
  - [ ] Race condition tests job
- [ ] Add coverage reporting
  - [ ] Codecov integration
  - [ ] HTML reports
  - [ ] Trends over time
- [ ] Add deployment gates
  - [ ] Tests must pass
  - [ ] Coverage must be >80%
  - [ ] No critical failures

### 7.2 Test Artifacts (P1)
- [ ] Upload test results
  - [ ] JUnit XML
  - [ ] JSON reports
  - [ ] Coverage HTML
- [ ] Store artifacts
  - [ ] 30-day retention
  - [ ] Downloadable links

---

## WEEK 8: MONITORING & FINALIZATION (Days 50-56)

### 8.1 Metrics Dashboard (P2)
- [ ] Create metrics service
  - [ ] Track event bus stats
  - [ ] Track handler performance
  - [ ] Track failure rates
- [ ] Create dashboard endpoints
  - [ ] GET /metrics/event-bus
  - [ ] GET /metrics/handlers
  - [ ] GET /metrics/failures
- [ ] Add alerting
  - [ ] Critical event failures
  - [ | High error rates
  - [ ] Data inconsistencies

### 8.2 Documentation (P1)
- [ ] Update README
  - [ ] How to run tests
  - [ ] How to write tests
  - [ ] Test conventions
- [ ] Update TEST_COMPREHENSIVE_PLAN.md
  - [ ] Mark completed tasks
  - [ ] Add lessons learned
  - [ ] Add known issues

### 8.3 Final Regression (P0)
- [ ] Run full test suite
  - [ ] All 150+ tests
  - [ ] Fix any failures
- [ ] Run production simulation
  - [ ] 60-minute simulation
  - [ ] Verify no inconsistencies
- [ ] Sign-off for launch
  - [ ] All P0 tests passing
  - [ ] Coverage targets met
  - [ ] No critical bugs

---

## QUICK START: Launch Today (Do These First)

### Right Now (30 minutes)
- [ ] 1. Run `npm run start:dev`
  - [ ] Fix any startup errors
  - [ ] Verify server starts
- [ ] 2. Test basic endpoints
  - [ ] GET /health
  - [ ] POST /auth/login
  - [ ] POST /api/v1/orders
- [ ] 3. Create test helpers
  - [ ] `test/helpers/event-spy.ts`
  - [ ] `test/helpers/test-helpers.ts`
- [ ] 3a. Run negative inventory tests with `TEST_CONCURRENCY=12` on shared/remote DB

### Today (2 hours)
- [ ] 4. Fix event bus silent failures
  - [ ] Update event-bus.service.ts
  - [ ] Add proper error handling
- [ ] 5. Add transaction wrappers
  - [ ] Order creation
  - [ ] Payment processing
- [ ] 6. Write first critical tests
  - [ ] INV-01 (Overselling)
  - [ ] FIN-07 (Tax rounding)
  - [ ] SES-02 (Order without session)

### This Week (10 hours)
- [ ] 7. Complete all P0 tests
  - [ ] Launch critical scenarios
  - [ ] Verify they pass
- [ ] 8. Add race condition protection
  - [ ] Row-level locking
  - [ ] Idempotency keys
- [ ] 9. Test production deployment
  - [ ] Run smoke tests
  - [ ] Verify data integrity

### Launch Ready When:
- [x] TypeScript compiles (0 errors)
- [ ] Application starts successfully
- [ ] All P0 tests passing
- [ ] No race conditions detected
- [ ] Event bus failures tracked
- [ ] Transactions atomic
- [ ] Basic monitoring in place

---

## SUMMARY

**Total Tasks:** ~200
**Estimated Time:** 8 weeks
**Launch Ready:** Week 3-4 (after P0 tasks)
**Full Completion:** Week 8

**Progress:**
- [x] TypeScript fixes
- [x] Day 4 (Payments) complete — 2026-01-28
- [x] Day 5 (Compliance + Reports) complete — 2026-01-28
- [ ] Test infrastructure
- [ ] Negative test suite
- [ ] Event bus fixes
- [ ] Production simulation
- [ ] CI/CD setup
- [ ] Monitoring

**Next Action:** Start with "Quick Start: Launch Today" tasks above

