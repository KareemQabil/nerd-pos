// Inventory DTOs
// Source: FINAL/BACKEND/04-MODULE-INVENTORY.md
import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsUUID,
  IsDate,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWarehouseDto {
  @ApiProperty({
    description: 'Warehouse code (unique)',
    example: 'WH-MAIN',
  })
  @IsString()
  code: string;

  @ApiProperty({
    description: 'Warehouse name (Arabic)',
    example: 'المخزن الرئيسي',
  })
  @IsString()
  nameAr: string;

  @ApiProperty({
    description: 'Warehouse name (English)',
    example: 'Main Warehouse',
  })
  @IsString()
  nameEn: string;

  @ApiPropertyOptional({
    description: 'Warehouse location/address',
    example: 'King Abdullah Road, Riyadh',
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({
    description: 'Mark as default warehouse',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean = false;
}

export class ReceiveStockDto {
  @ApiProperty({
    description: 'Product UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  productId: string;

  @ApiProperty({
    description: 'Warehouse UUID',
    example: 'w23e4567-e89b-12d3-a456-426614174016',
  })
  @IsUUID()
  warehouseId: string;

  @ApiProperty({
    description: 'Quantity received',
    example: 100,
  })
  @IsNumber()
  quantity: number;

  @ApiProperty({
    description: 'Cost per unit (SAR)',
    example: 15.0,
  })
  @IsNumber()
  costPerUnit: number;

  @ApiPropertyOptional({
    description: 'Batch/lot number',
    example: 'BATCH-20240115',
  })
  @IsOptional()
  @IsString()
  batchNumber?: string;

  @ApiPropertyOptional({
    description: 'Expiry date (for perishable items)',
    example: '2024-12-31',
  })
  @IsOptional()
  expiryDate?: Date;

  @ApiPropertyOptional({
    description: 'Lot identifier',
    example: 'LOT-A123',
  })
  @IsOptional()
  @IsString()
  lotNumber?: string;
}

export class AdjustStockDto {
  @ApiProperty({
    description: 'Product UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  productId: string;

  @ApiProperty({
    description: 'Warehouse UUID',
    example: 'w23e4567-e89b-12d3-a456-426614174016',
  })
  @IsUUID()
  warehouseId: string;

  @ApiProperty({
    description: 'Adjustment quantity (positive = add, negative = subtract)',
    example: -5,
  })
  @IsNumber()
  quantity: number;

  @ApiProperty({
    description: 'Reason for adjustment',
    example: 'Shrinkage - expired items',
  })
  @IsString()
  reason: string;

  @ApiPropertyOptional({
    description: 'Additional notes',
    example: 'Wasted due to refrigeration failure',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class TransferStockDto {
  @ApiProperty({
    description: 'Product UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  productId: string;

  @ApiProperty({
    description: 'Source warehouse UUID',
    example: 'w23e4567-e89b-12d3-a456-426614174016',
  })
  @IsUUID()
  fromWarehouseId: string;

  @ApiProperty({
    description: 'Destination warehouse UUID',
    example: 'w33e4567-e89b-12d3-a456-426614174017',
  })
  @IsUUID()
  toWarehouseId: string;

  @ApiProperty({
    description: 'Quantity to transfer',
    example: 25,
  })
  @IsNumber()
  quantity: number;

  @ApiPropertyOptional({
    description: 'Transfer notes',
    example: 'Transfer to branch warehouse',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateMovementDto {
  @ApiProperty({
    description: 'Movement type',
    enum: ['IN', 'OUT', 'ADJUSTMENT', 'TRANSFER'],
    example: 'IN',
  })
  @IsEnum(['IN', 'OUT', 'ADJUSTMENT', 'TRANSFER'])
  type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'TRANSFER';

  @ApiProperty({
    description: 'Product UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  productId: string;

  @ApiProperty({
    description: 'Warehouse UUID',
    example: 'w23e4567-e89b-12d3-a456-426614174016',
  })
  @IsUUID()
  warehouseId: string;

  @ApiPropertyOptional({
    description: 'Batch UUID (if batch tracking is enabled)',
    example: 'b23e4567-e89b-12d3-a456-426614174018',
  })
  @IsOptional()
  @IsUUID()
  batchId?: string;

  @ApiProperty({
    description: 'Movement quantity',
    example: 50,
  })
  @IsNumber()
  quantity: number;

  @ApiPropertyOptional({
    description: 'Unit cost (SAR)',
    example: 15.0,
  })
  @IsOptional()
  @IsNumber()
  unitCost?: number;

  @ApiPropertyOptional({
    description: 'Total value (SAR)',
    example: 750.0,
  })
  @IsOptional()
  @IsNumber()
  totalValue?: number;

  @ApiPropertyOptional({
    description: 'Reference document type (e.g., ORDER, PURCHASE)',
    example: 'PURCHASE',
  })
  @IsOptional()
  @IsString()
  referenceType?: string;

  @ApiPropertyOptional({
    description: 'Reference document UUID',
    example: 'p23e4567-e89b-12d3-a456-426614174019',
  })
  @IsOptional()
  @IsString()
  referenceId?: string;

  @ApiPropertyOptional({
    description: 'Reason for movement',
    example: 'Purchase order received',
  })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({
    description: 'Additional notes',
    example: 'Delivered by truck #45',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    description: 'User UUID who created this movement',
    example: 'u23e4567-e89b-12d3-a456-426614174020',
  })
  @IsString()
  createdBy: string;
}

// Recipe DTOs
export class CreateRecipeDto {
  @ApiProperty({
    description: 'Product UUID (final product)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  productId: string;

  @ApiPropertyOptional({
    description: 'Recipe yield quantity',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  yield?: number = 1;
}

export class AddRecipeIngredientDto {
  @ApiProperty({
    description: 'Recipe UUID',
    example: 'r23e4567-e89b-12d3-a456-426614174021',
  })
  @IsUUID()
  recipeId: string;

  @ApiProperty({
    description: 'Ingredient product UUID',
    example: 'i23e4567-e89b-12d3-a456-426614174022',
  })
  @IsUUID()
  productId: string;

  @ApiProperty({
    description: 'Required quantity',
    example: 0.5,
  })
  @IsNumber()
  quantity: number;

  @ApiProperty({
    description: 'Unit of measure',
    example: 'kg',
  })
  @IsString()
  unit: string;
}

// ==================== RESPONSE DTOs ====================

export * from './inventory-response.dto';
