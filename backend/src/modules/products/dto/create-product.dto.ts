// Product DTOs
// Source: FINAL/BACKEND/03-MODULE-PRODUCTS.md
// Aligned with: prisma/schema.prisma
import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsUUID,
  IsEnum,
  IsArray,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ==================== PRODUCT DTOs ====================

export class CreateProductDto {
  @ApiProperty({
    description: 'Unique product SKU code',
    example: 'SHWR-001',
  })
  @IsString()
  sku: string;

  @ApiPropertyOptional({
    description: 'Product barcode (EAN-13, UPC, etc.)',
    example: '6281234567890',
  })
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiProperty({
    description: 'Product name in Arabic',
    example: 'طبق شاورما',
  })
  @IsString()
  nameAr: string;

  @ApiProperty({
    description: 'Product name in English',
    example: 'Shawarma Plate',
  })
  @IsString()
  nameEn: string;

  @ApiPropertyOptional({
    description: 'Product description in Arabic',
    example: 'طبق شاورما لحم مع الأرز والسلطة',
  })
  @IsOptional()
  @IsString()
  descriptionAr?: string;

  @ApiPropertyOptional({
    description: 'Product description in English',
    example: 'Beef shawarma plate with rice and salad',
  })
  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @ApiProperty({
    description: 'Category UUID this product belongs to',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  categoryId: string;

  @ApiProperty({
    description: 'Selling price (SAR)',
    example: 35.0,
  })
  @IsNumber()
  price: number;

  @ApiPropertyOptional({
    description: 'Cost price (SAR) - used for margin calculation',
    example: 18.5,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  cost?: number = 0;

  @ApiPropertyOptional({
    description: 'Tax category for ZATCA compliance',
    enum: ['STANDARD', 'ZERO_RATED', 'EXEMPT'],
    example: 'STANDARD',
    default: 'STANDARD',
  })
  @IsOptional()
  @IsEnum(['STANDARD', 'ZERO_RATED', 'EXEMPT'])
  taxCategory?: string = 'STANDARD';

  @ApiPropertyOptional({
    description: 'Unit of measure',
    example: 'PIECE',
    default: 'PIECE',
  })
  @IsOptional()
  @IsString()
  unitOfMeasure?: string = 'PIECE';

  @ApiPropertyOptional({
    description: 'Whether to track inventory for this product',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  trackInventory?: boolean = true;

  @ApiPropertyOptional({
    description: 'Allow selling even when stock is zero',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  allowNegativeStock?: boolean = false;

  @ApiPropertyOptional({
    description: 'Product can have modifiers (e.g., extra cheese, no onions)',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  hasModifiers?: boolean = false;

  @ApiPropertyOptional({
    description: 'How to replenish inventory',
    example: 'BUY',
    default: 'BUY',
  })
  @IsOptional()
  @IsString()
  replenishmentMethod?: string = 'BUY';

  @ApiPropertyOptional({
    description: 'Kitchen station UUID for preparation',
    example: '223e4567-e89b-12d3-a456-426614174001',
  })
  @IsOptional()
  @IsUUID()
  kitchenStationId?: string;

  @ApiPropertyOptional({
    description: 'Income account UUID for accounting',
    example: '323e4567-e89b-12d3-a456-426614174002',
  })
  @IsOptional()
  @IsUUID()
  incomeAccountId?: string;

  @ApiPropertyOptional({
    description: 'Expense account UUID for accounting',
    example: '423e4567-e89b-12d3-a456-426614174003',
  })
  @IsOptional()
  @IsUUID()
  expenseAccountId?: string;

  @ApiPropertyOptional({
    description: 'Preparation time in minutes',
    example: 12,
  })
  @IsOptional()
  @IsNumber()
  preparationTimeMinutes?: number;

  @ApiPropertyOptional({
    description: 'Product image URL',
    example: 'https://cdn.example.com/shawarma.jpg',
  })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({
    description: 'Color code for UI display (hex)',
    example: '#FF5722',
  })
  @IsOptional()
  @IsString()
  colorCode?: string;

  @ApiPropertyOptional({
    description: 'Whether the product is active',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @ApiPropertyOptional({
    description: 'Custom JSON fields for extensibility',
    example: { allergens: ['gluten', 'dairy'], spicyLevel: 2 },
  })
  @IsOptional()
  customFields?: any;

  @ApiPropertyOptional({
    description: 'Array of modifier group UUIDs to assign',
    example: [
      '523e4567-e89b-12d3-a456-426614174004',
      '623e4567-e89b-12d3-a456-426614174005',
    ],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  modifierGroupIds?: string[];
}

export class UpdateProductDto extends PartialType(CreateProductDto) {}

// ==================== CATEGORY DTOs ====================

export class CreateCategoryDto {
  @ApiPropertyOptional({
    description: 'Parent category UUID (null for root categories)',
    example: '723e4567-e89b-12d3-a456-426614174006',
  })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiProperty({
    description: 'Category name in Arabic',
    example: 'أطباق رئيسية',
  })
  @IsString()
  nameAr: string;

  @ApiProperty({
    description: 'Category name in English',
    example: 'Main Dishes',
  })
  @IsString()
  nameEn: string;

  @ApiPropertyOptional({
    description: 'Category image URL',
    example: 'https://cdn.example.com/category-main-dishes.jpg',
  })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({
    description: 'Display sort order',
    example: 1,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  sortOrder?: number = 0;

  @ApiPropertyOptional({
    description: 'Whether the category is active',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}

// ==================== MODIFIER GROUP DTOs ====================

export class CreateModifierGroupDto {
  @ApiProperty({
    description: 'Modifier group name in Arabic',
    example: 'إضافات',
  })
  @IsString()
  nameAr: string;

  @ApiProperty({
    description: 'Modifier group name in English',
    example: 'Extras',
  })
  @IsString()
  nameEn: string;

  @ApiProperty({
    description: 'Selection type',
    enum: ['SINGLE', 'MULTI'],
    example: 'MULTI',
  })
  @IsString()
  selectionType: string;

  @ApiPropertyOptional({
    description: 'Whether selection is required',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean = false;

  @ApiPropertyOptional({
    description: 'Minimum number of selections required',
    example: 0,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  minSelections?: number = 0;

  @ApiPropertyOptional({
    description: 'Maximum number of selections allowed',
    example: 3,
  })
  @IsOptional()
  @IsNumber()
  maxSelections?: number;

  @ApiPropertyOptional({
    description: 'Display sort order',
    example: 1,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  sortOrder?: number = 0;

  @ApiPropertyOptional({
    description: 'Whether the modifier group is active',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}

export class UpdateModifierGroupDto extends PartialType(
  CreateModifierGroupDto,
) {}

// ==================== MODIFIER OPTION DTOs ====================

export class CreateModifierOptionDto {
  @ApiProperty({
    description: 'Modifier group UUID this option belongs to',
    example: '823e4567-e89b-12d3-a456-426614174007',
  })
  @IsUUID()
  groupId: string;

  @ApiProperty({
    description: 'Modifier option name in Arabic',
    example: 'جبنة إضافية',
  })
  @IsString()
  nameAr: string;

  @ApiProperty({
    description: 'Modifier option name in English',
    example: 'Extra Cheese',
  })
  @IsString()
  nameEn: string;

  @ApiPropertyOptional({
    description: 'Additional price for this modifier (SAR)',
    example: 5.0,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  price?: number = 0;

  @ApiPropertyOptional({
    description: 'Display sort order',
    example: 1,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  sortOrder?: number = 0;

  @ApiPropertyOptional({
    description: 'Whether the modifier option is active',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}

export class UpdateModifierOptionDto extends PartialType(
  CreateModifierOptionDto,
) {}

// ==================== ASSIGNMENT DTOs ====================

export class AssignModifierGroupDto {
  @ApiProperty({
    description: 'Product UUID to assign modifier group to',
    example: '923e4567-e89b-12d3-a456-426614174008',
  })
  @IsUUID()
  productId: string;

  @ApiProperty({
    description: 'Modifier group UUID to assign',
    example: '823e4567-e89b-12d3-a456-426614174007',
  })
  @IsUUID()
  groupId: string;
}
