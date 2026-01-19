// Inventory Entities
// Source: FINAL/BACKEND/04-MODULE-INVENTORY.md
// Aligned with: prisma/schema.prisma

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
  quantityOnHand: number; // Decimal in DB
  quantityReserved: number; // Decimal in DB
  minimumLevel: number; // Decimal in DB
  maximumLevel?: number | null;
  reorderPoint: number; // Decimal in DB
  averageCost: number; // Decimal in DB
}

export interface InventoryBatch {
  id: string;
  inventoryItemId: string;
  batchNumber?: string | null;
  receivedDate: Date;
  expiryDate?: Date | null;
  quantityReceived: number; // Decimal in DB
  quantityRemaining: number; // Decimal in DB
  costPerUnit: number; // Decimal in DB
  isVirtualNegative: boolean;
}

// Recipe for production items (MAKE_TO_ORDER / MAKE_TO_STOCK)
export interface Recipe {
  id: string;
  productId: string; // Final product
  yieldQuantity: number; // Matches schema
  yieldUnit: string; // PIECE, etc.
  isActive: boolean;
}

export interface RecipeIngredient {
  id: string;
  recipeId: string;
  ingredientProductId: string; // Matches schema
  quantityRequired: number; // Matches schema
  unit: string; // kg, g, L, ml, pieces
  isPrepared: boolean; // Matches schema
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
  batchId: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

// Movement entity for tracking all stock changes (internal type, may need to add to schema)
export interface InventoryMovement {
  id: string;
  type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'TRANSFER';
  productId: string;
  warehouseId: string;
  batchId?: string | null;
  quantity: number; // Negative for OUT
  unitCost?: number | null;
  totalValue?: number | null;
  referenceType?: string | null; // ORDER, PURCHASE, ADJUSTMENT
  referenceId?: string | null;
  reason?: string | null;
  notes?: string | null;
  createdAt: Date;
  createdBy: string;
}
