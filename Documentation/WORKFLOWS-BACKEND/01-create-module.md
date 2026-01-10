# Workflow: Create New Module

**Time**: 30 minutes  
**Difficulty**: Medium  
**Pattern**: LEGO Architecture

---

## **PREREQUISITES**

✅ NestJS CLI installed  
✅ Prisma schema ready  
✅ Understanding of Repository pattern  
✅ Understanding of Event Bus

---

## **STEP 1: Define Entity (Prisma Schema)**

```prisma
// prisma/schema.prisma

model YourEntity {
  id          String   @id @default(uuid())
  name        String
  nameAr      String
  description String?
  
  // Add your fields
  price       Decimal  @db.Decimal(10, 2)
  quantity    Int      @default(0)
  
  // Status
  isActive    Boolean  @default(true)
  
  // Audit
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  createdBy   String
  
  @@index([name])
}
```

**Run migration:**

```bash
npx prisma migrate dev --name add_your_entity
npx prisma generate
```

---

## **STEP 2: Create Module Structure**

```bash
# Create module folder
mkdir src/modules/your-module

# Create files
touch src/modules/your-module/your-module.module.ts
touch src/modules/your-module/your-module.controller.ts
touch src/modules/your-module/your-module.service.ts
touch src/modules/your-module/your-module.repository.ts

# Create subfolders
mkdir src/modules/your-module/entities
mkdir src/modules/your-module/dto
mkdir src/modules/your-module/events
mkdir src/modules/your-module/handlers
```

---

## **STEP 3: Create Repository**

```typescript
// your-module.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { BaseRepository } from '@/core/repository/base.repository';
import { YourEntity } from './entities/your-entity.entity';

@Injectable()
export class YourModuleRepository extends BaseRepository<YourEntity> {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  protected get model() { 
    return 'yourEntity';  // Must match Prisma model name (camelCase)
  }

  // Add custom queries
  async findByName(name: string): Promise<YourEntity[]> {
    return this.prisma.yourEntity.findMany({
      where: { name: { contains: name, mode: 'insensitive' } }
    });
  }

  async findActive(): Promise<YourEntity[]> {
    return this.prisma.yourEntity.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });
  }
}
```

---

## **STEP 4: Create DTOs**

```typescript
// dto/create-your-entity.dto.ts
import { IsString, IsNumber, IsBoolean, IsOptional } from 'class-validator';

export class CreateYourEntityDto {
  @IsString()
  name: string;

  @IsString()
  nameAr: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  price: number;  // Will convert to Decimal in service

  @IsOptional()
  @IsNumber()
  quantity?: number = 0;

  @IsString()
  createdBy: string;
}

// dto/update-your-entity.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateYourEntityDto } from './create-your-entity.dto';

export class UpdateYourEntityDto extends PartialType(CreateYourEntityDto) {}
```

---

## **STEP 5: Create Service**

```typescript
// your-module.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { YourModuleRepository } from './your-module.repository';
import { IEventBus } from '@/core/event-bus/event-bus.interface';
import { YourEntityCreatedEvent } from './events/your-entity-created.event';
import { CreateYourEntityDto, UpdateYourEntityDto } from './dto';
import Decimal from 'decimal.js';

@Injectable()
export class YourModuleService {
  constructor(
    private readonly repo: YourModuleRepository,
    private readonly eventBus: IEventBus
  ) {}

  async create(dto: CreateYourEntityDto): Promise<YourEntity> {
    // Convert to Decimal
    const data = {
      ...dto,
      price: new Decimal(dto.price).toNumber()
    };

    const entity = await this.repo.create(data);

    // Publish event
    await this.eventBus.publish('YourEntityCreated', 
      new YourEntityCreatedEvent(entity.id, entity.name)
    );

    return entity;
  }

  async findById(id: string): Promise<YourEntity> {
    const entity = await this.repo.findById(id);
    if (!entity) {
      throw new NotFoundException(`Entity ${id} not found`);
    }
    return entity;
  }

  async findAll(): Promise<YourEntity[]> {
    return this.repo.findActive();
  }

  async update(id: string, dto: UpdateYourEntityDto): Promise<YourEntity> {
    const existing = await this.findById(id);
    
    const data = {
      ...dto,
      price: dto.price ? new Decimal(dto.price).toNumber() : undefined
    };

    return this.repo.update(id, data);
  }

  async delete(id: string): Promise<void> {
    await this.findById(id);  // Ensure exists
    await this.repo.delete(id);
  }
}
```

---

## **STEP 6: Create Events**

```typescript
// events/your-entity-created.event.ts
import { DomainEvent } from '@/core/event-bus/domain-event';

export class YourEntityCreatedEvent extends DomainEvent {
  constructor(
    public readonly entityId: string,
    public readonly name: string
  ) {
    super();
  }
}

// events/your-entity-updated.event.ts
export class YourEntityUpdatedEvent extends DomainEvent {
  constructor(
    public readonly entityId: string,
    public readonly name: string
  ) {
    super();
  }
}
```

---

## **STEP 7: Create Controller**

```typescript
// your-module.controller.ts
import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { YourModuleService } from './your-module.service';
import { CreateYourEntityDto, UpdateYourEntityDto } from './dto';

@Controller('your-entities')
export class YourModuleController {
  constructor(private readonly service: YourModuleService) {}

  @Post()
  async create(@Body() dto: CreateYourEntityDto) {
    return this.service.create(dto);
  }

  @Get()
  async findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateYourEntityDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.service.delete(id);
    return { message: 'Deleted successfully' };
  }
}
```

---

## **STEP 8: Create Module Definition**

```typescript
// your-module.module.ts
import { Module } from '@nestjs/common';
import { YourModuleController } from './your-module.controller';
import { YourModuleService } from './your-module.service';
import { YourModuleRepository } from './your-module.repository';
import { PrismaModule } from '@/core/prisma/prisma.module';
import { EventBusModule } from '@/core/event-bus/event-bus.module';

@Module({
  imports: [PrismaModule, EventBusModule],
  controllers: [YourModuleController],
  providers: [YourModuleService, YourModuleRepository],
  exports: [YourModuleService]  // Export if used by other modules
})
@Plugin({ 
  name: 'your-module',
  enabled: process.env.ENABLE_YOUR_MODULE === 'true' 
})
export class YourModuleModule {}
```

---

## **STEP 9: Register Module**

```typescript
// app.module.ts
import { YourModuleModule } from './modules/your-module/your-module.module';

@Module({
  imports: [
    // ... other modules
    YourModuleModule,  // Add here
  ],
})
export class AppModule {}
```

---

## **STEP 10: Add Environment Variable**

```bash
# .env
ENABLE_YOUR_MODULE=true
```

---

## **STEP 11: Test**

```bash
# Start server
npm run start:dev

# Test endpoints
curl -X POST http://localhost:3000/your-entities \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","nameAr":"اختبار","price":99.99,"createdBy":"admin"}'

curl http://localhost:3000/your-entities
```

---

## **CHECKLIST**

- [ ] Prisma entity defined with indexes
- [ ] Migration created and run
- [ ] Repository extends BaseRepository
- [ ] DTOs have validation decorators
- [ ] Service uses Decimal.js for money
- [ ] Service publishes events
- [ ] Controller has CRUD endpoints
- [ ] Module registered in app.module.ts
- [ ] Environment variable added
- [ ] Endpoints tested

---

## **COMMON ERRORS**

**Error**: "Cannot find module"  
**Fix**: Run `npx prisma generate` after schema changes

**Error**: "Decimal places lost"  
**Fix**: Use `Decimal.js`, never native numbers for money

**Error**: "Event not firing"  
**Fix**: Ensure EventBusModule is imported

---

## **NEXT STEPS**

- [02-add-event-handler.md](02-add-event-handler.md) - Listen to events from other modules
- [03-add-calculation-step.md](03-add-calculation-step.md) - Add to calculation pipeline
