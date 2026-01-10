// Product DTOs
// Source: FINAL/BACKEND/03-MODULE-PRODUCTS.md
import { IsString, IsNumber, IsBoolean, IsOptional, IsUUID, IsEnum, IsArray } from 'class-validator';

// ==================== PRODUCT DTOs ====================

export class CreateProductDto {
    @IsString()
    sku: string;

    @IsString()
    name: string;

    @IsString()
    nameAr: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    descriptionAr?: string;

    @IsNumber()
    price: number;

    @IsOptional()
    @IsNumber()
    cost?: number;

    @IsOptional()
    @IsBoolean()
    taxable?: boolean = true;

    @IsOptional()
    @IsEnum(['STANDARD', 'ZERO_RATED', 'EXEMPT'])
    taxCategory?: string = 'STANDARD';

    @IsOptional()
    @IsBoolean()
    trackStock?: boolean = true;

    @IsOptional()
    @IsNumber()
    minStock?: number = 0;

    @IsUUID()
    categoryId: string;

    @IsOptional()
    @IsString()
    unitOfMeasure?: string = 'PIECE';

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
    @IsArray()
    @IsUUID('4', { each: true })
    modifierIds?: string[];
}

// ==================== UPDATE DTOs ====================

import { PartialType } from '@nestjs/mapped-types';

export class UpdateProductDto extends PartialType(CreateProductDto) { }

// ==================== CATEGORY DTOs ====================

export class CreateCategoryDto {
    @IsString()
    name: string;

    @IsString()
    nameAr: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsUUID()
    parentId?: string;

    @IsOptional()
    @IsNumber()
    displayOrder?: number = 0;

    @IsOptional()
    @IsString()
    color?: string;

    @IsOptional()
    @IsString()
    icon?: string;

    @IsOptional()
    @IsString()
    imageUrl?: string;
}

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) { }

// ==================== MODIFIER DTOs ====================

export class CreateModifierDto {
    @IsString()
    name: string;

    @IsString()
    nameAr: string;

    @IsOptional()
    @IsBoolean()
    required?: boolean = false;

    @IsOptional()
    @IsBoolean()
    multiSelect?: boolean = false;

    @IsOptional()
    @IsNumber()
    minSelection?: number = 0;

    @IsOptional()
    @IsNumber()
    maxSelection?: number;
}

export class UpdateModifierDto extends PartialType(CreateModifierDto) { }

export class CreateModifierOptionDto {
    @IsUUID()
    modifierId: string;

    @IsString()
    name: string;

    @IsString()
    nameAr: string;

    @IsOptional()
    @IsNumber()
    price?: number = 0;

    @IsOptional()
    @IsNumber()
    displayOrder?: number = 0;
}

export class UpdateModifierOptionDto extends PartialType(CreateModifierOptionDto) { }

// ==================== ASSIGNMENT DTOs ====================

export class AssignModifierDto {
    @IsUUID()
    productId: string;

    @IsUUID()
    modifierId: string;
}
