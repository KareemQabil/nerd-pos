/**
 * Product Response DTO
 *
 * Prevents business-sensitive data leakage by excluding:
 * - cost (margin information - business confidential)
 */

import { Exclude, Expose } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

@Exclude()
export class ProductResponseDto {
  @Expose()
  @ApiProperty({ description: 'Product ID (UUID)', example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @Expose()
  @ApiProperty({ description: 'Product SKU (unique)', example: 'SHWR-001' })
  sku: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Product barcode', example: '6281234567890' })
  barcode?: string | null;

  @Expose()
  @ApiProperty({ description: 'Product name (English)', example: 'Shawarma Plate' })
  nameEn: string;

  @Expose()
  @ApiProperty({ description: 'Product name (Arabic)', example: 'Shawarma Plate (AR)' })
  nameAr: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Product description (English)', example: 'Beef shawarma plate with rice and salad' })
  descriptionEn?: string | null;

  @Expose()
  @ApiPropertyOptional({ description: 'Product description (Arabic)', example: 'Beef shawarma plate (AR)' })
  descriptionAr?: string | null;

  @Expose()
  @ApiPropertyOptional({ description: 'Category ID', example: '723e4567-e89b-12d3-a456-426614174006' })
  categoryId?: string;

  @Expose()
  @ApiProperty({ description: 'Selling price', example: 35.0 })
  price: number;

  @Expose()
  @ApiProperty({ description: 'Tax category', example: 'STANDARD' })
  taxCategory: string;

  @Expose()
  @ApiProperty({ description: 'Unit of measure', example: 'PIECE' })
  unitOfMeasure: string;

  @Expose()
  @ApiProperty({ description: 'Whether inventory tracking is enabled', example: true })
  trackInventory: boolean;

  @Expose()
  @ApiProperty({ description: 'Allow negative stock', example: false })
  allowNegativeStock: boolean;

  @Expose()
  @ApiProperty({ description: 'Has modifiers', example: true })
  hasModifiers: boolean;

  @Expose()
  @ApiProperty({ description: 'Replenishment method', example: 'BUY' })
  replenishmentMethod: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Kitchen station ID', example: 'station_1' })
  kitchenStationId?: string | null;

  @Expose()
  @ApiPropertyOptional({ description: 'Income account ID', example: 'acc_income_1' })
  incomeAccountId?: string | null;

  @Expose()
  @ApiPropertyOptional({ description: 'Expense account ID', example: 'acc_expense_1' })
  expenseAccountId?: string | null;

  @Expose()
  @ApiPropertyOptional({ description: 'Preparation time (minutes)', example: 10 })
  preparationTimeMinutes?: number | null;

  @Expose()
  @ApiPropertyOptional({ description: 'Product image URL', example: 'https://cdn.example.com/shawarma.jpg' })
  imageUrl?: string | null;

  @Expose()
  @ApiPropertyOptional({ description: 'Color code', example: '#FF9900' })
  colorCode?: string | null;

  @Expose()
  @ApiProperty({ description: 'Whether the product is active', example: true })
  isActive: boolean;

  @Expose()
  @ApiPropertyOptional({ description: 'Custom fields payload', example: { spiceLevel: 'medium' } })
  customFields?: Record<string, unknown> | null;

  @Expose()
  @ApiProperty({ description: 'Created timestamp', example: '2026-01-15T10:30:00Z' })
  createdAt: Date;

  @Expose()
  @ApiProperty({ description: 'Last updated timestamp', example: '2026-01-20T14:45:00Z' })
  updatedAt: Date;
}

/**
 * Product List Item DTO - simplified for list views
 */
@Exclude()
export class ProductListItemDto {
  @Expose()
  @ApiProperty({ description: 'Product ID (UUID)', example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @Expose()
  @ApiProperty({ description: 'Product SKU', example: 'SHWR-001' })
  sku: string;

  @Expose()
  @ApiProperty({ description: 'Product name (English)', example: 'Shawarma Plate' })
  nameEn: string;

  @Expose()
  @ApiProperty({ description: 'Product name (Arabic)', example: 'Shawarma Plate (AR)' })
  nameAr: string;

  @Expose()
  @ApiProperty({ description: 'Selling price', example: 35.0 })
  price: number;

  @Expose()
  @ApiPropertyOptional({ description: 'Category ID', example: '723e4567-e89b-12d3-a456-426614174006' })
  categoryId?: string;

  @Expose()
  @ApiProperty({ description: 'Whether the product is active', example: true })
  isActive: boolean;

  @Expose()
  @ApiPropertyOptional({ description: 'Product image URL', example: 'https://cdn.example.com/shawarma.jpg' })
  imageUrl?: string | null;
}
