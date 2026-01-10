// Inventory Entities
// Source: FINAL/BACKEND/04-MODULE-INVENTORY.md

export interface Warehouse {
    id: string;
    code: string;
    nameAr: string;
    nameEn: string;
    location?: string | null;
    isDefault: boolean;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface InventoryItem {
    id: string;
    productId: string;
    warehouseId: string;
    quantityOnHand: number;
    quantityReserved: number;
    minimumLevel: number;
    maximumLevel?: number | null;
    reorderPoint: number;
    averageCost: number;
}

export interface InventoryBatch {
    id: string;
    inventoryItemId: string;
    batchNumber?: string | null;
    receivedDate: Date;
    expiryDate?: Date | null;
    quantityReceived: number;
    quantityRemaining: number;
    costPerUnit: number;
    isVirtualNegative: boolean;
}

// Movement entity for tracking all stock changes
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

// Recipe for production items (MAKE_TO_ORDER / MAKE_TO_STOCK)
export interface Recipe {
    id: string;
    productId: string; // Final product
    yield: number; // How many units produced
    costPerUnit: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface RecipeIngredient {
    id: string;
    recipeId: string;
    productId: string; // Ingredient product
    quantity: number;
    unit: string; // kg, g, L, ml, pieces
}

// FIFO Deduction Result
export interface DeductionResult {
    batchId: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
}
