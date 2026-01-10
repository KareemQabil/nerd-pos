// Product DTOs
// Source: FINAL/BACKEND/03-MODULE-PRODUCTS.md
// Aligned with: prisma/schema.prisma
import { IsString, IsNumber, IsBoolean, IsOptional, IsUUID, IsEnum, IsArray } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

// ==================== PRODUCT DTOs ====================

export class CreateProductDto {
    @IsString()
    sku: string;

    @IsOptional()
    @IsString()
    barcode?: string;

    @IsString()
    nameAr: string;             // Matches schema

    @IsString()
    nameEn: string;             // Matches schema

    @IsOptional()
    @IsString()
    descriptionAr?: string;

    @IsOptional()
    @IsString()
    descriptionEn?: string;

    @IsUUID()
    categoryId: string;

    @IsNumber()
    price: number;

    @IsOptional()
    @IsNumber()
    cost?: number = 0;

    @IsOptional()
    @IsEnum(['STANDARD', 'ZERO_RATED', 'EXEMPT'])
    taxCategory?: string = 'STANDARD';

    @IsOptional()
    @IsString()
    unitOfMeasure?: string = 'PIECE';

    @IsOptional()
    @IsBoolean()
    trackInventory?: boolean = true;

    @IsOptional()
    @IsBoolean()
    allowNegativeStock?: boolean = false;

    @IsOptional()
    @IsBoolean()
    hasModifiers?: boolean = false;

    @IsOptional()
    @IsString()
    replenishmentMethod?: string = 'BUY';

    @IsOptional()
    @IsUUID()
    kitchenStationId?: string;

    @IsOptional()
    @IsUUID()
    incomeAccountId?: string;

    @IsOptional()
    @IsUUID()
    expenseAccountId?: string;

    @IsOptional()
    @IsNumber()
    preparationTimeMinutes?: number;

    @IsOptional()
    @IsString()
    imageUrl?: string;

    @IsOptional()
    @IsString()
    colorCode?: string;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean = true;

    @IsOptional()
    customFields?: any;

    @IsOptional()
    @IsArray()
    @IsUUID('4', { each: true })
    modifierGroupIds?: string[];
}

export class UpdateProductDto extends PartialType(CreateProductDto) { }

// ==================== CATEGORY DTOs ====================

export class CreateCategoryDto {
    @IsOptional()
    @IsUUID()
    parentId?: string;

    @IsString()
    nameAr: string;             // Matches schema

    @IsString()
    nameEn: string;             // Matches schema

    @IsOptional()
    @IsString()
    imageUrl?: string;

    @IsOptional()
    @IsNumber()
    sortOrder?: number = 0;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean = true;
}

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) { }

// ==================== MODIFIER GROUP DTOs ====================

export class CreateModifierGroupDto {
    @IsString()
    nameAr: string;             // Matches schema

    @IsString()
    nameEn: string;             // Matches schema

    @IsString()
    selectionType: string;      // SINGLE, MULTI

    @IsOptional()
    @IsBoolean()
    isRequired?: boolean = false;

    @IsOptional()
    @IsNumber()
    minSelections?: number = 0;

    @IsOptional()
    @IsNumber()
    maxSelections?: number;

    @IsOptional()
    @IsNumber()
    sortOrder?: number = 0;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean = true;
}

export class UpdateModifierGroupDto extends PartialType(CreateModifierGroupDto) { }

// ==================== MODIFIER OPTION DTOs ====================

export class CreateModifierOptionDto {
    @IsUUID()
    groupId: string;            // Matches schema

    @IsString()
    nameAr: string;             // Matches schema

    @IsString()
    nameEn: string;             // Matches schema

    @IsOptional()
    @IsNumber()
    price?: number = 0;

    @IsOptional()
    @IsNumber()
    sortOrder?: number = 0;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean = true;
}

export class UpdateModifierOptionDto extends PartialType(CreateModifierOptionDto) { }

// ==================== ASSIGNMENT DTOs ====================

export class AssignModifierGroupDto {
    @IsUUID()
    productId: string;

    @IsUUID()
    groupId: string;
}
