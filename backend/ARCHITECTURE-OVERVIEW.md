# NerdPOS Architecture Overview
## LEGO Pattern System Architecture

**Purpose**: Understand the modular, plugin-based, event-driven architecture  
**Audience**: Architects, Senior Developers, Technical Leads  
**Reading Time**: 15 minutes

---

## **TABLE OF CONTENTS**

1. [System Philosophy](#system-philosophy)
2. [LEGO Pattern Explained](#lego-pattern-explained)
3. [Core Architectural Patterns](#core-architectural-patterns)
4. [Module Organization](#module-organization)
5. [Data Flow](#data-flow)
6. [Technology Stack](#technology-stack)
7. [Design Principles](#design-principles)

---

## **SYSTEM PHILOSOPHY**

### **What Makes NerdPOS Different**

NerdPOS is built on the **LEGO Architecture** pattern - a modular, plugin-based system where:
- **Every module is a LEGO brick** - Self-contained, interchangeable
- **Event Bus is the connector** - Modules communicate via events, not direct calls
- **Plugins can be enabled/disabled** - Via environment variables
- **Domain-driven design** - Business logic organized by domain

### **Core Tenets**

1. **Modularity** - Each module is independent
2. **Extensibility** - Add features without touching core
3. **Maintainability** - Change one module without breaking others
4. **Testability** - Test modules in isolation
5. **Scalability** - Modules can be split into microservices later

---

## **LEGO PATTERN EXPLAINED**

### **Traditional Monolith (BAD)**

```
┌─────────────────────────────────┐
│        All Code Mixed           │
│  ┌────────┬────────┬────────┐  │
│  │Service │Service │Service │  │
│  │   ↕    │   ↕    │   ↕    │  │
│  │Direct  │Direct  │Direct  │  │
│  │Calls   │Calls   │Calls   │  │
│  └────────┴────────┴────────┘  │
│   Everything depends on         │
│   everything else               │
└─────────────────────────────────┘
```
**Problems**: Tight coupling, hard to test, hard to change

---

### **LEGO Architecture (GOOD)**

```
┌─────────────────────────────────────────────────┐
│              EVENT BUS (Connector)              │
│           ═══════════════════════               │
└────┬────────┬────────┬────────┬────────┬───────┘
     │        │        │        │        │
     ▼        ▼        ▼        ▼        ▼
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│Products│ │Inventory│ │ Sales │ │Payments│ │Kitchen│
│ Module │ │ Module │ │ Module │ │ Module │ │ Module │
│        │ │        │ │        │ │        │ │        │
│@Plugin │ │@Plugin │ │@Plugin │ │@Plugin │ │@Plugin │
└────────┘ └────────┘ └────────┘ └────────┘ └────────┘
   LEGO       LEGO       LEGO       LEGO       LEGO
   Brick      Brick      Brick      Brick      Brick
```

**Benefits**: 
- Modules don't know about each other
- Communication via events only
- Can enable/disable any module
- Easy to test in isolation

---

### **How It Works**

**1. Module publishes event:**
```typescript
// In SalesService
await this.eventBus.publish('OrderCreated', {
  orderId: 'order-123',
  items: [{ productId: 'p1', quantity: 2 }]
});
```

**2. Other modules listen:**
```typescript
// In InventoryModule
@EventHandler('OrderCreated')
export class InventoryDeductionHandler {
  async handle(event: OrderCreatedEvent) {
    // Deduct stock
    await this.inventoryService.deduct(event.items);
  }
}

// In KitchenModule
@EventHandler('OrderCreated')
export class KitchenTicketHandler {
  async handle(event: OrderCreatedEvent) {
    // Send to kitchen display
    await this.kitchenService.createTicket(event);
  }
}
```

**3. Event Bus routes automatically:**
```
OrderCreated Event
       │
       ├─→ InventoryDeductionHandler (deducts stock)
       ├─→ KitchenTicketHandler (creates ticket)
       ├─→ AuditLogHandler (logs event)
       └─→ ReportingHandler (updates stats)
```

---

## **CORE ARCHITECTURAL PATTERNS**

### **1. Repository Pattern**

**Purpose**: Abstract database access, no direct Prisma in services

```typescript
// ❌ WRONG - Direct Prisma
export class ProductService {
  constructor(private prisma: PrismaClient) {}
  
  async getProducts() {
    return this.prisma.product.findMany(); // BAD
  }
}

// ✅ CORRECT - Repository Pattern
export class ProductRepository extends BaseRepository<Product> {
  async findByCategory(categoryId: string) {
    return this.prisma.product.findMany({ where: { categoryId } });
  }
}

export class ProductService {
  constructor(private productRepo: ProductRepository) {}
  
  async getProducts() {
    return this.productRepo.findAll(); // GOOD
  }
}
```

**Benefits**:
- Easy to mock in tests
- Can swap database later
- Business logic separated from data access

---

### **2. Event Bus Pattern**

**Purpose**: Decouple modules via asynchronous events

```typescript
// Event definition
export class OrderCreatedEvent extends DomainEvent {
  constructor(
    public readonly orderId: string,
    public readonly items: OrderItem[]
  ) {
    super();
  }
}

// Publisher
EventBus.publish('OrderCreated', new OrderCreatedEvent(orderId, items));

// Subscriber
@EventHandler('OrderCreated')
export class InventoryHandler implements IEventHandler<OrderCreatedEvent> {
  async handle(event: OrderCreatedEvent): Promise<void> {
    // Handle event
  }
}
```

**Benefits**:
- Modules don't depend on each other
- Easy to add new handlers
- Natural async processing

---

### **3. Calculation Pipeline Pattern**

**Purpose**: Step-by-step calculations with extensibility

```typescript
export interface ICalculationStep {
  order: number;        // 10, 20, 30... determines execution order
  execute(context: CalculationContext): Promise<CalculationContext>;
}

// Step 1: Calculate item subtotal
@CalculationStep(10)
export class ItemSubtotalStep implements ICalculationStep {
  async execute(ctx: CalculationContext) {
    ctx.itemSubtotal = ctx.items.reduce((sum, item) => 
      sum.plus(item.price.times(item.quantity)), new Decimal(0)
    );
    return ctx;
  }
}

// Step 2: Calculate service charge
@CalculationStep(20)
export class ServiceChargeStep implements ICalculationStep {
  async execute(ctx: CalculationContext) {
    if (ctx.orderType === 'DINE_IN') {
      ctx.serviceCharge = ctx.itemSubtotal.times(0.12);
    }
    return ctx;
  }
}

// Pipeline runner
const result = await pipelineRunner.execute(steps, initialContext);
```

**7-Step Calculation Pipeline**:
```
1. Item Subtotal      (order: 10)
2. Service Charge     (order: 20)
3. Delivery Charge    (order: 30)
4. Subtotal Before Tax(order: 40)
5. Tax Amount         (order: 50)
6. Discount Amount    (order: 60)
7. Grand Total        (order: 70)
```

---

### **4. Workflow (Saga) Pattern**

**Purpose**: Multi-step business processes with rollback

```typescript
export interface IWorkflowStep {
  execute(context: WorkflowContext): Promise<WorkflowContext>;
  rollback(context: WorkflowContext): Promise<void>;
}

// Step 1: Reserve inventory
export class ReserveInventoryStep implements IWorkflowStep {
  async execute(ctx: WorkflowContext) {
    await this.inventoryService.reserve(ctx.items);
    ctx.inventoryReserved = true;
    return ctx;
  }
  
  async rollback(ctx: WorkflowContext) {
    if (ctx.inventoryReserved) {
      await this.inventoryService.release(ctx.items);
    }
  }
}

// Step 2: Charge payment
export class ChargePaymentStep implements IWorkflowStep {
  async execute(ctx: WorkflowContext) {
    await this.paymentService.charge(ctx.paymentDetails);
    ctx.paymentCharged = true;
    return ctx;
  }
  
  async rollback(ctx: WorkflowContext) {
    if (ctx.paymentCharged) {
      await this.paymentService.refund(ctx.paymentDetails);
    }
  }
}

// Workflow orchestrator
try {
  for (const step of steps) {
    context = await step.execute(context);
  }
} catch (error) {
  // Rollback in reverse order
  for (let i = steps.length - 1; i >= 0; i--) {
    await steps[i].rollback(context);
  }
  throw error;
}
```

---

### **5. Rule Engine Pattern**

**Purpose**: Pluggable business rules validation

```typescript
export interface IBusinessRule {
  priority: number;     // Higher = executed first
  check(context: RuleContext): Promise<RuleResult>;
}

// Rule 1: Minimum order amount
@BusinessRule(100)
export class MinimumOrderRule implements IBusinessRule {
  async check(ctx: RuleContext): Promise<RuleResult> {
    if (ctx.orderTotal.lessThan(50)) {
      return RuleResult.failure('Minimum order is 50 SAR');
    }
    return RuleResult.success();
  }
}

// Rule 2: Stock availability
@BusinessRule(200)
export class StockAvailabilityRule implements IBusinessRule {
  async check(ctx: RuleContext): Promise<RuleResult> {
    for (const item of ctx.items) {
      const stock = await this.inventoryRepo.getStock(item.productId);
      if (stock < item.quantity) {
        return RuleResult.failure(`Insufficient stock for ${item.name}`);
      }
    }
    return RuleResult.success();
  }
}

// Rule engine
const results = await ruleEngine.validate(rules, context);
if (!results.isValid) {
  throw new ValidationException(results.errors);
}
```

---

## **MODULE ORGANIZATION**

### **19 Modules Structure**

```
src/
├── modules/
│   ├── products/          (01) ← Categories, Products, Modifiers
│   ├── inventory/         (02) ← Warehouse, Batches, FIFO
│   ├── sales/             (03) ← Orders, Transactions
│   ├── payments/          (04) ← Payment methods, Splits
│   ├── sessions/          (05) ← Register sessions
│   ├── tables/            (06) ← Floor plan, Table management
│   ├── kitchen/           (07) ← Kitchen Display System
│   ├── customers/         (08) ← Customer data, Loyalty
│   ├── delivery/          (09) ← Zones, Drivers
│   ├── discounts/         (10) ← Promotions, Coupons
│   ├── users/             (11) ← Users, Roles, Auth
│   ├── settings/          (12) ← Store settings, POS config
│   ├── compliance/        (13) ← ZATCA, ETA
│   ├── reports/           (14) ← Business reports
│   ├── audit/             (15) ← Audit logging
│   ├── accounting/        (16) ← Chart of Accounts (Phase 4)
│   ├── multi-currency/    (17) ← Foreign currency (Future)
│   ├── purchasing/        (18) ← Suppliers, POs
│   └── production/        (19) ← Production orders
│
├── core/                  ← Shared infrastructure
│   ├── event-bus/
│   ├── repository/
│   ├── calculation/
│   ├── workflow/
│   └── rule-engine/
│
└── common/                ← Utilities
    ├── decorators/
    ├── guards/
    ├── interceptors/
    └── utils/
```

### **Module Structure (Standard)**

```
modules/products/
├── products.module.ts           ← NestJS module
├── products.controller.ts       ← REST API endpoints
├── products.service.ts          ← Business logic
├── products.repository.ts       ← Data access
├── entities/
│   ├── product.entity.ts        ← Prisma models
│   └── category.entity.ts
├── dto/
│   ├── create-product.dto.ts    ← Input validation
│   └── update-product.dto.ts
├── events/
│   ├── product-created.event.ts ← Domain events
│   └── product-updated.event.ts
└── handlers/
    └── product-created.handler.ts ← Event handlers
```

---

## **DATA FLOW**

### **Request Flow**

```
1. HTTP Request
   │
   ▼
2. Controller (Validation)
   │
   ▼
3. Service (Business Logic)
   │
   ▼
4. Repository (Data Access)
   │
   ▼
5. Prisma (Database)
   │
   ▼
6. Event Bus (Publish Events)
   │
   ├─→ Handler A
   ├─→ Handler B
   └─→ Handler C
   │
   ▼
7. Response
```

### **Example: Create Order**

```typescript
// 1. Controller
@Post('orders')
async createOrder(@Body() dto: CreateOrderDto) {
  return this.salesService.createOrder(dto);
}

// 2. Service
async createOrder(dto: CreateOrderDto) {
  // Calculate totals
  const calculatedOrder = await this.calculator.calculate(dto);
  
  // Save order
  const order = await this.orderRepo.create(calculatedOrder);
  
  // Publish event
  await this.eventBus.publish('OrderCreated', {
    orderId: order.id,
    items: order.items
  });
  
  return order;
}

// 3. Event Handlers (Automatic)
// → InventoryHandler: Deducts stock
// → KitchenHandler: Creates ticket
// → AuditHandler: Logs event
// → ComplianceHandler: Generates invoice
```

---

## **TECHNOLOGY STACK**

### **Backend**

```typescript
{
  "framework": "NestJS 10+",
  "language": "TypeScript 5+",
  "orm": "Prisma",
  "database": "PostgreSQL 14+",
  "validation": "class-validator",
  "decimal": "decimal.js",          // ⚠️ CRITICAL
  "websocket": "Socket.io",
  "auth": "JWT + Passport"
}
```

### **Frontend**

```typescript
{
  "framework": "Next.js 14+",
  "language": "TypeScript",
  "state": "Zustand",                // Client state
  "server-state": "TanStack Query",  // API cache
  "forms": "React Hook Form",
  "ui": "Shadcn/UI",
  "styling": "TailwindCSS",
  "offline": "IndexedDB"
}
```

### **Database**

```sql
PostgreSQL 14+ features used:
- JSONB for flexible fields
- Generated columns (computed)
- Partitioning (audit logs)
- Full-text search
- Row-level security (future)
```

---

## **DESIGN PRINCIPLES**

### **1. Separation of Concerns**

```
Controller → Handles HTTP, validation
Service    → Business logic, orchestration
Repository → Data access only
Entity     → Data structure
DTO        → Input/output contracts
```

### **2. Dependency Inversion**

```typescript
// ✅ Depend on abstractions
constructor(private repo: IProductRepository) {}

// ❌ Don't depend on concretions
constructor(private repo: PrismaProductRepository) {}
```

### **3. Single Responsibility**

```typescript
// ✅ Service does ONE thing
export class ProductService {
  async createProduct(dto: CreateProductDto) { }
}

// ❌ Service does too much
export class ProductService {
  async createProduct() { }
  async sendEmail() { }        // ❌ Not product concern
  async generateReport() { }   // ❌ Not product concern
}
```

### **4. Open-Closed Principle**

```typescript
// ✅ Open for extension (via plugins)
@Plugin()
export class CustomCalculationStep implements ICalculationStep {
  // Add new calculation without modifying core
}

// ❌ Closed for modification
// Don't edit core files to add features
```

### **5. Event Sourcing Lite**

```typescript
// All important actions publish events
await this.eventBus.publish('OrderCreated', event);

// Events are stored in audit_log
// Can replay events to rebuild state
```

---

## **CRITICAL CONSTRAINTS**

### **1. DECIMAL.JS is NON-NEGOTIABLE**

```typescript
// ✅ ALWAYS use Decimal.js for money
import Decimal from 'decimal.js';
const total = new Decimal(price).times(quantity).toDecimalPlaces(2);

// ❌ NEVER use native numbers
const total = price * quantity; // ❌ PRECISION LOSS
```

### **2. Repository Pattern MANDATORY**

```typescript
// ✅ Services use repositories
constructor(private productRepo: ProductRepository) {}

// ❌ Services NEVER use Prisma directly
constructor(private prisma: PrismaClient) {} // ❌ WRONG
```

### **3. Event-Driven Communication**

```typescript
// ✅ Publish events
await this.eventBus.publish('OrderCreated', event);

// ❌ Direct cross-module calls
await this.inventoryService.deduct(items); // ❌ COUPLING
```

### **4. ZATCA Hash Chain is CRITICAL**

```typescript
// MUST maintain unbroken hash chain
const currentHash = SHA256(previousHash + invoiceXML);

// If chain breaks → HALT ALL INVOICING
if (hashMismatch) {
  throw new ZATCAHashChainBrokenException(); // CRITICAL ERROR
}
```

---

## **NEXT STEPS**

**For Backend Developers:**
→ Read [BACKEND/00-BACKEND-PRINCIPLES.md](BACKEND/00-BACKEND-PRINCIPLES.md)

**For Frontend Developers:**
→ Read [FRONTEND/00-FRONTEND-PRINCIPLES.md](FRONTEND/00-FRONTEND-PRINCIPLES.md)

**For Both:**
→ Read [00-DEEP-UNDERSTANDING.md](00-DEEP-UNDERSTANDING.md) for complete system understanding

---

**Architecture designed for**: Modularity, Maintainability, Scalability  
**Pattern**: LEGO + Event-Driven + Domain-Driven Design  
**Goal**: Build once, extend forever 🚀
