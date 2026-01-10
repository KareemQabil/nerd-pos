# Inventory Module Implementation

**Module**: Warehouse, Stock, FIFO, Recipes  
**Priority**: High (Core business logic)  
**Dependencies**: Products module

---

## **OVERVIEW**

Manages inventory tracking with:
- **Warehouses**: Multiple locations
- **Batches**: FIFO costing
- **Movements**: Stock in/out tracking
- **Recipes**: Bill of materials for production

---

## **ENTITIES**

```prisma
model Warehouse {
  id        String @id @default(uuid())
  name      String
  nameAr    String
  location  String?
  isMain    Boolean @default(false)
  isActive  Boolean @default(true)
  
  batches   Batch[]
  movements Movement[]
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Batch {
  id          String   @id @default(uuid())
  productId   String
  warehouseId String
  
  quantity    Int
  remaining   Int
  unitCost    Decimal  @db.Decimal(10, 2)
  
  // FIFO
  receivedAt  DateTime @default(now())
  expiryDate  DateTime?
  lotNumber   String?
  
  warehouse   Warehouse @relation(fields: [warehouseId], references: [id])
  movements   Movement[]
  
  createdAt   DateTime @default(now())
  
  @@index([productId, warehouseId])
  @@index([receivedAt])  // For FIFO
}

model Movement {
  id          String   @id @default(uuid())
  type        String   // IN, OUT, ADJUSTMENT, TRANSFER
  
  productId   String
  warehouseId String
  batchId     String?
  
  quantity    Int      // Negative for OUT
  unitCost    Decimal? @db.Decimal(10, 2)
  totalValue  Decimal? @db.Decimal(10, 2)
  
  // Reference
  referenceType String? // ORDER, PURCHASE, ADJUSTMENT
  referenceId   String?
  
  reason      String?
  notes       String?
  
  batch       Batch?    @relation(fields: [batchId], references: [id])
  warehouse   Warehouse @relation(fields: [warehouseId], references: [id])
  
  createdAt   DateTime @default(now())
  createdBy   String
  
  @@index([productId, warehouseId])
  @@index([createdAt])
}

model Recipe {
  id          String  @id @default(uuid())
  productId   String  @unique // Final product
  
  ingredients RecipeIngredient[]
  
  yield       Int     @default(1)  // How many units produced
  costPerUnit Decimal @db.Decimal(10, 2)
  
  isActive    Boolean @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model RecipeIngredient {
  id          String  @id @default(uuid())
  recipeId    String
  productId   String  // Ingredient product
  
  quantity    Decimal @db.Decimal(10, 3)
  unit        String  // kg, g, L, ml, pieces
  
  recipe      Recipe  @relation(fields: [recipeId], references: [id])
  
  @@index([recipeId])
  @@index([productId])
}
```

---

## **FIFO STRATEGY**

```typescript
// strategies/fifo.strategy.ts
import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import Decimal from 'decimal.js';

export interface DeductionResult {
  batchId: string;
  quantity: number;
  unitCost: Decimal;
  totalCost: Decimal;
}

@Injectable()
export class FIFOStrategy {
  constructor(private readonly prisma: PrismaClient) {}

  async deduct(
    productId: string,
    warehouseId: string,
    quantity: number
  ): Promise<DeductionResult[]> {
    // Get batches ordered by receivedAt (FIFO)
    const batches = await this.prisma.batch.findMany({
      where: {
        productId,
        warehouseId,
        remaining: { gt: 0 }
      },
      orderBy: { receivedAt: 'asc' }  // Oldest first
    });

    let remaining = quantity;
    const deductions: DeductionResult[] = [];

    for (const batch of batches) {
      if (remaining <= 0) break;

      const deductQty = Math.min(remaining, batch.remaining);
      const unitCost = new Decimal(batch.unitCost);
      const totalCost = unitCost.times(deductQty);

      deductions.push({
        batchId: batch.id,
        quantity: deductQty,
        unitCost,
        totalCost
      });

      // Update batch
      await this.prisma.batch.update({
        where: { id: batch.id },
        data: { remaining: batch.remaining - deductQty }
      });

      remaining -= deductQty;
    }

    if (remaining > 0) {
      throw new InsufficientStockException(
        `Insufficient stock for product ${productId}. Short by ${remaining} units.`
      );
    }

    return deductions;
  }

  async getAvailableStock(
    productId: string,
    warehouseId: string
  ): Promise<number> {
    const result = await this.prisma.batch.aggregate({
      where: {
        productId,
        warehouseId,
        remaining: { gt: 0 }
      },
      _sum: { remaining: true }
    });

    return result._sum.remaining || 0;
  }

  async getCostOfGoodsSold(
    productId: string,
    quantity: number
  ): Promise<Decimal> {
    const deductions = await this.deduct(productId, 'main', quantity);
    return deductions.reduce(
      (sum, d) => sum.plus(d.totalCost),
      new Decimal(0)
    );
  }
}
```

---

## **SERVICE**

```typescript
// inventory.service.ts
import { Injectable } from '@nestjs/common';
import { InventoryRepository } from './inventory.repository';
import { FIFOStrategy } from './strategies/fifo.strategy';
import { IEventBus } from '@/core/event-bus/event-bus.interface';
import { StockDeductedEvent, StockAdjustedEvent } from './events';

@Injectable()
export class InventoryService {
  constructor(
    private readonly inventoryRepo: InventoryRepository,
    private readonly fifoStrategy: FIFOStrategy,
    private readonly eventBus: IEventBus
  ) {}

  async deductStock(
    productId: string,
    warehouseId: string,
    quantity: number,
    referenceType: string,
    referenceId: string
  ): Promise<void> {
    // Use FIFO to deduct from batches
    const deductions = await this.fifoStrategy.deduct(
      productId,
      warehouseId,
      quantity
    );

    // Create movements
    for (const deduction of deductions) {
      await this.inventoryRepo.createMovement({
        type: 'OUT',
        productId,
        warehouseId,
        batchId: deduction.batchId,
        quantity: -deduction.quantity,  // Negative for OUT
        unitCost: deduction.unitCost.toNumber(),
        totalValue: deduction.totalCost.toNumber(),
        referenceType,
        referenceId,
        createdBy: 'system'
      });
    }

    // Publish event
    await this.eventBus.publish('StockDeducted',
      new StockDeductedEvent(productId, quantity, warehouseId)
    );
  }

  async addStock(
    productId: string,
    warehouseId: string,
    quantity: number,
    unitCost: Decimal,
    expiryDate?: Date
  ): Promise<void> {
    // Create new batch
    const batch = await this.inventoryRepo.createBatch({
      productId,
      warehouseId,
      quantity,
      remaining: quantity,
      unitCost: unitCost.toNumber(),
      expiryDate
    });

    // Create movement
    await this.inventoryRepo.createMovement({
      type: 'IN',
      productId,
      warehouseId,
      batchId: batch.id,
      quantity,
      unitCost: unitCost.toNumber(),
      totalValue: unitCost.times(quantity).toNumber(),
      referenceType: 'PURCHASE',
      createdBy: 'system'
    });
  }

  async adjustStock(
    productId: string,
    warehouseId: string,
    quantity: number,
    reason: string,
    userId: string
  ): Promise<void> {
    await this.inventoryRepo.createMovement({
      type: 'ADJUSTMENT',
      productId,
      warehouseId,
      quantity,
      reason,
      createdBy: userId
    });

    await this.eventBus.publish('StockAdjusted',
      new StockAdjustedEvent(productId, quantity, reason)
    );
  }

  async getAvailableStock(
    productId: string,
    warehouseId: string
  ): Promise<number> {
    return this.fifoStrategy.getAvailableStock(productId, warehouseId);
  }

  async transferStock(
    productId: string,
    fromWarehouseId: string,
    toWarehouseId: string,
    quantity: number,
    userId: string
  ): Promise<void> {
    // Deduct from source
    await this.deductStock(
      productId,
      fromWarehouseId,
      quantity,
      'TRANSFER',
      `transfer-${Date.now()}`
    );

    // Get average cost from source batches
    const avgCost = await this.getAverageCost(productId, fromWarehouseId);

    // Add to destination
    await this.addStock(
      productId,
      toWarehouseId,
      quantity,
      avgCost
    );
  }

  private async getAverageCost(
    productId: string,
    warehouseId: string
  ): Promise<Decimal> {
    const batches = await this.inventoryRepo.findBatchesByProduct(
      productId,
      warehouseId
    );

    if (batches.length === 0) {
      return new Decimal(0);
    }

    const totalValue = batches.reduce((sum, batch) => 
      sum.plus(new Decimal(batch.unitCost).times(batch.remaining)),
      new Decimal(0)
    );

    const totalQty = batches.reduce((sum, batch) => 
      sum + batch.remaining, 
      0
    );

    return totalValue.dividedBy(totalQty);
  }
}
```

---

## **EVENT HANDLERS**

```typescript
// handlers/order-created.handler.ts
import { Injectable } from '@nestjs/common';
import { EventHandler } from '@/core/event-bus/decorators';
import { IEventHandler } from '@/core/event-bus/event-bus.interface';
import { OrderCreatedEvent } from '@/modules/sales/events';
import { InventoryService } from '../inventory.service';

@Injectable()
@EventHandler('OrderCreated')
export class InventoryDeductionHandler 
  implements IEventHandler<OrderCreatedEvent> {
  
  constructor(private readonly inventoryService: InventoryService) {}

  async handle(event: OrderCreatedEvent): Promise<void> {
    // Deduct stock for each item
    for (const item of event.items) {
      await this.inventoryService.deductStock(
        item.productId,
        'main',  // Main warehouse
        item.quantity,
        'ORDER',
        event.orderId
      );
    }
  }
}
```

---

## **KEY FEATURES**

1. **FIFO Costing** - Automatic oldest-first deduction
2. **Multi-Warehouse** - Track stock across locations
3. **Batch Tracking** - Lot numbers, expiry dates
4. **Movement History** - Complete audit trail
5. **Recipes** - Bill of materials for production
6. **Transfer** - Move stock between warehouses
7. **Event-Driven** - Automatic deduction on orders

---

## **NEXT**

- [05-MODULE-SALES.md](05-MODULE-SALES.md) - Orders with calculation pipeline
