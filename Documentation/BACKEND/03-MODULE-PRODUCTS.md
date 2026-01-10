# Products Module Implementation

**Module**: Products, Categories, Modifiers  
**Priority**: High (Foundation module)  
**Dependencies**: None (Base module)

---

## **OVERVIEW**

The Products module manages:
- **Products**: Menu items with SKU, price, tax settings
- **Categories**: Hierarchical organization (parent/child)
- **Modifiers**: Options like sizes, extras, customizations

---

## **ENTITIES**

### **Product Entity**

```prisma
// prisma/schema.prisma
model Product {
  id          String   @id @default(uuid())
  sku         String   @unique
  name        String
  nameAr      String
  description String?
  descriptionAr String?
  
  // Pricing
  price       Decimal  @db.Decimal(10, 2)
  cost        Decimal? @db.Decimal(10, 2)
  
  // Tax
  taxable     Boolean  @default(true)
  taxCategory String   @default("STANDARD") // STANDARD, ZERO_RATED, EXEMPT
  
  // Stock
  trackStock  Boolean  @default(true)
  currentStock Int     @default(0)
  minStock    Int      @default(0)
  
  // Category
  categoryId  String
  category    Category @relation(fields: [categoryId], references: [id])
  
  // Modifiers
  modifiers   ProductModifier[]
  
  // Status
  isActive    Boolean  @default(true)
  isAvailable Boolean  @default(true)
  
  // Audit
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  createdBy   String
  
  @@index([categoryId])
  @@index([sku])
}
```

### **Category Entity**

```prisma
model Category {
  id          String   @id @default(uuid())
  name        String
  nameAr      String
  description String?
  
  // Hierarchy
  parentId    String?
  parent      Category?  @relation("CategoryHierarchy", fields: [parentId], references: [id])
  children    Category[] @relation("CategoryHierarchy")
  
  // Display
  displayOrder Int      @default(0)
  color       String?
  icon        String?
  
  // Products
  products    Product[]
  
  // Status
  isActive    Boolean  @default(true)
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([parentId])
}
```

### **Modifier Entity**

```prisma
model Modifier {
  id            String  @id @default(uuid())
  name          String
  nameAr        String
  
  // Behavior
  required      Boolean @default(false)
  multiSelect   Boolean @default(false)
  minSelection  Int     @default(0)
  maxSelection  Int?
  
  // Options
  options       ModifierOption[]
  
  // Products
  products      ProductModifier[]
  
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model ModifierOption {
  id          String   @id @default(uuid())
  name        String
  nameAr      String
  price       Decimal  @db.Decimal(10, 2) @default(0)
  
  modifierId  String
  modifier    Modifier @relation(fields: [modifierId], references: [id])
  
  displayOrder Int     @default(0)
  isActive    Boolean  @default(true)
  
  @@index([modifierId])
}

model ProductModifier {
  productId   String
  product     Product  @relation(fields: [productId], references: [id])
  
  modifierId  String
  modifier    Modifier @relation(fields: [modifierId], references: [id])
  
  @@id([productId, modifierId])
}
```

---

## **DTOs**

### **Create Product DTO**

```typescript
// dto/create-product.dto.ts
import { IsString, IsNumber, IsBoolean, IsOptional, IsEnum, IsUUID } from 'class-validator';
import Decimal from 'decimal.js';

export class CreateProductDto {
  @IsString()
  sku: string;

  @IsString()
  name: string;

  @IsString()
  nameAr: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  descriptionAr?: string;

  @IsNumber()
  price: number;  // Will be converted to Decimal

  @IsOptional()
  @IsNumber()
  cost?: number;

  @IsBoolean()
  @IsOptional()
  taxable?: boolean = true;

  @IsEnum(['STANDARD', 'ZERO_RATED', 'EXEMPT'])
  @IsOptional()
  taxCategory?: string = 'STANDARD';

  @IsBoolean()
  @IsOptional()
  trackStock?: boolean = true;

  @IsNumber()
  @IsOptional()
  minStock?: number = 0;

  @IsUUID()
  categoryId: string;

  @IsOptional()
  modifierIds?: string[];

  @IsString()
  createdBy: string;
}
```

---

## **REPOSITORY**

```typescript
// products.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaClient, Product } from '@prisma/client';
import { BaseRepository } from '@/core/repository/base.repository';

@Injectable()
export class ProductRepository extends BaseRepository<Product> {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  protected get model() { 
    return 'product'; 
  }

  async findByCategory(categoryId: string): Promise<Product[]> {
    return this.prisma.product.findMany({
      where: { categoryId, isActive: true },
      include: {
        category: true,
        modifiers: {
          include: {
            modifier: {
              include: { options: true }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    });
  }

  async findBySKU(sku: string): Promise<Product | null> {
    return this.prisma.product.findUnique({
      where: { sku },
      include: {
        category: true,
        modifiers: {
          include: {
            modifier: {
              include: { options: true }
            }
          }
        }
      }
    });
  }

  async searchByName(query: string): Promise<Product[]> {
    return this.prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { nameAr: { contains: query, mode: 'insensitive' } },
          { sku: { contains: query, mode: 'insensitive' } }
        ],
        isActive: true
      },
      include: { category: true },
      take: 20
    });
  }

  async updateStock(productId: string, quantity: number): Promise<void> {
    await this.prisma.product.update({
      where: { id: productId },
      data: { currentStock: { increment: quantity } }
    });
  }

  async setAvailability(productId: string, isAvailable: boolean): Promise<void> {
    await this.prisma.product.update({
      where: { id: productId },
      data: { isAvailable }
    });
  }
}
```

---

## **SERVICE**

```typescript
// products.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { ProductRepository } from './products.repository';
import { IEventBus } from '@/core/event-bus/event-bus.interface';
import { ProductCreatedEvent, ProductUpdatedEvent } from './events';
import { CreateProductDto, UpdateProductDto } from './dto';
import Decimal from 'decimal.js';

@Injectable()
export class ProductService {
  constructor(
    private readonly productRepo: ProductRepository,
    private readonly eventBus: IEventBus
  ) {}

  async create(dto: CreateProductDto): Promise<Product> {
    // Convert price to Decimal
    const productData = {
      ...dto,
      price: new Decimal(dto.price).toNumber(),
      cost: dto.cost ? new Decimal(dto.cost).toNumber() : null
    };

    const product = await this.productRepo.create(productData);

    // Publish event
    await this.eventBus.publish('ProductCreated', 
      new ProductCreatedEvent(product.id, product.name, product.sku)
    );

    return product;
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const existing = await this.productRepo.findById(id);
    if (!existing) {
      throw new NotFoundException(`Product ${id} not found`);
    }

    const updateData = {
      ...dto,
      price: dto.price ? new Decimal(dto.price).toNumber() : undefined,
      cost: dto.cost ? new Decimal(dto.cost).toNumber() : undefined
    };

    const product = await this.productRepo.update(id, updateData);

    await this.eventBus.publish('ProductUpdated',
      new ProductUpdatedEvent(product.id, product.name)
    );

    return product;
  }

  async findById(id: string): Promise<Product> {
    const product = await this.productRepo.findById(id);
    if (!product) {
      throw new NotFoundException(`Product ${id} not found`);
    }
    return product;
  }

  async findByCategory(categoryId: string): Promise<Product[]> {
    return this.productRepo.findByCategory(categoryId);
  }

  async search(query: string): Promise<Product[]> {
    return this.productRepo.searchByName(query);
  }

  async delete(id: string): Promise<void> {
    await this.productRepo.delete(id);
  }
}
```

---

## **CONTROLLER**

```typescript
// products.controller.ts
import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ProductService } from './products.service';
import { CreateProductDto, UpdateProductDto } from './dto';

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  async create(@Body() dto: CreateProductDto) {
    return this.productService.create(dto);
  }

  @Get()
  async findAll() {
    return this.productService.findAll();
  }

  @Get('search')
  async search(@Query('q') query: string) {
    return this.productService.search(query);
  }

  @Get('category/:categoryId')
  async findByCategory(@Param('categoryId') categoryId: string) {
    return this.productService.findByCategory(categoryId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.productService.findById(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productService.update(id, dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.productService.delete(id);
  }
}
```

---

## **EVENTS**

```typescript
// events/product-created.event.ts
import { DomainEvent } from '@/core/event-bus/domain-event';

export class ProductCreatedEvent extends DomainEvent {
  constructor(
    public readonly productId: string,
    public readonly name: string,
    public readonly sku: string
  ) {
    super();
  }
}

// events/product-updated.event.ts
export class ProductUpdatedEvent extends DomainEvent {
  constructor(
    public readonly productId: string,
    public readonly name: string
  ) {
    super();
  }
}
```

---

## **MODULE**

```typescript
// products.module.ts
import { Module } from '@nestjs/common';
import { ProductController } from './products.controller';
import { ProductService } from './products.service';
import { ProductRepository } from './products.repository';
import { PrismaModule } from '@/core/prisma/prisma.module';
import { EventBusModule } from '@/core/event-bus/event-bus.module';

@Module({
  imports: [PrismaModule, EventBusModule],
  controllers: [ProductController],
  providers: [ProductService, ProductRepository],
  exports: [ProductService, ProductRepository]
})
@Plugin({ 
  name: 'products',
  enabled: process.env.ENABLE_PRODUCTS === 'true' 
})
export class ProductsModule {}
```

---

## **KEY FEATURES**

1. **Decimal.js for Pricing** - No floating point errors
2. **Hierarchical Categories** - Parent/child relationships
3. **Flexible Modifiers** - Required, multi-select, min/max
4. **Stock Tracking** - Optional per product
5. **Bilingual** - Arabic and English names
6. **Event-Driven** - ProductCreated, ProductUpdated events
7. **Search** - By name, SKU, category

---

## **NEXT MODULES**

- [04-MODULE-INVENTORY.md](04-MODULE-INVENTORY.md) - Stock management
- [05-MODULE-SALES.md](05-MODULE-SALES.md) - Orders and transactions
