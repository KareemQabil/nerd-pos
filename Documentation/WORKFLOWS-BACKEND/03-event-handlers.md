# Backend Workflow: Event Handlers

**Task**: Handle cross-module communication via events  
**Time**: 10-15 minutes per handler  
**Pattern**: Event-Driven Architecture  

---

## **STEP 1: Define Event**

```typescript
// shared/events/order.events.ts
export class OrderCompletedEvent {
  constructor(
    public readonly orderId: string,
    public readonly customerId: string,
    public readonly totalAmount: number,
    public readonly items: OrderItem[]
  ) {}
}
```

---

## **STEP 2: Create Event Handler**

```typescript
// modules/customers/handlers/order-completed.handler.ts
import { EventHandler } from '@/shared/events/event-handler.interface';
import { OrderCompletedEvent } from '@/shared/events/order.events';
import Decimal from 'decimal.js';

@Injectable()
export class OrderCompletedHandler implements EventHandler<OrderCompletedEvent> {
  constructor(
    private readonly customersService: CustomersService,
    private readonly eventBus: IEventBus
  ) {}

  async handle(event: OrderCompletedEvent): Promise<void> {
    try {
      // Update customer stats
      await this.customersService.updateStats(
        event.customerId,
        new Decimal(event.totalAmount)
      );

      // Add loyalty points
      await this.customersService.addLoyaltyPoints(
        event.customerId,
        new Decimal(event.totalAmount),
        event.orderId
      );

      console.log(`Customer stats updated for order ${event.orderId}`);
    } catch (error) {
      console.error('OrderCompletedHandler failed:', error);
      // Optionally emit failure event for retry
      await this.eventBus.publish('OrderCompletedHandlerFailed', {
        orderId: event.orderId,
        error: error.message
      });
    }
  }
}
```

---

## **STEP 3: Register Handler**

```typescript
// modules/customers/customers.module.ts
import { Module } from '@nestjs/common';
import { OrderCompletedHandler } from './handlers/order-completed.handler';

@Module({
  providers: [
    CustomersService,
    CustomerRepository,
    OrderCompletedHandler // Register handler
  ],
  exports: [CustomersService]
})
export class CustomersModule implements OnModuleInit {
  constructor(
    private readonly eventBus: IEventBus,
    private readonly orderCompletedHandler: OrderCompletedHandler
  ) {}

  onModuleInit() {
    // Subscribe handler to event
    this.eventBus.subscribe('OrderCompleted', this.orderCompletedHandler);
  }
}
```

---

## **STEP 4: Event Bus Implementation**

```typescript
// shared/events/event-bus.service.ts
import { Injectable } from '@nestjs/common';

interface EventHandler<T = any> {
  handle(event: T): Promise<void>;
}

@Injectable()
export class EventBusService implements IEventBus {
  private handlers = new Map<string, EventHandler[]>();

  subscribe<T>(eventName: string, handler: EventHandler<T>): void {
    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, []);
    }
    this.handlers.get(eventName)!.push(handler);
  }

  async publish<T>(eventName: string, event: T): Promise<void> {
    const handlers = this.handlers.get(eventName) || [];

    // Execute handlers in parallel
    await Promise.all(
      handlers.map(handler =>
        handler.handle(event).catch(error => {
          console.error(`Handler failed for ${eventName}:`, error);
        })
      )
    );
  }
}
```

---

## **COMMON EVENT PATTERNS**

### **1. Inventory Reserve (OrderSubmitted)**

```typescript
// modules/inventory/handlers/order-submitted.handler.ts
@Injectable()
export class OrderSubmittedHandler implements EventHandler<OrderSubmittedEvent> {
  constructor(private readonly inventoryService: InventoryService) {}

  async handle(event: OrderSubmittedEvent): Promise<void> {
    for (const item of event.items) {
      await this.inventoryService.reserveStock({
        productId: item.productId,
        quantity: item.quantity,
        orderId: event.orderId
      });
    }
  }
}
```

### **2. Kitchen Routing (OrderSubmitted)**

```typescript
// modules/kitchen/handlers/order-submitted.handler.ts
@Injectable()
export class KitchenOrderHandler implements EventHandler<OrderSubmittedEvent> {
  constructor(private readonly kitchenService: KitchenService) {}

  async handle(event: OrderSubmittedEvent): Promise<void> {
    // Create kitchen tickets
    await this.kitchenService.routeOrder(event.orderId);
  }
}
```

### **3. Compliance Invoice (OrderCompleted)**

```typescript
// modules/compliance/handlers/order-completed.handler.ts
@Injectable()
export class ComplianceInvoiceHandler implements EventHandler<OrderCompletedEvent> {
  constructor(private readonly complianceService: ComplianceService) {}

  async handle(event: OrderCompletedEvent): Promise<void> {
    // Generate ZATCA invoice
    await this.complianceService.generateCompliantInvoice(event.orderId);
  }
}
```

### **4. Accounting Entry (PaymentCreated)**

```typescript
// modules/accounting/handlers/payment-created.handler.ts
@Injectable()
export class PaymentAccountingHandler implements EventHandler<PaymentCreatedEvent> {
  constructor(private readonly accountingService: AccountingService) {}

  async handle(event: PaymentCreatedEvent): Promise<void> {
    // Create journal entry
    await this.accountingService.createJournalEntry({
      type: 'PAYMENT_RECEIVED',
      debit: { account: 'CASH', amount: event.amount },
      credit: { account: 'REVENUE', amount: event.amount },
      reference: event.paymentId
    });
  }
}
```

---

## **ERROR HANDLING**

```typescript
// Retry mechanism
@Injectable()
export class OrderCompletedHandler implements EventHandler<OrderCompletedEvent> {
  private maxRetries = 3;

  async handle(event: OrderCompletedEvent): Promise<void> {
    let attempt = 0;

    while (attempt < this.maxRetries) {
      try {
        await this.customersService.updateStats(
          event.customerId,
          new Decimal(event.totalAmount)
        );
        return; // Success
      } catch (error) {
        attempt++;
        if (attempt >= this.maxRetries) {
          // Store in dead letter queue
          await this.deadLetterQueue.add({
            event: 'OrderCompleted',
            data: event,
            error: error.message,
            attempts: attempt
          });
          throw error;
        }
        // Exponential backoff
        await this.delay(Math.pow(2, attempt) * 1000);
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

---

## **TESTING**

```typescript
// order-completed.handler.spec.ts
describe('OrderCompletedHandler', () => {
  let handler: OrderCompletedHandler;
  let customersService: jest.Mocked<CustomersService>;

  beforeEach(() => {
    customersService = {
      updateStats: jest.fn(),
      addLoyaltyPoints: jest.fn()
    } as any;

    handler = new OrderCompletedHandler(customersService, eventBus);
  });

  it('should update customer stats', async () => {
    const event = new OrderCompletedEvent(
      'order-123',
      'customer-456',
      100.00,
      []
    );

    await handler.handle(event);

    expect(customersService.updateStats).toHaveBeenCalledWith(
      'customer-456',
      expect.any(Decimal)
    );
  });

  it('should add loyalty points', async () => {
    const event = new OrderCompletedEvent(
      'order-123',
      'customer-456',
      100.00,
      []
    );

    await handler.handle(event);

    expect(customersService.addLoyaltyPoints).toHaveBeenCalledWith(
      'customer-456',
      expect.any(Decimal),
      'order-123'
    );
  });
});
```

---

## **CHECKLIST**

- [ ] Event class defined in shared/events/
- [ ] Handler implements EventHandler interface
- [ ] Handler registered in module providers
- [ ] Handler subscribed in onModuleInit
- [ ] Error handling with try-catch
- [ ] Retry mechanism for critical handlers
- [ ] Tests written for handler logic
- [ ] Dead letter queue for failures

---

**NEXT**: [04-calculation-steps.md](04-calculation-steps.md)
