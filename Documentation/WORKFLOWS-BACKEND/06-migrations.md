# Database Migrations

**Tool**: Prisma Migrate  
**Strategy**: Version-controlled schema changes  
**Safety**: Always backup before migration  

---

## **CREATE MIGRATION**

```bash
# Generate migration from schema changes
npx prisma migrate dev --name add_loyalty_system

# Preview changes
npx prisma migrate diff \
  --from-schema-datamodel prisma/schema.prisma \
  --to-schema-datasource dev \
  --script
```

---

## **MIGRATION FILES**

```sql
-- migrations/20260110_add_loyalty_system/migration.sql
CREATE TABLE "LoyaltyTier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "minPoints" INTEGER NOT NULL,
    "discount" DECIMAL(5,2) NOT NULL,
    PRIMARY KEY ("id")
);

CREATE TABLE "LoyaltyProgram" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "tierId" TEXT,
    "points" INTEGER NOT NULL DEFAULT 0,
    "lifetimePoints" INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY ("id")
);

ALTER TABLE "LoyaltyProgram" 
ADD CONSTRAINT "LoyaltyProgram_customerId_fkey" 
FOREIGN KEY ("customerId") REFERENCES "Customer"("id");

CREATE UNIQUE INDEX "LoyaltyProgram_customerId_key" 
ON "LoyaltyProgram"("customerId");
```

---

## **SEEDING**

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import Decimal from 'decimal.js';

const prisma = new PrismaClient();

async function main() {
  // Seed loyalty tiers
  await prisma.loyaltyTier.createMany({
    data: [
      { id: '1', name: 'Bronze', minPoints: 0, discount: new Decimal('0.00') },
      { id: '2', name: 'Silver', minPoints: 100, discount: new Decimal('5.00') },
      { id: '3', name: 'Gold', minPoints: 500, discount: new Decimal('10.00') },
      { id: '4', name: 'Platinum', minPoints: 1000, discount: new Decimal('15.00') },
    ],
  });

  // Seed categories
  await prisma.category.createMany({
    data: [
      { name: 'Food', displayOrder: 1 },
      { name: 'Beverages', displayOrder: 2 },
      { name: 'Desserts', displayOrder: 3 },
    ],
  });

  console.log('✅ Database seeded');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

---

## **RUN MIGRATIONS**

```bash
# Development
npx prisma migrate dev

# Production (DANGEROUS - backup first!)
npx prisma migrate deploy

# Reset database (DEV ONLY)
npx prisma migrate reset
```

---

## **DATA MIGRATIONS**

```typescript
// For complex data transformations
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateOrderNumbers() {
  const orders = await prisma.order.findMany();
  
  for (const order of orders) {
    const newNumber = `ORD-${order.createdAt.getFullYear()}-${String(order.id).padStart(6, '0')}`;
    
    await prisma.order.update({
      where: { id: order.id },
      data: { orderNumber: newNumber },
    });
  }
}
```

---

## **ROLLBACK**

```bash
# View migration history
npx prisma migrate status

# Rollback last migration (manual)
# 1. Delete migration file
# 2. Run: npx prisma migrate dev
```

---

**NEXT**: [07-testing.md](07-testing.md)
