#!/usr/bin/env ts-node

/**
 * Generate TypeScript types from Prisma schema
 * Run: ts-node scripts/generate-types.ts
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const OUTPUT_DIR = path.join(__dirname, '../types/generated');

async function generateTypes() {
  console.log('🔄 Generating types from Prisma schema...');

  try {
    // Generate Prisma Client (includes types)
    execSync('npx prisma generate', { stdio: 'inherit' });

    // Create output directory
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // Copy Prisma types
    const prismaTypes = `
// Auto-generated from Prisma schema
// DO NOT EDIT MANUALLY

export * from '@prisma/client';

import { Prisma } from '@prisma/client';
import Decimal from 'decimal.js';

// Helper types for Decimal fields
export type DecimalFieldRefInput<$PrismaModel> =
  Prisma.FieldRefInputType<$PrismaModel, 'Decimal'>;

// Common query types
export type ProductWithCategory = Prisma.ProductGetPayload<{
  include: { category: true };
}>;

export type OrderWithItems = Prisma.OrderGetPayload<{
  include: {
    items: {
      include: {
        product: true;
        modifiers: true;
      };
    };
    payments: true;
    customer: true;
  };
}>;

export type SessionWithTransactions = Prisma.SessionGetPayload<{
  include: {
    payments: true;
    cashMovements: true;
  };
}>;

// DTO types (for API requests)
export interface CreateProductDto {
  name: string;
  price: number;
  categoryId: string;
  barcode?: string;
  description?: string;
  active?: boolean;
}

export interface UpdateProductDto extends Partial<CreateProductDto> {}

export interface CreateOrderDto {
  type: 'QUICK_SALE' | 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
  items: OrderItemDto[];
  customerId?: string;
  tableId?: string;
  deliveryAddress?: string;
  notes?: string;
}

export interface OrderItemDto {
  productId: string;
  quantity: number;
  modifiers?: string[];
  notes?: string;
}

export interface CreatePaymentDto {
  orderId: string;
  method: 'CASH' | 'CARD' | 'WALLET';
  amount: number;
  reference?: string;
}

// Response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
}
`;

    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'prisma-types.ts'),
      prismaTypes
    );

    // Generate Zod schemas from Prisma
    console.log('🔄 Generating Zod schemas...');
    
    const zodSchemas = `
// Auto-generated Zod schemas
import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().min(1).max(100),
  price: z.number().positive(),
  categoryId: z.string().uuid(),
  barcode: z.string().optional(),
  description: z.string().optional(),
  active: z.boolean().default(true),
});

export const createOrderSchema = z.object({
  type: z.enum(['QUICK_SALE', 'DINE_IN', 'TAKEAWAY', 'DELIVERY']),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive(),
    modifiers: z.array(z.string()).optional(),
    notes: z.string().optional(),
  })).min(1),
  customerId: z.string().uuid().optional(),
  tableId: z.string().uuid().optional(),
  deliveryAddress: z.string().optional(),
  notes: z.string().optional(),
});

export const createPaymentSchema = z.object({
  orderId: z.string().uuid(),
  method: z.enum(['CASH', 'CARD', 'WALLET']),
  amount: z.number().positive(),
  reference: z.string().optional(),
});
`;

    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'zod-schemas.ts'),
      zodSchemas
    );

    console.log('✅ Types generated successfully!');
    console.log(`📁 Output: ${OUTPUT_DIR}`);

  } catch (error) {
    console.error('❌ Error generating types:', error);
    process.exit(1);
  }
}

generateTypes();
