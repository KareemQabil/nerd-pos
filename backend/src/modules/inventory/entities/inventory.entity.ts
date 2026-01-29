// Inventory Entities
// Source: FINAL/BACKEND/04-MODULE-INVENTORY.md
// Aligned with: prisma/schema.prisma
// Type-safe: Using Prisma's Decimal type

import { Prisma } from '@prisma/client';

// Re-export Decimal type for convenience
export type Decimal = Prisma.Decimal;

export interface Warehouse {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  isDefault: boolean;
  isActive: boolean;
}

export interface InventoryItem {
  id: string;
  productId: string;
  warehouseId: string;
  quantityOnHand: Decimal;
  quantityReserved: Decimal;
  minimumLevel: Decimal;
  maximumLevel?: Decimal | null;
  reorderPoint: Decimal;
  averageCost: Decimal;
}

export interface InventoryBatch {
  id: string;
  inventoryItemId: string;
  batchNumber?: string | null;
  receivedDate: Date;
  expiryDate?: Date | null;
  quantityReceived: Decimal;
  quantityRemaining: Decimal;
  costPerUnit: Decimal;
  isVirtualNegative: boolean;
}

// Recipe for production items (MAKE_TO_ORDER / MAKE_TO_STOCK)
export interface Recipe {
  id: string;
  productId: string; // Final product
  yieldQuantity: Decimal;
  yieldUnit: string; // PIECE, etc.
  isActive: boolean;
}

export interface RecipeIngredient {
  id: string;
  recipeId: string;
  ingredientProductId: string;
  quantityRequired: Decimal;
  unit: string; // kg, g, L, ml, pieces
  isPrepared: boolean;
}

// Response types with relations
export interface InventoryItemWithRelations extends InventoryItem {
  product?: any;
  warehouse?: Warehouse;
  batches?: InventoryBatch[];
}

export interface RecipeWithIngredients extends Recipe {
  product?: any;
  ingredients?: RecipeIngredient[];
}

// FIFO Deduction Result
export interface DeductionResult {
  batchId: string | null; // Null for virtual deductions (allow negative stock)
  quantity: Decimal;
  unitCost: Decimal;
  totalCost: Decimal;
  isVirtual?: boolean;
}

// Movement entity for tracking all stock changes (internal type, may need to add to schema)
export interface InventoryMovement {
  id: string;
  type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'TRANSFER' | string; // Allow string for Prisma compatibility
  productId: string;
  warehouseId: string;
  batchId?: string | null;
  quantity: Decimal; // Negative for OUT
  unitCost?: Decimal | null;
  totalValue?: Decimal | null;
  referenceType?: string | null; // ORDER, PURCHASE, ADJUSTMENT
  referenceId?: string | null;
  reason?: string | null;
  notes?: string | null;
  createdAt: Date;
  createdBy: string;
}
