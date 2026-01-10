# NestJS Module Structure

**Purpose**: Standard NestJS folder structure and organization  
**Pattern**: Feature-based modules with clear separation of concerns

---

## **PROJECT STRUCTURE**

```
nerdpos-backend/
├── src/
│   ├── main.ts                    ← Bootstrap app
│   ├── app.module.ts              ← Root module
│   │
│   ├── core/                      ← Shared infrastructure
│   │   ├── event-bus/
│   │   │   ├── event-bus.interface.ts
│   │   │   ├── event-bus.service.ts
│   │   │   ├── domain-event.ts
│   │   │   └── decorators/
│   │   │       ├── event-handler.decorator.ts
│   │   │       └── calculation-step.decorator.ts
│   │   │
│   │   ├── repository/
│   │   │   ├── base.repository.ts
│   │   │   └── repository.interface.ts
│   │   │
│   │   ├── calculation/
│   │   │   ├── calculation-step.interface.ts
│   │   │   ├── calculation-context.ts
│   │   │   └── calculation-pipeline.ts
│   │   │
│   │   ├── workflow/
│   │   │   ├── workflow-step.interface.ts
│   │   │   ├── workflow-context.ts
│   │   │   └── workflow-orchestrator.ts
│   │   │
│   │   └── rule-engine/
│   │       ├── business-rule.interface.ts
│   │       ├── rule-result.ts
│   │       └── rule-engine.ts
│   │
│   ├── common/                    ← Utilities & decorators
│   │   ├── decorators/
│   │   │   ├── plugin.decorator.ts
│   │   │   ├── use-decimal.decorator.ts
│   │   │   └── offline-sync.decorator.ts
│   │   │
│   │   ├── guards/
│   │   │   ├── auth.guard.ts
│   │   │   └── roles.guard.ts
│   │   │
│   │   ├── interceptors/
│   │   │   ├── logging.interceptor.ts
│   │   │   └── transform.interceptor.ts
│   │   │
│   │   ├── pipes/
│   │   │   └── validation.pipe.ts
│   │   │
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts
│   │   │
│   │   └── utils/
│   │       ├── decimal.utils.ts
│   │       ├── date.utils.ts
│   │       └── hash.utils.ts
│   │
│   └── modules/                   ← Feature modules
│       │
│       ├── products/              ← MODULE 01
│       │   ├── products.module.ts
│       │   ├── products.controller.ts
│       │   ├── products.service.ts
│       │   ├── products.repository.ts
│       │   ├── entities/
│       │   │   ├── product.entity.ts
│       │   │   ├── category.entity.ts
│       │   │   └── modifier.entity.ts
│       │   ├── dto/
│       │   │   ├── create-product.dto.ts
│       │   │   ├── update-product.dto.ts
│       │   │   └── product-response.dto.ts
│       │   ├── events/
│       │   │   ├── product-created.event.ts
│       │   │   └── product-updated.event.ts
│       │   └── handlers/
│       │       └── product-created.handler.ts
│       │
│       ├── inventory/             ← MODULE 02
│       │   ├── inventory.module.ts
│       │   ├── inventory.controller.ts
│       │   ├── inventory.service.ts
│       │   ├── inventory.repository.ts
│       │   ├── entities/
│       │   │   ├── warehouse.entity.ts
│       │   │   ├── batch.entity.ts
│       │   │   ├── movement.entity.ts
│       │   │   └── recipe.entity.ts
│       │   ├── dto/
│       │   │   ├── stock-adjustment.dto.ts
│       │   │   ├── transfer.dto.ts
│       │   │   └── recipe.dto.ts
│       │   ├── events/
│       │   │   ├── stock-deducted.event.ts
│       │   │   └── stock-adjusted.event.ts
│       │   ├── handlers/
│       │   │   └── order-created.handler.ts
│       │   └── strategies/
│       │       └── fifo.strategy.ts
│       │
│       ├── sales/                 ← MODULE 03
│       │   ├── sales.module.ts
│       │   ├── sales.controller.ts
│       │   ├── sales.service.ts
│       │   ├── sales.repository.ts
│       │   ├── entities/
│       │   │   ├── order.entity.ts
│       │   │   ├── order-item.entity.ts
│       │   │   └── transaction.entity.ts
│       │   ├── dto/
│       │   │   ├── create-order.dto.ts
│       │   │   ├── update-order.dto.ts
│       │   │   └── order-response.dto.ts
│       │   ├── events/
│       │   │   ├── order-created.event.ts
│       │   │   ├── order-completed.event.ts
│       │   │   └── order-cancelled.event.ts
│       │   ├── handlers/
│       │   │   └── payment-completed.handler.ts
│       │   └── calculations/
│       │       ├── item-subtotal.step.ts
│       │       ├── service-charge.step.ts
│       │       ├── delivery-charge.step.ts
│       │       ├── tax.step.ts
│       │       ├── discount.step.ts
│       │       └── grand-total.step.ts
│       │
│       ├── payments/              ← MODULE 04
│       ├── sessions/              ← MODULE 05
│       ├── tables/                ← MODULE 06
│       ├── kitchen/               ← MODULE 07
│       ├── customers/             ← MODULE 08
│       ├── delivery/              ← MODULE 09
│       ├── discounts/             ← MODULE 10
│       ├── users/                 ← MODULE 11
│       ├── settings/              ← MODULE 12
│       ├── compliance/            ← MODULE 13
│       ├── reports/               ← MODULE 14
│       ├── audit/                 ← MODULE 15
│       ├── accounting/            ← MODULE 16 (Phase 4)
│       ├── multi-currency/        ← MODULE 17 (Future)
│       ├── purchasing/            ← MODULE 18
│       └── production/            ← MODULE 19
│
├── prisma/
│   ├── schema.prisma              ← Database schema
│   ├── migrations/
│   └── seed.ts                    ← Seed data
│
├── test/
│   ├── e2e/                       ← End-to-end tests
│   └── integration/               ← Integration tests
│
├── .env.example
├── .env.development
├── .env.production
├── package.json
├── tsconfig.json
└── nest-cli.json
```

---

## **MODULE ANATOMY**

### **Example: Products Module**

```
modules/products/
│
├── products.module.ts            ← Module definition
│   @Module({
│     imports: [],
│     controllers: [ProductController],
│     providers: [ProductService, ProductRepository],
│     exports: [ProductService]
│   })
│
├── products.controller.ts        ← HTTP endpoints
│   @Controller('products')
│   - GET    /products              (list all)
│   - GET    /products/:id          (get by ID)
│   - POST   /products              (create)
│   - PUT    /products/:id          (update)
│   - DELETE /products/:id          (delete)
│   - GET    /products/category/:id (by category)
│
├── products.service.ts           ← Business logic
│   - createProduct()
│   - updateProduct()
│   - deleteProduct()
│   - getProductsByCategory()
│   - publishEvent()
│
├── products.repository.ts        ← Data access
│   extends BaseRepository<Product>
│   - findByCategory()
│   - findBySKU()
│   - searchByName()
│   - updateStock()
│
├── entities/                     ← Prisma models
│   ├── product.entity.ts
│   │   - id, name, sku, price, category
│   ├── category.entity.ts
│   │   - id, name, parentId
│   └── modifier.entity.ts
│       - id, name, options, price
│
├── dto/                          ← Data Transfer Objects
│   ├── create-product.dto.ts
│   │   @IsNotEmpty(), @IsNumber(), @IsOptional()
│   ├── update-product.dto.ts
│   │   extends PartialType(CreateProductDto)
│   └── product-response.dto.ts
│       - Expose only safe fields
│
├── events/                       ← Domain events
│   ├── product-created.event.ts
│   │   extends DomainEvent
│   └── product-updated.event.ts
│       extends DomainEvent
│
└── handlers/                     ← Event handlers
    └── product-created.handler.ts
        @EventHandler('ProductCreated')
        - Log to audit
        - Update search index
        - Clear cache
```

---

## **FILE TEMPLATES**

### **Module Definition**

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
  exports: [ProductService]  // Export if used by other modules
})
@Plugin({ 
  name: 'products',
  enabled: process.env.ENABLE_PRODUCTS === 'true' 
})
export class ProductsModule {}
```

### **Controller**

```typescript
// products.controller.ts
import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { ProductService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  async findAll() {
    return this.productService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.productService.findById(id);
  }

  @Post()
  async create(@Body() dto: CreateProductDto) {
    return this.productService.create(dto);
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

### **Service**

```typescript
// products.service.ts
import { Injectable } from '@nestjs/common';
import { ProductRepository } from './products.repository';
import { IEventBus } from '@/core/event-bus/event-bus.interface';
import { ProductCreatedEvent } from './events/product-created.event';

@Injectable()
export class ProductService {
  constructor(
    private readonly productRepo: ProductRepository,
    private readonly eventBus: IEventBus
  ) {}

  async create(dto: CreateProductDto): Promise<Product> {
    const product = await this.productRepo.create(dto);
    
    await this.eventBus.publish('ProductCreated', 
      new ProductCreatedEvent(product.id, product.name)
    );
    
    return product;
  }

  async findById(id: string): Promise<Product> {
    return this.productRepo.findById(id);
  }
}
```

### **Repository**

```typescript
// products.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { BaseRepository } from '@/core/repository/base.repository';
import { Product } from './entities/product.entity';

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
      where: { categoryId },
      include: { category: true }
    });
  }
}
```

---

## **ENVIRONMENT VARIABLES**

```bash
# .env.example

# App
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/nerdpos"

# Plugins (Enable/Disable Modules)
ENABLE_PRODUCTS=true
ENABLE_INVENTORY=true
ENABLE_SALES=true
ENABLE_PAYMENTS=true
ENABLE_SESSIONS=true
ENABLE_TABLES=true
ENABLE_KITCHEN=true
ENABLE_CUSTOMERS=true
ENABLE_DELIVERY=true
ENABLE_DISCOUNTS=true
ENABLE_USERS=true
ENABLE_SETTINGS=true
ENABLE_COMPLIANCE=true
ENABLE_REPORTS=true
ENABLE_AUDIT=true
ENABLE_ACCOUNTING=false    # Phase 4
ENABLE_MULTI_CURRENCY=false # Future
ENABLE_PURCHASING=true
ENABLE_PRODUCTION=true

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# ZATCA
ZATCA_API_URL=https://api.zatca.gov.sa
ZATCA_CLIENT_ID=your-client-id
ZATCA_CLIENT_SECRET=your-client-secret
```

---

## **PACKAGE.JSON**

```json
{
  "name": "nerdpos-backend",
  "version": "1.0.0",
  "scripts": {
    "build": "nest build",
    "start": "nest start",
    "start:dev": "nest start --watch",
    "start:prod": "node dist/main",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:seed": "ts-node prisma/seed.ts"
  },
  "dependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/core": "^10.0.0",
    "@nestjs/platform-express": "^10.0.0",
    "@prisma/client": "^5.0.0",
    "decimal.js": "^10.4.3",
    "class-validator": "^0.14.0",
    "class-transformer": "^0.5.1",
    "bcrypt": "^5.1.0",
    "jsonwebtoken": "^9.0.0"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.0.0",
    "@nestjs/testing": "^10.0.0",
    "prisma": "^5.0.0",
    "typescript": "^5.0.0",
    "jest": "^29.0.0",
    "ts-node": "^10.9.0"
  }
}
```

---

## **TSCONFIG.JSON**

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2021",
    "lib": ["ES2021"],
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "paths": {
      "@/*": ["src/*"],
      "@core/*": ["src/core/*"],
      "@modules/*": ["src/modules/*"],
      "@common/*": ["src/common/*"]
    },
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": true,
    "noImplicitAny": true,
    "strictBindCallApply": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

---

## **NEXT STEPS**

**Implement Modules:**
- [03-MODULE-PRODUCTS.md](03-MODULE-PRODUCTS.md)
- [04-MODULE-INVENTORY.md](04-MODULE-INVENTORY.md)
- [05-MODULE-SALES.md](05-MODULE-SALES.md)

**Learn Workflows:**
- [WORKFLOWS-BACKEND/01-create-module.md](../WORKFLOWS-BACKEND/01-create-module.md)
