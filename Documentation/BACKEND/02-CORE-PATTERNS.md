# Core Patterns Deep Dive

**Purpose**: Implementation details for core architectural patterns  
**Topics**: Repository, Event Bus, Calculation Engine, Workflow Engine, Rule Engine

---

## **REPOSITORY PATTERN**

### **Base Repository Implementation**

```typescript
// core/repository/base.repository.ts
import { PrismaClient } from '@prisma/client';

export abstract class BaseRepository<T> {
  constructor(protected readonly prisma: PrismaClient) {}

  protected abstract get model(): string;

  async findById(id: string): Promise<T | null> {
    return this.prisma[this.model].findUnique({ where: { id } });
  }

  async findAll(options?: FindOptions): Promise<T[]> {
    return this.prisma[this.model].findMany(options);
  }

  async create(data: Partial<T>): Promise<T> {
    return this.prisma[this.model].create({ data });
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    return this.prisma[this.model].update({ 
      where: { id }, 
      data 
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma[this.model].delete({ where: { id } });
  }

  async count(where?: any): Promise<number> {
    return this.prisma[this.model].count({ where });
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma[this.model].count({ 
      where: { id } 
    });
    return count > 0;
  }
}
```

---

## **EVENT BUS IMPLEMENTATION**

### **Event Bus Service**

```typescript
// core/event-bus/event-bus.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { IEventBus, IEventHandler, DomainEvent } from './interfaces';

@Injectable()
export class EventBusService implements IEventBus, OnModuleInit {
  private handlers = new Map<string, IEventHandler<any>[]>();

  constructor(private moduleRef: ModuleRef) {}

  async onModuleInit() {
    // Auto-discover handlers decorated with @EventHandler
    this.discoverHandlers();
  }

  async publish<T extends DomainEvent>(
    eventName: string, 
    event: T
  ): Promise<void> {
    const handlers = this.handlers.get(eventName) || [];
    
    // Execute handlers in parallel
    await Promise.all(
      handlers.map(handler => 
        this.executeHandler(handler, event)
      )
    );
  }

  subscribe<T extends DomainEvent>(
    eventName: string, 
    handler: IEventHandler<T>
  ): void {
    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, []);
    }
    this.handlers.get(eventName)!.push(handler);
  }

  private async executeHandler(
    handler: IEventHandler<any>, 
    event: DomainEvent
  ): Promise<void> {
    try {
      await handler.handle(event);
    } catch (error) {
      console.error(`Event handler failed:`, error);
      // Don't throw - continue with other handlers
    }
  }

  private discoverHandlers(): void {
    // Implementation: Scan for @EventHandler decorators
    // and auto-register handlers
  }
}
```

### **Domain Event Base**

```typescript
// core/event-bus/domain-event.ts
import { v4 as uuidv4 } from 'uuid';

export abstract class DomainEvent {
  public readonly eventId: string;
  public readonly occurredAt: Date;

  constructor() {
    this.eventId = uuidv4();
    this.occurredAt = new Date();
  }
}
```

### **Event Handler Decorator**

```typescript
// core/event-bus/decorators/event-handler.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const EVENT_HANDLER_METADATA = 'EVENT_HANDLER_METADATA';

export function EventHandler(eventName: string) {
  return (target: any) => {
    SetMetadata(EVENT_HANDLER_METADATA, eventName)(target);
  };
}
```

---

## **CALCULATION ENGINE**

### **Calculation Step Interface**

```typescript
// core/calculation/calculation-step.interface.ts
export interface ICalculationStep {
  order: number;  // 10, 20, 30, 40, 50, 60, 70
  execute(context: CalculationContext): Promise<CalculationContext>;
}
```

### **Calculation Context**

```typescript
// core/calculation/calculation-context.ts
import Decimal from 'decimal.js';

export class CalculationContext {
  // Inputs
  items: OrderItem[] = [];
  orderType: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY' = 'DINE_IN';
  customerId: string | null = null;
  
  // Step 1: Item Subtotal (order: 10)
  itemSubtotal: Decimal = new Decimal(0);
  
  // Step 2: Service Charge (order: 20)
  serviceCharge: Decimal = new Decimal(0);
  serviceChargePercent: Decimal = new Decimal(0);
  
  // Step 3: Delivery Charge (order: 30)
  deliveryCharge: Decimal = new Decimal(0);
  
  // Step 4: Subtotal Before Tax (order: 40)
  subtotalBeforeTax: Decimal = new Decimal(0);
  
  // Step 5: Tax Amount (order: 50)
  taxAmount: Decimal = new Decimal(0);
  taxPercent: Decimal = new Decimal(15); // 15% VAT
  
  // Step 6: Discount Amount (order: 60)
  discountAmount: Decimal = new Decimal(0);
  discountCode: string | null = null;
  
  // Step 7: Grand Total (order: 70)
  grandTotal: Decimal = new Decimal(0);
  
  // Metadata
  metadata: Record<string, any> = {};
}

export interface OrderItem {
  productId: string;
  name: string;
  price: Decimal;
  quantity: number;
  modifiers?: OrderItemModifier[];
}
```

### **Calculation Pipeline**

```typescript
// core/calculation/calculation-pipeline.ts
import { Injectable, Inject } from '@nestjs/common';
import { ICalculationStep } from './calculation-step.interface';
import { CalculationContext } from './calculation-context';

@Injectable()
export class CalculationPipeline {
  private steps: ICalculationStep[];

  constructor(
    @Inject('CALCULATION_STEPS') steps: ICalculationStep[]
  ) {
    // Sort by order: 10, 20, 30, 40, 50, 60, 70
    this.steps = steps.sort((a, b) => a.order - b.order);
  }

  async execute(context: CalculationContext): Promise<CalculationContext> {
    let ctx = context;
    
    for (const step of this.steps) {
      ctx = await step.execute(ctx);
    }
    
    return ctx;
  }
}
```

### **Example Calculation Steps**

```typescript
// Step 1: Calculate item subtotal
@Injectable()
@CalculationStep(10)
export class ItemSubtotalStep implements ICalculationStep {
  order = 10;

  async execute(ctx: CalculationContext): Promise<CalculationContext> {
    ctx.itemSubtotal = ctx.items.reduce((sum, item) => {
      let itemPrice = item.price;
      
      // Add modifier prices
      if (item.modifiers) {
        itemPrice = item.modifiers.reduce((modSum, mod) => 
          modSum.plus(mod.price), itemPrice
        );
      }
      
      const itemTotal = itemPrice.times(item.quantity);
      return sum.plus(itemTotal);
    }, new Decimal(0));
    
    return ctx;
  }
}

// Step 2: Calculate service charge (12% for dine-in)
@Injectable()
@CalculationStep(20)
export class ServiceChargeStep implements ICalculationStep {
  order = 20;

  async execute(ctx: CalculationContext): Promise<CalculationContext> {
    if (ctx.orderType === 'DINE_IN') {
      ctx.serviceChargePercent = new Decimal(12);
      ctx.serviceCharge = ctx.itemSubtotal
        .times(ctx.serviceChargePercent)
        .dividedBy(100)
        .toDecimalPlaces(2);
    }
    return ctx;
  }
}

// Step 4: Calculate subtotal before tax
@Injectable()
@CalculationStep(40)
export class SubtotalBeforeTaxStep implements ICalculationStep {
  order = 40;

  async execute(ctx: CalculationContext): Promise<CalculationContext> {
    ctx.subtotalBeforeTax = ctx.itemSubtotal
      .plus(ctx.serviceCharge)
      .plus(ctx.deliveryCharge);
    return ctx;
  }
}

// Step 5: Calculate tax (15% VAT)
@Injectable()
@CalculationStep(50)
export class TaxStep implements ICalculationStep {
  order = 50;

  async execute(ctx: CalculationContext): Promise<CalculationContext> {
    ctx.taxAmount = ctx.subtotalBeforeTax
      .times(ctx.taxPercent)
      .dividedBy(100)
      .toDecimalPlaces(2);
    return ctx;
  }
}

// Step 7: Calculate grand total
@Injectable()
@CalculationStep(70)
export class GrandTotalStep implements ICalculationStep {
  order = 70;

  async execute(ctx: CalculationContext): Promise<CalculationContext> {
    ctx.grandTotal = ctx.subtotalBeforeTax
      .plus(ctx.taxAmount)
      .minus(ctx.discountAmount)
      .toDecimalPlaces(2);
    return ctx;
  }
}
```

---

## **WORKFLOW ENGINE (SAGA PATTERN)**

### **Workflow Step Interface**

```typescript
// core/workflow/workflow-step.interface.ts
export interface IWorkflowStep {
  name: string;
  execute(context: WorkflowContext): Promise<WorkflowContext>;
  rollback(context: WorkflowContext): Promise<void>;
}

export class WorkflowContext {
  data: Record<string, any> = {};
  errors: string[] = [];
  completedSteps: string[] = [];
  
  set(key: string, value: any): void {
    this.data[key] = value;
  }
  
  get<T>(key: string): T {
    return this.data[key];
  }
  
  addError(error: string): void {
    this.errors.push(error);
  }
  
  markCompleted(stepName: string): void {
    this.completedSteps.push(stepName);
  }
}
```

### **Workflow Orchestrator**

```typescript
// core/workflow/workflow-orchestrator.ts
import { Injectable } from '@nestjs/common';
import { IWorkflowStep, WorkflowContext } from './workflow-step.interface';

@Injectable()
export class WorkflowOrchestrator {
  async execute(
    steps: IWorkflowStep[], 
    context: WorkflowContext
  ): Promise<WorkflowContext> {
    const executedSteps: IWorkflowStep[] = [];
    
    try {
      for (const step of steps) {
        // Execute step
        context = await step.execute(context);
        context.markCompleted(step.name);
        executedSteps.push(step);
      }
      
      return context;
    } catch (error) {
      // Rollback in reverse order
      for (let i = executedSteps.length - 1; i >= 0; i--) {
        try {
          await executedSteps[i].rollback(context);
        } catch (rollbackError) {
          console.error(`Rollback failed for ${executedSteps[i].name}`, rollbackError);
        }
      }
      
      throw error;
    }
  }
}
```

### **Example Workflow Steps**

```typescript
// Step 1: Reserve inventory
export class ReserveInventoryStep implements IWorkflowStep {
  name = 'ReserveInventory';

  constructor(private inventoryService: InventoryService) {}

  async execute(ctx: WorkflowContext): Promise<WorkflowContext> {
    const items = ctx.get<OrderItem[]>('items');
    const reservationId = await this.inventoryService.reserve(items);
    ctx.set('reservationId', reservationId);
    return ctx;
  }

  async rollback(ctx: WorkflowContext): Promise<void> {
    const reservationId = ctx.get<string>('reservationId');
    if (reservationId) {
      await this.inventoryService.releaseReservation(reservationId);
    }
  }
}

// Step 2: Charge payment
export class ChargePaymentStep implements IWorkflowStep {
  name = 'ChargePayment';

  constructor(private paymentService: PaymentService) {}

  async execute(ctx: WorkflowContext): Promise<WorkflowContext> {
    const amount = ctx.get<Decimal>('amount');
    const paymentDetails = ctx.get<PaymentDetails>('paymentDetails');
    
    const transactionId = await this.paymentService.charge(
      amount, 
      paymentDetails
    );
    
    ctx.set('transactionId', transactionId);
    return ctx;
  }

  async rollback(ctx: WorkflowContext): Promise<void> {
    const transactionId = ctx.get<string>('transactionId');
    if (transactionId) {
      await this.paymentService.refund(transactionId);
    }
  }
}

// Usage
const workflow = new WorkflowOrchestrator();
const context = new WorkflowContext();
context.set('items', orderItems);
context.set('amount', grandTotal);

try {
  const result = await workflow.execute([
    new ReserveInventoryStep(inventoryService),
    new ChargePaymentStep(paymentService),
    new CreateOrderStep(orderService),
    new SendToKitchenStep(kitchenService)
  ], context);
} catch (error) {
  // All steps rolled back automatically
}
```

---

## **RULE ENGINE**

### **Business Rule Interface**

```typescript
// core/rule-engine/business-rule.interface.ts
export interface IBusinessRule {
  priority: number;  // Higher = executed first
  check(context: RuleContext): Promise<RuleResult>;
}

export class RuleContext {
  data: Record<string, any> = {};
  
  set(key: string, value: any): void {
    this.data[key] = value;
  }
  
  get<T>(key: string): T {
    return this.data[key];
  }
}

export class RuleResult {
  constructor(
    public readonly isValid: boolean,
    public readonly message?: string
  ) {}

  static success(): RuleResult {
    return new RuleResult(true);
  }

  static failure(message: string): RuleResult {
    return new RuleResult(false, message);
  }
}
```

### **Rule Engine**

```typescript
// core/rule-engine/rule-engine.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class RuleEngine {
  async validate(
    rules: IBusinessRule[], 
    context: RuleContext
  ): Promise<RuleValidationResult> {
    // Sort by priority (descending)
    const sortedRules = rules.sort((a, b) => b.priority - a.priority);
    
    const errors: string[] = [];
    
    for (const rule of sortedRules) {
      const result = await rule.check(context);
      
      if (!result.isValid) {
        errors.push(result.message || 'Validation failed');
      }
    }
    
    return new RuleValidationResult(errors.length === 0, errors);
  }
}

export class RuleValidationResult {
  constructor(
    public readonly isValid: boolean,
    public readonly errors: string[]
  ) {}
}
```

### **Example Business Rules**

```typescript
// Rule 1: Minimum order amount
@Injectable()
export class MinimumOrderRule implements IBusinessRule {
  priority = 100;

  async check(ctx: RuleContext): Promise<RuleResult> {
    const total = ctx.get<Decimal>('total');
    const minAmount = new Decimal(50); // 50 SAR
    
    if (total.lessThan(minAmount)) {
      return RuleResult.failure(
        `Minimum order amount is ${minAmount.toFixed(2)} SAR`
      );
    }
    
    return RuleResult.success();
  }
}

// Rule 2: Stock availability
@Injectable()
export class StockAvailabilityRule implements IBusinessRule {
  priority = 200;  // Check stock before other rules

  constructor(private inventoryRepo: InventoryRepository) {}

  async check(ctx: RuleContext): Promise<RuleResult> {
    const items = ctx.get<OrderItem[]>('items');
    
    for (const item of items) {
      const stock = await this.inventoryRepo.getAvailableStock(
        item.productId
      );
      
      if (stock < item.quantity) {
        return RuleResult.failure(
          `Insufficient stock for ${item.name}. Available: ${stock}`
        );
      }
    }
    
    return RuleResult.success();
  }
}

// Usage
const ruleEngine = new RuleEngine();
const context = new RuleContext();
context.set('total', orderTotal);
context.set('items', orderItems);

const result = await ruleEngine.validate([
  new MinimumOrderRule(),
  new StockAvailabilityRule(inventoryRepo),
  new PaymentMethodRule(),
  new DeliveryZoneRule()
], context);

if (!result.isValid) {
  throw new ValidationException(result.errors);
}
```

---

## **PLUGIN SYSTEM**

### **Plugin Decorator**

```typescript
// common/decorators/plugin.decorator.ts
export interface PluginOptions {
  name: string;
  enabled: boolean;
}

export function Plugin(options: PluginOptions) {
  return (target: any) => {
    Reflect.defineMetadata('plugin:options', options, target);
  };
}
```

### **Plugin Loader**

```typescript
// core/plugin/plugin-loader.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

@Injectable()
export class PluginLoader implements OnModuleInit {
  private enabledPlugins: string[] = [];

  async onModuleInit() {
    // Auto-discover and load enabled plugins
    this.discoverPlugins();
  }

  private discoverPlugins(): void {
    // Scan for @Plugin decorators
    // Load only enabled modules
  }

  isEnabled(pluginName: string): boolean {
    return this.enabledPlugins.includes(pluginName);
  }
}
```

---

## **BEST PRACTICES**

### **1. Always Use Decimal.js**

```typescript
// ✅ CORRECT
import Decimal from 'decimal.js';
const total = new Decimal(price).times(quantity).toDecimalPlaces(2);

// ❌ WRONG
const total = price * quantity;
```

### **2. Repository Pattern is Mandatory**

```typescript
// ✅ CORRECT
constructor(private productRepo: ProductRepository) {}

// ❌ WRONG
constructor(private prisma: PrismaClient) {}
```

### **3. Event-Driven Communication**

```typescript
// ✅ CORRECT
await this.eventBus.publish('OrderCreated', event);

// ❌ WRONG
await this.inventoryService.deductStock(items);
```

### **4. Workflow with Rollback**

```typescript
// ✅ CORRECT - Use workflow with rollback
const workflow = new WorkflowOrchestrator();
await workflow.execute(steps, context);

// ❌ WRONG - Direct service calls without rollback
await this.inventoryService.reserve(items);
await this.paymentService.charge(amount);
```

---

## **NEXT STEPS**

Read module implementations:
- [03-MODULE-PRODUCTS.md](03-MODULE-PRODUCTS.md)
- [04-MODULE-INVENTORY.md](04-MODULE-INVENTORY.md)
- [05-MODULE-SALES.md](05-MODULE-SALES.md)
