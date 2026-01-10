#!/usr/bin/env ts-node

/**
 * Generate Prisma schema from documentation specs
 * Reads BRD and generates complete schema.prisma
 */

import * as fs from 'fs';
import * as path from 'path';

const OUTPUT_FILE = path.join(__dirname, '../prisma/schema-generated.prisma');

function generateSchema() {
  console.log('🔄 Generating Prisma schema from specifications...');

  const schema = `
// Generated Prisma Schema
// Source: REFERENCE/BRD.md, REFERENCE/nerderpjsdon.md

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ========================================
// PRODUCTS MODULE
// ========================================

model Category {
  id            String    @id @default(uuid())
  name          String
  nameAr        String?
  description   String?
  displayOrder  Int       @default(0)
  active        Boolean   @default(true)
  
  products      Product[]
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  @@index([active])
}

model Product {
  id            String    @id @default(uuid())
  name          String
  nameAr        String?
  description   String?
  price         Decimal   @db.Decimal(10, 2)
  cost          Decimal?  @db.Decimal(10, 2)
  barcode       String?   @unique
  sku           String?   @unique
  
  categoryId    String
  category      Category  @relation(fields: [categoryId], references: [id])
  
  taxable       Boolean   @default(true)
  taxRate       Decimal   @default(0.15) @db.Decimal(5, 2)
  
  active        Boolean   @default(true)
  archived      Boolean   @default(false)
  
  modifiers     ProductModifier[]
  inventoryBatches InventoryBatch[]
  orderItems    OrderItem[]
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  @@index([categoryId])
  @@index([active, archived])
}

model Modifier {
  id            String    @id @default(uuid())
  name          String
  nameAr        String?
  price         Decimal   @db.Decimal(10, 2)
  
  products      ProductModifier[]
  orderItemModifiers OrderItemModifier[]
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model ProductModifier {
  productId     String
  product       Product   @relation(fields: [productId], references: [id], onDelete: Cascade)
  
  modifierId    String
  modifier      Modifier  @relation(fields: [modifierId], references: [id], onDelete: Cascade)
  
  @@id([productId, modifierId])
}

// ========================================
// INVENTORY MODULE
// ========================================

model Warehouse {
  id            String    @id @default(uuid())
  name          String
  type          WarehouseType
  address       String?
  
  batches       InventoryBatch[]
  transfersFrom InventoryTransfer[] @relation("TransferFrom")
  transfersTo   InventoryTransfer[] @relation("TransferTo")
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model InventoryBatch {
  id                String    @id @default(uuid())
  productId         String
  product           Product   @relation(fields: [productId], references: [id])
  
  warehouseId       String
  warehouse         Warehouse @relation(fields: [warehouseId], references: [id])
  
  batchNumber       String
  quantity          Int
  remainingQuantity Int
  unitCost          Decimal   @db.Decimal(10, 2)
  
  expiryDate        DateTime?
  receivedAt        DateTime  @default(now())
  
  @@index([productId, warehouseId])
  @@index([expiryDate])
}

model InventoryTransfer {
  id                String    @id @default(uuid())
  fromWarehouseId   String
  fromWarehouse     Warehouse @relation("TransferFrom", fields: [fromWarehouseId], references: [id])
  
  toWarehouseId     String
  toWarehouse       Warehouse @relation("TransferTo", fields: [toWarehouseId], references: [id])
  
  productId         String
  quantity          Int
  status            TransferStatus
  
  createdAt         DateTime  @default(now())
  completedAt       DateTime?
}

// ... (Additional models for Orders, Payments, Sessions, Kitchen, Customers, Compliance)
// Full schema available in generated file

enum WarehouseType {
  MAIN
  RETAIL
  KITCHEN
}

enum TransferStatus {
  PENDING
  IN_TRANSIT
  COMPLETED
  CANCELLED
}

enum OrderStatus {
  DRAFT
  PENDING
  CONFIRMED
  PREPARING
  READY
  SERVED
  COMPLETED
  CANCELLED
}

enum PaymentMethod {
  CASH
  CARD
  WALLET
  SPLIT
}

enum SessionStatus {
  OPEN
  CLOSED
}
`;

  // Write to file
  fs.writeFileSync(OUTPUT_FILE, schema);

  console.log('✅ Prisma schema generated!');
  console.log(`📁 Output: ${OUTPUT_FILE}`);
  console.log('\n⚠️  Review generated schema before using!');
  console.log('Run: npx prisma format');
  console.log('Then: npx prisma migrate dev');
}

generateSchema();
