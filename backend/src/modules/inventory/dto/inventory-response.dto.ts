import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WarehouseResponseDto {
  @ApiProperty({ description: 'Warehouse ID (UUID)', example: 'wh_123' })
  id: string;

  @ApiProperty({ description: 'Warehouse code', example: 'WH-MAIN' })
  code: string;

  @ApiProperty({ description: 'Warehouse name (Arabic)', example: 'Main Warehouse (AR)' })
  nameAr: string;

  @ApiProperty({ description: 'Warehouse name (English)', example: 'Main Warehouse' })
  nameEn: string;

  @ApiProperty({ description: 'Default warehouse flag', example: true })
  isDefault: boolean;

  @ApiProperty({ description: 'Is active', example: true })
  isActive: boolean;
}

export class InventoryItemResponseDto {
  @ApiProperty({ description: 'Inventory item ID (UUID)', example: 'inv_123' })
  id: string;

  @ApiProperty({ description: 'Product ID (UUID)', example: 'prod_123' })
  productId: string;

  @ApiProperty({ description: 'Warehouse ID (UUID)', example: 'wh_123' })
  warehouseId: string;

  @ApiProperty({ description: 'Quantity on hand', example: 150 })
  quantityOnHand: number;

  @ApiProperty({ description: 'Quantity reserved', example: 10 })
  quantityReserved: number;

  @ApiProperty({ description: 'Minimum level', example: 5 })
  minimumLevel: number;

  @ApiPropertyOptional({ description: 'Maximum level', example: 500 })
  maximumLevel?: number | null;

  @ApiProperty({ description: 'Reorder point', example: 20 })
  reorderPoint: number;

  @ApiProperty({ description: 'Average cost per unit', example: 15.5 })
  averageCost: number;
}

export class AvailableStockResponseDto {
  @ApiProperty({ description: 'Product ID (UUID)', example: 'prod_123' })
  productId: string;

  @ApiProperty({ description: 'Warehouse ID (UUID)', example: 'wh_123' })
  warehouseId: string;

  @ApiProperty({ description: 'Available quantity', example: 140 })
  availableQuantity: number;
}

export class InventoryBatchResponseDto {
  @ApiProperty({ description: 'Batch ID (UUID)', example: 'batch_123' })
  id: string;

  @ApiProperty({ description: 'Inventory item ID', example: 'inv_123' })
  inventoryItemId: string;

  @ApiPropertyOptional({ description: 'Batch number', example: 'BATCH-2025-001' })
  batchNumber?: string | null;

  @ApiProperty({ description: 'Received date', example: '2026-01-23T12:00:00Z' })
  receivedDate: Date;

  @ApiPropertyOptional({ description: 'Expiry date', example: '2026-12-31' })
  expiryDate?: Date | null;

  @ApiProperty({ description: 'Quantity received', example: 100 })
  quantityReceived: number;

  @ApiProperty({ description: 'Quantity remaining', example: 80 })
  quantityRemaining: number;

  @ApiProperty({ description: 'Cost per unit', example: 25.5 })
  costPerUnit: number;

  @ApiProperty({ description: 'Virtual negative batch', example: false })
  isVirtualNegative: boolean;
}

export class InventoryMovementResponseDto {
  @ApiProperty({ description: 'Movement ID (UUID)', example: 'mv_124' })
  id: string;

  @ApiProperty({ description: 'Movement type', example: 'ADJUSTMENT' })
  type: string;

  @ApiProperty({ description: 'Product ID (UUID)', example: 'prod_123' })
  productId: string;

  @ApiProperty({ description: 'Warehouse ID (UUID)', example: 'wh_123' })
  warehouseId: string;

  @ApiPropertyOptional({ description: 'Batch ID (UUID)', example: 'batch_123' })
  batchId?: string | null;

  @ApiProperty({ description: 'Quantity change', example: -5 })
  quantity: number;

  @ApiPropertyOptional({ description: 'Unit cost', example: 15.5 })
  unitCost?: number | null;

  @ApiPropertyOptional({ description: 'Total value', example: 77.5 })
  totalValue?: number | null;

  @ApiPropertyOptional({ description: 'Reference type', example: 'ADJUSTMENT' })
  referenceType?: string | null;

  @ApiPropertyOptional({ description: 'Reference ID', example: 'adj_123' })
  referenceId?: string | null;

  @ApiPropertyOptional({ description: 'Reason', example: 'DAMAGED' })
  reason?: string | null;

  @ApiPropertyOptional({ description: 'Notes', example: 'Damaged packaging' })
  notes?: string | null;

  @ApiProperty({ description: 'Created at', example: '2026-01-23T12:00:00Z' })
  createdAt: Date;

  @ApiProperty({ description: 'Created by user ID', example: 'user_123' })
  createdBy: string;
}

export class RecipeIngredientResponseDto {
  @ApiProperty({ description: 'Ingredient ID (UUID)', example: 'ing_123' })
  id: string;

  @ApiProperty({ description: 'Recipe ID (UUID)', example: 'rcp_123' })
  recipeId: string;

  @ApiProperty({ description: 'Ingredient product ID', example: 'prod_bun' })
  ingredientProductId: string;

  @ApiProperty({ description: 'Quantity required', example: 0.5 })
  quantityRequired: number;

  @ApiProperty({ description: 'Unit of measure', example: 'kg' })
  unit: string;

  @ApiProperty({ description: 'Is prepared', example: false })
  isPrepared: boolean;
}

export class RecipeResponseDto {
  @ApiProperty({ description: 'Recipe ID (UUID)', example: 'rcp_123' })
  id: string;

  @ApiProperty({ description: 'Product ID (UUID)', example: 'prod_999' })
  productId: string;

  @ApiProperty({ description: 'Yield quantity', example: 1 })
  yieldQuantity: number;

  @ApiProperty({ description: 'Yield unit', example: 'PIECE' })
  yieldUnit: string;

  @ApiProperty({ description: 'Is active', example: true })
  isActive: boolean;
}

export class RecipeWithIngredientsResponseDto extends RecipeResponseDto {
  @ApiPropertyOptional({
    description: 'Recipe ingredients',
    type: () => RecipeIngredientResponseDto,
    isArray: true,
  })
  ingredients?: RecipeIngredientResponseDto[];
}

export class RecipeCostResponseDto {
  @ApiProperty({ description: 'Product ID (UUID)', example: 'prod_999' })
  productId: string;

  @ApiProperty({ description: 'Cost per unit', example: '15.50' })
  costPerUnit: string;
}
