/**
 * Product Response DTO
 *
 * Prevents business-sensitive data leakage by excluding:
 * - costPrice (margin information - business confidential)
 *
 * @example
 * const safeProduct = plainToClass(ProductResponseDto, product, { excludeExtraneousValues: true });
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
  @ApiProperty({ description: 'Product name in default language', example: 'Shawarma Plate' })
  name: string;

  @Expose()
  @ApiProperty({ description: 'Product name in Arabic', example: '??? ??????' })
  nameAr: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Product description', example: 'Beef shawarma plate with rice and salad' })
  description?: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Product description in Arabic', example: '??? ?????? ??? ?? ????? ???????' })
  descriptionAr?: string;

  @Expose()
  @ApiProperty({ description: 'Selling price', example: 35.0 })
  price: number;

  // ? EXCLUDED: costPrice - business confidential margin data

  @Expose()
  @ApiPropertyOptional({ description: 'Category ID', example: '723e4567-e89b-12d3-a456-426614174006' })
  categoryId?: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Product barcode', example: '6281234567890' })
  barcode?: string;

  @Expose()
  @ApiProperty({ description: 'Product type', enum: ['SIMPLE', 'COMPOSITE', 'VARIANT'], example: 'SIMPLE' })
  type: string;

  @Expose()
  @ApiProperty({ description: 'Whether the product is active', example: true })
  isActive: boolean;

  @Expose()
  @ApiProperty({ description: 'Whether inventory tracking is enabled', example: true })
  trackInventory: boolean;

  @Expose()
  @ApiPropertyOptional({ description: 'Minimum stock level', example: 10 })
  minStockLevel?: number;

  @Expose()
  @ApiPropertyOptional({ description: 'Product image URL', example: 'https://cdn.example.com/shawarma.jpg' })
  imageUrl?: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Display order for sorting', example: 1 })
  displayOrder?: number;

  @Expose()
  @ApiPropertyOptional({ description: 'Tax group ID', example: 'a23e4567-e89b-12d3-a456-426614174009' })
  taxGroupId?: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Created timestamp', example: '2026-01-15T10:30:00Z' })
  createdAt?: Date;

  @Expose()
  @ApiPropertyOptional({ description: 'Last updated timestamp', example: '2026-01-20T14:45:00Z' })
  updatedAt?: Date;
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
  name: string;

  @Expose()
  @ApiProperty({ description: 'Product name (Arabic)', example: '??? ??????' })
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
  imageUrl?: string;
}
