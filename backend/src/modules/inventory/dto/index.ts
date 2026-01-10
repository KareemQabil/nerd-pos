// Inventory DTOs
// Source: FINAL/BACKEND/04-MODULE-INVENTORY.md
import { IsString, IsNumber, IsBoolean, IsOptional, IsUUID, IsDate, IsEnum } from 'class-validator';

export class CreateWarehouseDto {
    @IsString()
    code: string;

    @IsString()
    nameAr: string;

    @IsString()
    nameEn: string;

    @IsOptional()
    @IsString()
    location?: string;

    @IsOptional()
    @IsBoolean()
    isDefault?: boolean = false;
}

export class ReceiveStockDto {
    @IsUUID()
    productId: string;

    @IsUUID()
    warehouseId: string;

    @IsNumber()
    quantity: number;

    @IsNumber()
    costPerUnit: number;

    @IsOptional()
    @IsString()
    batchNumber?: string;

    @IsOptional()
    expiryDate?: Date;

    @IsOptional()
    @IsString()
    lotNumber?: string;
}

export class AdjustStockDto {
    @IsUUID()
    productId: string;

    @IsUUID()
    warehouseId: string;

    @IsNumber()
    quantity: number; // Positive = add, Negative = subtract

    @IsString()
    reason: string;

    @IsOptional()
    @IsString()
    notes?: string;
}

export class TransferStockDto {
    @IsUUID()
    productId: string;

    @IsUUID()
    fromWarehouseId: string;

    @IsUUID()
    toWarehouseId: string;

    @IsNumber()
    quantity: number;

    @IsOptional()
    @IsString()
    notes?: string;
}

export class CreateMovementDto {
    @IsEnum(['IN', 'OUT', 'ADJUSTMENT', 'TRANSFER'])
    type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'TRANSFER';

    @IsUUID()
    productId: string;

    @IsUUID()
    warehouseId: string;

    @IsOptional()
    @IsUUID()
    batchId?: string;

    @IsNumber()
    quantity: number;

    @IsOptional()
    @IsNumber()
    unitCost?: number;

    @IsOptional()
    @IsNumber()
    totalValue?: number;

    @IsOptional()
    @IsString()
    referenceType?: string;

    @IsOptional()
    @IsString()
    referenceId?: string;

    @IsOptional()
    @IsString()
    reason?: string;

    @IsOptional()
    @IsString()
    notes?: string;

    @IsString()
    createdBy: string;
}

// Recipe DTOs
export class CreateRecipeDto {
    @IsUUID()
    productId: string;

    @IsOptional()
    @IsNumber()
    yield?: number = 1;
}

export class AddRecipeIngredientDto {
    @IsUUID()
    recipeId: string;

    @IsUUID()
    productId: string; // Ingredient

    @IsNumber()
    quantity: number;

    @IsString()
    unit: string; // kg, g, L, ml, pieces
}
