# Backend Workflow: Creating a Service

**Task**: Implement business logic layer  
**Time**: 15-20 minutes  
**Depends On**: Repository created  

---

## **STEP 1: Create Service File**

```bash
# Location: src/modules/[module-name]/services/
touch src/modules/products/services/products.service.ts
```

---

## **STEP 2: Basic Service Structure**

```typescript
// products.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { ProductRepository } from '../repositories/product.repository';
import { IEventBus } from '@/shared/events/event-bus.interface';
import Decimal from 'decimal.js';

@Injectable()
export class ProductsService {
  constructor(
    private readonly productRepo: ProductRepository,
    private readonly categoryRepo: CategoryRepository,
    private readonly eventBus: IEventBus
  ) {}

  // Methods here
}
```

---

## **STEP 3: CRUD Operations**

```typescript
async create(dto: CreateProductDto): Promise<Product> {
  // Validate category exists
  const category = await this.categoryRepo.findById(dto.categoryId);
  if (!category) {
    throw new NotFoundException(`Category ${dto.categoryId} not found`);
  }

  // Create product
  const product = await this.productRepo.create({
    code: await this.generateProductCode(),
    name: dto.name,
    nameAr: dto.nameAr,
    categoryId: dto.categoryId,
    price: new Decimal(dto.price).toNumber(),
    cost: new Decimal(dto.cost).toNumber(),
    isActive: true
  });

  // Emit event
  await this.eventBus.publish('ProductCreated',
    new ProductCreatedEvent(product.id, product.name)
  );

  return product;
}

async findAll(filters?: ProductFilters): Promise<Product[]> {
  return this.productRepo.findAll(filters);
}

async findById(id: string): Promise<Product> {
  const product = await this.productRepo.findById(id);
  if (!product) {
    throw new NotFoundException(`Product ${id} not found`);
  }
  return product;
}

async update(id: string, dto: UpdateProductDto): Promise<Product> {
  const product = await this.findById(id);

  const updated = await this.productRepo.update(id, {
    ...dto,
    price: dto.price ? new Decimal(dto.price).toNumber() : undefined,
    cost: dto.cost ? new Decimal(dto.cost).toNumber() : undefined
  });

  await this.eventBus.publish('ProductUpdated',
    new ProductUpdatedEvent(updated.id, updated.name)
  );

  return updated;
}

async delete(id: string): Promise<void> {
  await this.findById(id); // Ensure exists
  await this.productRepo.update(id, { isActive: false });

  await this.eventBus.publish('ProductDeleted',
    new ProductDeletedEvent(id)
  );
}
```

---

## **STEP 4: Business Logic (Decimal.js)**

```typescript
async calculatePrice(productId: string, modifiers?: Modifier[]): Promise<Decimal> {
  const product = await this.findById(productId);
  
  // Start with base price
  let total = new Decimal(product.price);

  // Add modifier prices
  if (modifiers) {
    for (const modifier of modifiers) {
      total = total.plus(new Decimal(modifier.price));
    }
  }

  return total;
}

async checkProfitability(productId: string): Promise<{
  cost: Decimal;
  price: Decimal;
  margin: Decimal;
  marginPercent: Decimal;
}> {
  const product = await this.findById(productId);

  const cost = new Decimal(product.cost);
  const price = new Decimal(product.price);
  const margin = price.minus(cost);
  const marginPercent = margin.dividedBy(price).times(100);

  return {
    cost,
    price,
    margin,
    marginPercent
  };
}
```

---

## **STEP 5: Complex Operations**

```typescript
async bulkUpdatePrices(
  categoryId: string,
  adjustmentPercent: number
): Promise<void> {
  const products = await this.productRepo.findByCategory(categoryId);
  const adjustment = new Decimal(adjustmentPercent).dividedBy(100);

  for (const product of products) {
    const currentPrice = new Decimal(product.price);
    const newPrice = currentPrice.times(adjustment.plus(1));

    await this.productRepo.update(product.id, {
      price: newPrice.toNumber()
    });
  }

  await this.eventBus.publish('BulkPriceUpdate',
    new BulkPriceUpdateEvent(categoryId, adjustmentPercent)
  );
}
```

---

## **STEP 6: Error Handling**

```typescript
async deactivateProduct(id: string): Promise<Product> {
  const product = await this.findById(id);

  // Check if product is used in active orders
  const hasActiveOrders = await this.orderRepo.hasActiveOrders(id);
  if (hasActiveOrders) {
    throw new BadRequestException(
      'Cannot deactivate product with active orders'
    );
  }

  return this.productRepo.update(id, { isActive: false });
}
```

---

## **STEP 7: Helper Methods**

```typescript
private async generateProductCode(): Promise<string> {
  const date = new Date();
  const prefix = `PRD${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}`;
  const count = await this.productRepo.countByPrefix(prefix);
  return `${prefix}${(count + 1).toString().padStart(5, '0')}`;
}

private validatePrice(price: number): void {
  const decimal = new Decimal(price);
  if (decimal.lessThanOrEqualTo(0)) {
    throw new BadRequestException('Price must be greater than 0');
  }
}
```

---

## **STEP 8: Module Registration**

```typescript
// products.module.ts
import { Module } from '@nestjs/common';
import { ProductsService } from './services/products.service';
import { ProductsController } from './controllers/products.controller';
import { ProductRepository } from './repositories/product.repository';

@Module({
  imports: [],
  controllers: [ProductsController],
  providers: [
    ProductsService,
    ProductRepository
  ],
  exports: [ProductsService] // Export for other modules
})
export class ProductsModule {}
```

---

## **CHECKLIST**

- [ ] Service injections (repository, event bus)
- [ ] CRUD methods implemented
- [ ] Decimal.js for all money calculations
- [ ] Events emitted for state changes
- [ ] Error handling with proper exceptions
- [ ] Helper methods for code generation
- [ ] Business logic methods
- [ ] Module exports service

---

## **COMMON PATTERNS**

**1. Transactions**:
```typescript
async transferInventory(from: string, to: string, qty: number): Promise<void> {
  await this.prisma.$transaction(async (tx) => {
    await tx.inventory.decrement({ where: { id: from }, data: { quantity: qty }});
    await tx.inventory.increment({ where: { id: to }, data: { quantity: qty }});
  });
}
```

**2. Validation**:
```typescript
private async validateUnique(name: string): Promise<void> {
  const existing = await this.productRepo.findByName(name);
  if (existing) {
    throw new ConflictException(`Product "${name}" already exists`);
  }
}
```

**3. Aggregations**:
```typescript
async getCategoryStats(categoryId: string): Promise<any> {
  const products = await this.productRepo.findByCategory(categoryId);
  
  const totalCost = products.reduce(
    (sum, p) => sum.plus(new Decimal(p.cost)),
    new Decimal(0)
  );
  
  const avgPrice = products.reduce(
    (sum, p) => sum.plus(new Decimal(p.price)),
    new Decimal(0)
  ).dividedBy(products.length);

  return { totalCost, avgPrice, count: products.length };
}
```

---

**NEXT**: [03-event-handlers.md](03-event-handlers.md)
