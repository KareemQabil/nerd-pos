/**
 * Product Response DTO
 *
 * Prevents business-sensitive data leakage by excluding:
 * - costPrice (margin information - business confidential)
 *
 * @example
 * const safeProduct = plainToClass(ProductResponseDto, product, { excludeExtraneousValues: true });
 */

import { Exclude, Expose, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

@Exclude()
export class ProductResponseDto {
    @Expose()
    @ApiProperty({ description: 'Product ID (UUID)' })
    id: string;

    @Expose()
    @ApiProperty({ description: 'Product SKU (unique)' })
    sku: string;

    @Expose()
    @ApiProperty({ description: 'Product name in default language' })
    name: string;

    @Expose()
    @ApiProperty({ description: 'Product name in Arabic' })
    nameAr: string;

    @Expose()
    @ApiPropertyOptional({ description: 'Product description' })
    description?: string;

    @Expose()
    @ApiPropertyOptional({ description: 'Product description in Arabic' })
    descriptionAr?: string;

    @Expose()
    @ApiProperty({ description: 'Selling price' })
    price: number;

    // ✅ EXCLUDED: costPrice - business confidential margin data

    @Expose()
    @ApiPropertyOptional({ description: 'Category ID' })
    categoryId?: string;

    @Expose()
    @ApiPropertyOptional({ description: 'Product barcode' })
    barcode?: string;

    @Expose()
    @ApiProperty({ description: 'Product type', enum: ['SIMPLE', 'COMPOSITE', 'VARIANT'] })
    type: string;

    @Expose()
    @ApiProperty({ description: 'Whether the product is active' })
    isActive: boolean;

    @Expose()
    @ApiProperty({ description: 'Whether inventory tracking is enabled' })
    trackInventory: boolean;

    @Expose()
    @ApiPropertyOptional({ description: 'Minimum stock level' })
    minStockLevel?: number;

    @Expose()
    @ApiPropertyOptional({ description: 'Product image URL' })
    imageUrl?: string;

    @Expose()
    @ApiPropertyOptional({ description: 'Display order for sorting' })
    displayOrder?: number;

    @Expose()
    @ApiPropertyOptional({ description: 'Tax group ID' })
    taxGroupId?: string;

    @Expose()
    @ApiPropertyOptional({ description: 'Created timestamp' })
    createdAt?: Date;

    @Expose()
    @ApiPropertyOptional({ description: 'Last updated timestamp' })
    updatedAt?: Date;
}

/**
 * Product List Item DTO - simplified for list views
 */
@Exclude()
export class ProductListItemDto {
    @Expose()
    @ApiProperty()
    id: string;

    @Expose()
    @ApiProperty()
    sku: string;

    @Expose()
    @ApiProperty()
    name: string;

    @Expose()
    @ApiProperty()
    nameAr: string;

    @Expose()
    @ApiProperty()
    price: number;

    @Expose()
    @ApiPropertyOptional()
    categoryId?: string;

    @Expose()
    @ApiProperty()
    isActive: boolean;

    @Expose()
    @ApiPropertyOptional()
    imageUrl?: string;
}
