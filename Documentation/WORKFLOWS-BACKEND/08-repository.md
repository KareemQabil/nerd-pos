# Repository Pattern Implementation

**Purpose**: Abstract Prisma from business logic  
**Benefit**: Testable, swappable data layer  
**Rule**: NO direct Prisma in services  

---

## **REPOSITORY BASE**

```typescript
// common/repository.base.ts
import { PrismaService } from '../prisma/prisma.service';

export abstract class BaseRepository<T> {
  constructor(
    protected prisma: PrismaService,
    protected modelName: string,
  ) {}

  async findById(id: string): Promise<T | null> {
    return this.prisma[this.modelName].findUnique({ where: { id } });
  }

  async findAll(filter?: any): Promise<T[]> {
    return this.prisma[this.modelName].findMany(filter);
  }

  async create(data: any): Promise<T> {
    return this.prisma[this.modelName].create({ data });
  }

  async update(id: string, data: any): Promise<T> {
    return this.prisma[this.modelName].update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma[this.modelName].delete({ where: { id } });
  }

  async count(filter?: any): Promise<number> {
    return this.prisma[this.modelName].count(filter);
  }
}
```

---

## **SPECIFIC REPOSITORY**

```typescript
// products/product.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BaseRepository } from '../common/repository.base';
import { Product } from '@prisma/client';
import Decimal from 'decimal.js';

@Injectable()
export class ProductRepository extends BaseRepository<Product> {
  constructor(prisma: PrismaService) {
    super(prisma, 'product');
  }

  // Custom query methods
  async findByCategory(categoryId: string): Promise<Product[]> {
    return this.prisma.product.findMany({
      where: { categoryId },
      include: { category: true, modifiers: true },
      orderBy: { name: 'asc' },
    });
  }

  async findActive(): Promise<Product[]> {
    return this.prisma.product.findMany({
      where: { 
        active: true,
        archived: false,
      },
    });
  }

  async updatePrice(id: string, price: Decimal): Promise<Product> {
    return this.prisma.product.update({
      where: { id },
      data: { price },
    });
  }

  async searchByName(query: string): Promise<Product[]> {
    return this.prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { barcode: { contains: query } },
        ],
      },
      take: 20,
    });
  }

  async bulkCreate(products: any[]): Promise<number> {
    const result = await this.prisma.product.createMany({
      data: products,
      skipDuplicates: true,
    });
    
    return result.count;
  }
}
```

---

## **SERVICE USAGE**

```typescript
// products/products.service.ts
import { Injectable } from '@nestjs/common';
import { ProductRepository } from './product.repository';
import Decimal from 'decimal.js';

@Injectable()
export class ProductsService {
  constructor(
    private readonly productRepository: ProductRepository,
  ) {}

  async create(dto: CreateProductDto) {
    // Business logic here
    const price = new Decimal(dto.price);
    
    if (price.lessThanOrEqualTo(0)) {
      throw new Error('Price must be positive');
    }

    return this.productRepository.create({
      ...dto,
      price,
    });
  }

  async findActive() {
    return this.productRepository.findActive();
  }

  async updatePrice(id: string, newPrice: number) {
    const price = new Decimal(newPrice);
    
    // Emit event
    this.eventBus.emit(new ProductPriceChangedEvent(id, price));
    
    return this.productRepository.updatePrice(id, price);
  }
}
```

---

## **MOCKING IN TESTS**

```typescript
describe('ProductsService', () => {
  let service: ProductsService;
  let repository: jest.Mocked<ProductRepository>;

  beforeEach(() => {
    const mockRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findActive: jest.fn(),
      updatePrice: jest.fn(),
    };

    service = new ProductsService(mockRepository as any);
    repository = mockRepository as any;
  });

  it('should create product', async () => {
    repository.create.mockResolvedValue({ id: '1', name: 'Test' } as any);
    
    const result = await service.create({ name: 'Test', price: 100 });
    
    expect(result).toHaveProperty('id');
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        price: expect.any(Decimal),
      })
    );
  });
});
```

---

## **TRANSACTION SUPPORT**

```typescript
async transferInventory(from: string, to: string, quantity: number) {
  return this.prisma.$transaction(async (tx) => {
    // Decrease source
    await tx.inventory.update({
      where: { id: from },
      data: { quantity: { decrement: quantity } },
    });

    // Increase destination
    await tx.inventory.update({
      where: { id: to },
      data: { quantity: { increment: quantity } },
    });

    // Log transfer
    await tx.inventoryTransfer.create({
      data: { from, to, quantity },
    });
  });
}
```

---

## **MODULE SETUP**

```typescript
// products/products.module.ts
import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { ProductRepository } from './product.repository';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ProductsController],
  providers: [
    ProductsService,
    ProductRepository,
  ],
  exports: [ProductRepository], // Export for other modules
})
export class ProductsModule {}
```

---

**Backend Workflows Complete ✅**
