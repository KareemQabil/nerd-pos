# Sales Module Implementation

**Module**: Orders, Transactions, Calculation Pipeline  
**Priority**: Critical (Core business flow)  
**Dependencies**: Products, Inventory, Payments

---

## **OVERVIEW**

Handles all sales operations:
- **Orders**: DINE_IN, TAKEAWAY, DELIVERY
- **Transactions**: Financial records
- **7-Step Calculation Pipeline**: From item price to grand total
- **Status Workflow**: DRAFT → CONFIRMED → PREPARING → READY → COMPLETED

---

## **ENTITIES**

```prisma
model Order {
  id            String   @id @default(uuid())
  orderNumber   String   @unique
  
  // Type
  type          String   // DINE_IN, TAKEAWAY, DELIVERY
  status        String   @default("DRAFT") // DRAFT, CONFIRMED, PREPARING, READY, COMPLETED, CANCELLED
  
  // Customer
  customerId    String?
  customer      Customer? @relation(fields: [customerId], references: [id])
  
  // Dining
  tableId       String?
  table         Table?    @relation(fields: [tableId], references: [id])
  guestCount    Int?
  
  // Items
  items         OrderItem[]
  
  // Calculations (7-step pipeline results)
  itemSubtotal      Decimal @db.Decimal(10, 2)
  serviceCharge     Decimal @db.Decimal(10, 2) @default(0)
  serviceChargePercent Decimal @db.Decimal(5, 2) @default(0)
  deliveryCharge    Decimal @db.Decimal(10, 2) @default(0)
  subtotalBeforeTax Decimal @db.Decimal(10, 2)
  taxAmount         Decimal @db.Decimal(10, 2)
  taxPercent        Decimal @db.Decimal(5, 2) @default(15)
  discountAmount    Decimal @db.Decimal(10, 2) @default(0)
  discountCode      String?
  grandTotal        Decimal @db.Decimal(10, 2)
  
  // Payment
  payments      Payment[]
  paidAmount    Decimal @db.Decimal(10, 2) @default(0)
  changeAmount  Decimal @db.Decimal(10, 2) @default(0)
  
  // Compliance
  invoiceXML    String?
  zatcaHash     String?
  previousHash  String?
  qrCode        String?
  
  // Timestamps
  orderedAt     DateTime @default(now())
  confirmedAt   DateTime?
  completedAt   DateTime?
  cancelledAt   DateTime?
  
  // Audit
  sessionId     String?
  session       Session?  @relation(fields: [sessionId], references: [id])
  createdBy     String
  
  syncStrategy  String    @default("APPEND_ONLY") // Offline sync
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  @@index([orderNumber])
  @@index([customerId])
  @@index([sessionId])
  @@index([status])
}

model OrderItem {
  id          String  @id @default(uuid())
  orderId     String
  order       Order   @relation(fields: [orderId], references: [id])
  
  productId   String
  name        String
  nameAr      String
  
  // Pricing
  price       Decimal @db.Decimal(10, 2)
  quantity    Int
  subtotal    Decimal @db.Decimal(10, 2)  // price * quantity + modifiers
  
  // Modifiers
  modifiers   OrderItemModifier[]
  
  // Kitchen
  notes       String?
  status      String  @default("PENDING") // PENDING, PREPARING, READY
  
  @@index([orderId])
  @@index([productId])
}

model OrderItemModifier {
  id          String  @id @default(uuid())
  orderItemId String
  orderItem   OrderItem @relation(fields: [orderItemId], references: [id])
  
  modifierId  String
  optionId    String
  name        String
  price       Decimal @db.Decimal(10, 2)
  
  @@index([orderItemId])
}
```

---

## **7-STEP CALCULATION PIPELINE**

### **Step 1: Item Subtotal (order: 10)**

```typescript
// calculations/item-subtotal.step.ts
import { Injectable } from '@nestjs/common';
import { ICalculationStep } from '@/core/calculation/calculation-step.interface';
import { CalculationContext } from '@/core/calculation/calculation-context';
import Decimal from 'decimal.js';

@Injectable()
@CalculationStep(10)
export class ItemSubtotalStep implements ICalculationStep {
  order = 10;

  async execute(ctx: CalculationContext): Promise<CalculationContext> {
    ctx.itemSubtotal = ctx.items.reduce((sum, item) => {
      let itemPrice = new Decimal(item.price);
      
      // Add modifier prices
      if (item.modifiers) {
        const modifierTotal = item.modifiers.reduce((modSum, mod) => 
          modSum.plus(new Decimal(mod.price)), 
          new Decimal(0)
        );
        itemPrice = itemPrice.plus(modifierTotal);
      }
      
      const itemSubtotal = itemPrice.times(item.quantity);
      return sum.plus(itemSubtotal);
    }, new Decimal(0));
    
    return ctx;
  }
}
```

### **Step 2: Service Charge (order: 20)**

```typescript
// calculations/service-charge.step.ts
@Injectable()
@CalculationStep(20)
export class ServiceChargeStep implements ICalculationStep {
  order = 20;

  async execute(ctx: CalculationContext): Promise<CalculationContext> {
    if (ctx.orderType === 'DINE_IN') {
      ctx.serviceChargePercent = new Decimal(12); // 12%
      ctx.serviceCharge = ctx.itemSubtotal
        .times(ctx.serviceChargePercent)
        .dividedBy(100)
        .toDecimalPlaces(2);
    } else {
      ctx.serviceCharge = new Decimal(0);
    }
    return ctx;
  }
}
```

### **Step 3: Delivery Charge (order: 30)**

```typescript
@Injectable()
@CalculationStep(30)
export class DeliveryChargeStep implements ICalculationStep {
  order = 30;

  constructor(private readonly deliveryService: DeliveryService) {}

  async execute(ctx: CalculationContext): Promise<CalculationContext> {
    if (ctx.orderType === 'DELIVERY' && ctx.deliveryZoneId) {
      const zone = await this.deliveryService.getZone(ctx.deliveryZoneId);
      ctx.deliveryCharge = new Decimal(zone.charge);
    } else {
      ctx.deliveryCharge = new Decimal(0);
    }
    return ctx;
  }
}
```

### **Step 4: Subtotal Before Tax (order: 40)**

```typescript
@Injectable()
@CalculationStep(40)
export class SubtotalBeforeTaxStep implements ICalculationStep {
  order = 40;

  async execute(ctx: CalculationContext): Promise<CalculationContext> {
    ctx.subtotalBeforeTax = ctx.itemSubtotal
      .plus(ctx.serviceCharge)
      .plus(ctx.deliveryCharge)
      .toDecimalPlaces(2);
    return ctx;
  }
}
```

### **Step 5: Tax Amount (order: 50)**

```typescript
@Injectable()
@CalculationStep(50)
export class TaxStep implements ICalculationStep {
  order = 50;

  async execute(ctx: CalculationContext): Promise<CalculationContext> {
    // 15% VAT on subtotal before tax
    ctx.taxPercent = new Decimal(15);
    ctx.taxAmount = ctx.subtotalBeforeTax
      .times(ctx.taxPercent)
      .dividedBy(100)
      .toDecimalPlaces(2);
    return ctx;
  }
}
```

### **Step 6: Discount Amount (order: 60)**

```typescript
@Injectable()
@CalculationStep(60)
export class DiscountStep implements ICalculationStep {
  order = 60;

  constructor(private readonly discountService: DiscountService) {}

  async execute(ctx: CalculationContext): Promise<CalculationContext> {
    if (ctx.discountCode) {
      const discount = await this.discountService.getByCode(ctx.discountCode);
      
      if (discount.type === 'PERCENTAGE') {
        ctx.discountAmount = ctx.subtotalBeforeTax
          .plus(ctx.taxAmount)
          .times(discount.value)
          .dividedBy(100)
          .toDecimalPlaces(2);
      } else { // FIXED
        ctx.discountAmount = new Decimal(discount.value);
      }
    } else {
      ctx.discountAmount = new Decimal(0);
    }
    return ctx;
  }
}
```

### **Step 7: Grand Total (order: 70)**

```typescript
@Injectable()
@CalculationStep(70)
export class GrandTotalStep implements ICalculationStep {
  order = 70;

  async execute(ctx: CalculationContext): Promise<CalculationContext> {
    ctx.grandTotal = ctx.subtotalBeforeTax
      .plus(ctx.taxAmount)
      .minus(ctx.discountAmount)
      .toDecimalPlaces(2);
    
    // Ensure non-negative
    if (ctx.grandTotal.lessThan(0)) {
      ctx.grandTotal = new Decimal(0);
    }
    
    return ctx;
  }
}
```

---

## **SERVICE**

```typescript
// sales.service.ts
import { Injectable } from '@nestjs/common';
import { OrderRepository } from './sales.repository';
import { CalculationPipeline } from '@/core/calculation/calculation-pipeline';
import { IEventBus } from '@/core/event-bus/event-bus.interface';
import { OrderCreatedEvent, OrderCompletedEvent } from './events';
import { CreateOrderDto } from './dto';
import Decimal from 'decimal.js';

@Injectable()
export class SalesService {
  constructor(
    private readonly orderRepo: OrderRepository,
    private readonly calculationPipeline: CalculationPipeline,
    private readonly eventBus: IEventBus
  ) {}

  async createOrder(dto: CreateOrderDto): Promise<Order> {
    // Build calculation context
    const context = new CalculationContext();
    context.items = dto.items.map(item => ({
      ...item,
      price: new Decimal(item.price)
    }));
    context.orderType = dto.type;
    context.discountCode = dto.discountCode;

    // Execute 7-step pipeline
    const calculated = await this.calculationPipeline.execute(context);

    // Create order
    const order = await this.orderRepo.create({
      ...dto,
      orderNumber: await this.generateOrderNumber(),
      itemSubtotal: calculated.itemSubtotal.toNumber(),
      serviceCharge: calculated.serviceCharge.toNumber(),
      serviceChargePercent: calculated.serviceChargePercent.toNumber(),
      deliveryCharge: calculated.deliveryCharge.toNumber(),
      subtotalBeforeTax: calculated.subtotalBeforeTax.toNumber(),
      taxAmount: calculated.taxAmount.toNumber(),
      taxPercent: calculated.taxPercent.toNumber(),
      discountAmount: calculated.discountAmount.toNumber(),
      grandTotal: calculated.grandTotal.toNumber(),
      status: 'CONFIRMED'
    });

    // Publish event
    await this.eventBus.publish('OrderCreated', 
      new OrderCreatedEvent(
        order.id,
        order.items,
        order.customerId,
        new Decimal(order.grandTotal)
      )
    );

    return order;
  }

  async completeOrder(orderId: string): Promise<Order> {
    const order = await this.orderRepo.update(orderId, {
      status: 'COMPLETED',
      completedAt: new Date()
    });

    await this.eventBus.publish('OrderCompleted',
      new OrderCompletedEvent(order.id, new Decimal(order.grandTotal))
    );

    return order;
  }

  private async generateOrderNumber(): Promise<string> {
    const date = new Date();
    const prefix = `ORD${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    const count = await this.orderRepo.countByPrefix(prefix);
    return `${prefix}${(count + 1).toString().padStart(4, '0')}`;
  }
}
```

---

## **MODULE**

```typescript
// sales.module.ts
import { Module } from '@nestjs/common';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { OrderRepository } from './sales.repository';
import { CalculationPipeline } from '@/core/calculation/calculation-pipeline';

// Import all calculation steps
import { ItemSubtotalStep } from './calculations/item-subtotal.step';
import { ServiceChargeStep } from './calculations/service-charge.step';
import { DeliveryChargeStep } from './calculations/delivery-charge.step';
import { SubtotalBeforeTaxStep } from './calculations/subtotal-before-tax.step';
import { TaxStep } from './calculations/tax.step';
import { DiscountStep } from './calculations/discount.step';
import { GrandTotalStep } from './calculations/grand-total.step';

@Module({
  imports: [PrismaModule, EventBusModule],
  controllers: [SalesController],
  providers: [
    SalesService,
    OrderRepository,
    CalculationPipeline,
    {
      provide: 'CALCULATION_STEPS',
      useFactory: () => [
        new ItemSubtotalStep(),
        new ServiceChargeStep(),
        new DeliveryChargeStep(),
        new SubtotalBeforeTaxStep(),
        new TaxStep(),
        new DiscountStep(),
        new GrandTotalStep()
      ]
    }
  ],
  exports: [SalesService]
})
@Plugin({ 
  name: 'sales',
  enabled: process.env.ENABLE_SALES === 'true' 
})
export class SalesModule {}
```

---

## **KEY FEATURES**

1. **7-Step Calculation Pipeline** - Extensible, ordered calculations
2. **Decimal.js Throughout** - No precision loss
3. **Event-Driven** - Triggers inventory, kitchen, compliance
4. **Status Workflow** - DRAFT → CONFIRMED → COMPLETED
5. **Order Types** - DINE_IN (service charge), TAKEAWAY, DELIVERY
6. **Modifiers** - Per-item customizations with pricing
7. **Offline-First** - APPEND_ONLY sync strategy

---

## **NEXT**

- [WORKFLOWS-BACKEND/01-create-module.md](../WORKFLOWS-BACKEND/01-create-module.md) - How to build modules
- [WORKFLOWS-INTEGRATION/01-quick-sale.md](../WORKFLOWS-INTEGRATION/01-quick-sale.md) - End-to-end flow
