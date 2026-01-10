// Create Product DTO
// Source: WORKFLOWS-BACKEND/01-create-module.md

import { IsString, IsNumber, IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class CreateProductDto {
    @IsString()
    sku: string;

    @IsOptional()
    @IsString()
    barcode?: string;

    @IsString()
    nameAr: string;

    @IsString()
    nameEn: string;

    @IsOptional()
    @IsString()
    descriptionAr?: string;

    @IsOptional()
    @IsString()
    descriptionEn?: string;

    @IsUUID()
    categoryId: string;

    @IsNumber()
    price: number; // Will convert to Decimal in service

    @IsOptional()
    @IsNumber()
    cost?: number = 0;

    @IsOptional()
    @IsString()
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
}
