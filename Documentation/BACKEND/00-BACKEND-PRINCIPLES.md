# Backend Principles - NerdPOS

**Purpose**: Core principles and patterns for backend development  
**Stack**: NestJS + TypeScript + Prisma + PostgreSQL  
**Pattern**: LEGO Architecture with Event-Driven Design

---

## **TABLE OF CONTENTS**

1. [Core Principles](#core-principles)
2. [LEGO Pattern Implementation](#lego-pattern-implementation)
3. [Repository Pattern](#repository-pattern)
4. [Event-Driven Architecture](#event-driven-architecture)
5. [Calculation Engine](#calculation-engine)
6. [Critical Rules](#critical-rules)

---

## **CORE PRINCIPLES**

### **1. Modularity**

```
Each module is a self-contained LEGO brick:
- Has its own entities, DTOs, controllers, services
- Communicates via events ONLY
- Can be enabled/disabled via .env
- No direct dependencies on other modules
```

### **2. Separation of Concerns**

```typescript
Controller   → HTTP handling, validation, response formatting
Service      → Business logic, orchestration, event publishing
Repository   → Data access ONLY (Prisma abstraction)
Entity       → Data structure (Prisma models)
DTO          → Input/output validation
Event        → Domain events for communication
Handler      → Event listeners
```

### **3. Dependency Inversion**

```typescript
// ✅ CORRECT - Depend on abstraction
export class ProductService {
  constructor(
    private readonly productRepo: IProductRepository,
    private readonly eventBus: IEventBus
  ) {}
}

// ❌ WRONG - Depend on concrete implementation
export class ProductService {
  constructor(
    private readonly prisma: PrismaClient // ❌ Tight coupling
  ) {}
}
```

---

## **LEGO PATTERN IMPLEMENTATION**

### **Plugin Decorator**

```typescript
// Each module is a plugin
@Module({
  imports: [],
  controllers: [ProductController],
  providers: [ProductService, ProductRepository],
  exports: [ProductService] // Only if needed
})
@Plugin({ 
  name: 'products',
  enabled: process.env.ENABLE_PRODUCTS === 'true' 
})
export class ProductsModule {}
```

### **Dynamic Module Loading**

```typescript
// app.module.ts
const enabledModules = [
  ProductsModule,   // Load if ENABLE_PRODUCTS=true
  InventoryModule,  // Load if ENABLE_INVENTORY=true
  SalesModule,      // Load if ENABLE_SALES=true
].filter(module => module.isEnabled());

@Module({
  imports: [...coreModules, ...enabledModules],
})
export class AppModule {}
```

---

## **REPOSITORY PATTERN**

### **Base Repository**

```typescript
// core/repository/base.repository.ts
export abstract class BaseRepository<T> {
  constructor(protected readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<T | null> {
    return this.prisma[this.model].findUnique({ where: { id } });
  }

  async findAll(): Promise<T[]> {
    return this.prisma[this.model].findMany();
  }

  async create(data: Partial<T>): Promise<T> {
    return this.prisma[this.model].create({ data });
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    return this.prisma[this.model].update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await this.prisma[this.model].delete({ where: { id } });
  }

  protected abstract get model(): string;
}
```

### **Concrete Repository**

```typescript
// modules/products/products.repository.ts
@Injectable()
export class ProductRepository extends BaseRepository<Product> {
  protected get model() { return 'product'; }

  // Custom queries
  async findByCategory(categoryId: string): Promise<Product[]> {
    return this.prisma.product.findMany({
      where: { categoryId },
      include: { category: true, modifiers: true }
    });
  }

  async searchByName(query: string): Promise<Product[]> {
    return this.prisma.product.findMany({
      where: {
        name: { contains: query, mode: 'insensitive' }
      }
    });
  }

  async updateStock(productId: string, quantity: number): Promise<void> {
    await this.prisma.product.update({
      where: { id: productId },
      data: { currentStock: { increment: quantity } }
    });
  }
}
```

---

## **EVENT-DRIVEN ARCHITECTURE**

### **Event Bus Interface**

```typescript
// core/event-bus/event-bus.interface.ts
export interface IEventBus {
  publish<T extends DomainEvent>(eventName: string, event: T): Promise<void>;
  subscribe<T extends DomainEvent>(
    eventName: string, 
    handler: IEventHandler<T>
  ): void;
}
```

### **Domain Event**

```typescript
// core/event-bus/domain-event.ts
export abstract class DomainEvent {
  public readonly occurredAt: Date;
  public readonly eventId: string;

  constructor() {
    this.occurredAt = new Date();
    this.eventId = uuidv4();
  }
}

// modules/sales/events/order-created.event.ts
export class OrderCreatedEvent extends DomainEvent {
  constructor(
    public readonly orderId: string,
    public readonly items: OrderItem[],
    public readonly customerId: string | null,
    public readonly total: Decimal
  ) {
    super();
  }
}
```

### **Event Handler**

```typescript
// modules/inventory/handlers/order-created.handler.ts
@Injectable()
export class InventoryDeductionHandler implements IEventHandler<OrderCreatedEvent> {
  constructor(private readonly inventoryService: InventoryService) {}

  @EventHandler('OrderCreated')
  async handle(event: OrderCreatedEvent): Promise<void> {
    // Deduct stock for each item
    for (const item of event.items) {
      await this.inventoryService.deductStock(
        item.productId, 
        item.quantity
      );
    }
  }
}
```

### **Publishing Events**

```typescript
// modules/sales/sales.service.ts
@Injectable()
export class SalesService {
  constructor(
    private readonly orderRepo: OrderRepository,
    private readonly eventBus: IEventBus
  ) {}

  async createOrder(dto: CreateOrderDto): Promise<Order> {
    // 1. Create order
    const order = await this.orderRepo.create(dto);

    // 2. Publish event (fire and forget)
    await this.eventBus.publish('OrderCreated', new OrderCreatedEvent(
      order.id,
      order.items,
      order.customerId,
      new Decimal(order.total)
    ));

    return order;
  }
}
```

**Event Handlers (Automatic)**:
```
OrderCreated Event
       │
       ├─→ InventoryDeductionHandler    (deducts stock)
       ├─→ KitchenTicketHandler         (creates kitchen ticket)
       ├─→ LoyaltyPointsHandler         (awards loyalty points)
       ├─→ AuditLogHandler              (logs event)
       └─→ ComplianceInvoiceHandler     (generates ZATCA invoice)
```

---

## **CALCULATION ENGINE**

### **Calculation Step Interface**

```typescript
// core/calculation/calculation-step.interface.ts
export interface ICalculationStep {
  order: number;  // 10, 20, 30... determines execution order
  execute(context: CalculationContext): Promise<CalculationContext>;
}

export class CalculationContext {
  items: OrderItem[] = [];
  itemSubtotal: Decimal = new Decimal(0);
  serviceCharge: Decimal = new Decimal(0);
  deliveryCharge: Decimal = new Decimal(0);
  subtotalBeforeTax: Decimal = new Decimal(0);
  taxAmount: Decimal = new Decimal(0);
  discountAmount: Decimal = new Decimal(0);
  grandTotal: Decimal = new Decimal(0);
  orderType: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY' = 'DINE_IN';
}
```

### **Calculation Steps**

```typescript
// modules/sales/calculations/item-subtotal.step.ts
@CalculationStep(10)
export class ItemSubtotalStep implements ICalculationStep {
  order = 10;

  async execute(ctx: CalculationContext): Promise<CalculationContext> {
    ctx.itemSubtotal = ctx.items.reduce((sum, item) => {
      const itemTotal = new Decimal(item.price).times(item.quantity);
      return sum.plus(itemTotal);
    }, new Decimal(0));
    return ctx;
  }
}

// modules/sales/calculations/service-charge.step.ts
@CalculationStep(20)
export class ServiceChargeStep implements ICalculationStep {
  order = 20;

  async execute(ctx: CalculationContext): Promise<CalculationContext> {
    if (ctx.orderType === 'DINE_IN') {
      ctx.serviceCharge = ctx.itemSubtotal.times(0.12); // 12%
    }
    return ctx;
  }
}

// modules/sales/calculations/tax.step.ts
@CalculationStep(50)
export class TaxStep implements ICalculationStep {
  order = 50;

  async execute(ctx: CalculationContext): Promise<CalculationContext> {
    ctx.taxAmount = ctx.subtotalBeforeTax.times(0.15); // 15% VAT
    return ctx;
  }
}

// modules/sales/calculations/grand-total.step.ts
@CalculationStep(70)
export class GrandTotalStep implements ICalculationStep {
  order = 70;

  async execute(ctx: CalculationContext): Promise<CalculationContext> {
    ctx.grandTotal = ctx.subtotalBeforeTax
      .plus(ctx.taxAmount)
      .minus(ctx.discountAmount);
    return ctx;
  }
}
```

### **Pipeline Runner**

```typescript
// core/calculation/calculation-pipeline.ts
@Injectable()
export class CalculationPipeline {
  constructor(
    @Inject('CALCULATION_STEPS') 
    private readonly steps: ICalculationStep[]
  ) {
    // Sort by order
    this.steps.sort((a, b) => a.order - b.order);
  }

  async execute(context: CalculationContext): Promise<CalculationContext> {
    let ctx = context;
    for (const step of this.steps) {
      ctx = await step.execute(ctx);
    }
    return ctx;
  }
}

// Usage in service
const context = new CalculationContext();
context.items = dto.items;
context.orderType = dto.orderType;
const result = await this.calculationPipeline.execute(context);
```

---

## **CRITICAL RULES**

### **1. Decimal.js NON-NEGOTIABLE**

```typescript
// ✅ ALWAYS use Decimal.js
import Decimal from 'decimal.js';

const price = new Decimal(99.99);
const quantity = new Decimal(3);
const total = price.times(quantity).toDecimalPlaces(2);

// Convert to number ONLY for database storage
await this.orderRepo.create({
  total: total.toNumber()  // ✅ OK for DB
});

// ❌ NEVER use native numbers for calculations
const total = 99.99 * 3; // ❌ PRECISION LOSS
```

### **2. Repository Pattern MANDATORY**

```typescript
// ✅ Services ALWAYS use repositories
@Injectable()
export class ProductService {
  constructor(private readonly productRepo: ProductRepository) {}
  
  async getProduct(id: string) {
    return this.productRepo.findById(id); // ✅
  }
}

// ❌ Services NEVER use Prisma directly
@Injectable()
export class ProductService {
  constructor(private readonly prisma: PrismaClient) {} // ❌ WRONG
}
```

### **3. Event-Driven Communication**

```typescript
// ✅ Modules communicate via events
await this.eventBus.publish('OrderCreated', event);

// ❌ NO direct cross-module calls
await this.inventoryService.deductStock(items); // ❌ COUPLING
```

### **4. ZATCA Hash Chain**

```typescript
// MUST maintain unbroken chain
const invoiceHash = SHA256(previousHash + invoiceXML);

// Store hash immediately
await this.invoiceRepo.update(invoiceId, { 
  hash: invoiceHash,
  previousHash 
});

// Verify chain integrity
const verified = await this.zatcaService.verifyHashChain(invoiceId);
if (!verified) {
  throw new ZATCAHashChainBrokenException(); // HALT SYSTEM
}
```

### **5. Offline-First Strategy**

```typescript
// All mutations must support offline sync
export enum SyncStrategy {
  APPEND_ONLY = 'APPEND_ONLY',         // Sales, payments
  DELTA_INCREMENT = 'DELTA_INCREMENT', // Inventory
  SERVER_AUTHORITY = 'SERVER_AUTHORITY' // Settings
}

// Tag entities with sync strategy
@Entity()
export class Order {
  @Column({ type: 'enum', enum: SyncStrategy })
  syncStrategy: SyncStrategy = SyncStrategy.APPEND_ONLY;
}
```

---

## **MODULE STRUCTURE TEMPLATE**

```
modules/example/
├── example.module.ts           ← NestJS module definition
├── example.controller.ts       ← REST endpoints
├── example.service.ts          ← Business logic
├── example.repository.ts       ← Data access
├── entities/
│   └── example.entity.ts       ← Prisma models
├── dto/
│   ├── create-example.dto.ts   ← Input validation
│   └── update-example.dto.ts
├── events/
│   ├── example-created.event.ts
│   └── example-updated.event.ts
├── handlers/
│   └── example-created.handler.ts
├── calculations/               ← If needed
│   └── example-calculation.step.ts
└── __tests__/
    ├── example.service.spec.ts
    └── example.repository.spec.ts
```

---

## **NEXT STEPS**

**Read Module Implementations:**
- [BACKEND/03-MODULE-PRODUCTS.md](03-MODULE-PRODUCTS.md)
- [BACKEND/04-MODULE-INVENTORY.md](04-MODULE-INVENTORY.md)
- [BACKEND/05-MODULE-SALES.md](05-MODULE-SALES.md)

**Learn How to Build:**
- [WORKFLOWS-BACKEND/01-create-module.md](../WORKFLOWS-BACKEND/01-create-module.md)

---

**Pattern**: LEGO + Event-Driven + Repository  
**Goal**: Decoupled, maintainable, testable code 🚀
