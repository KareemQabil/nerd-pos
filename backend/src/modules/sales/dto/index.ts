// Sales DTOs
// Source: FINAL/BACKEND/05-MODULE-SALES.md

import {
    IsString,
    IsNumber,
    IsBoolean,
    IsOptional,
    IsUUID,
    IsEnum,
    IsArray,
    ValidateNested,
    IsInt,
    Min,
} from 'class-validator';
import { Type } from 'class-transformer';

// ==================== ORDER ITEM DTO ====================

export class OrderItemModifierDto {
    @IsUUID()
    modifierId: string;

    @IsUUID()
    optionId: string;

    @IsString()
    name: string;

    @IsNumber()
    price: number;
}

export class CreateOrderItemDto {
    @IsUUID()
    productId: string;

    @IsString()
    name: string;

    @IsString()
    nameAr: string;

    @IsNumber()
    price: number;

    @IsInt()
    @Min(1)
    quantity: number;

    @IsOptional()
    @IsString()
    notes?: string;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => OrderItemModifierDto)
    modifiers?: OrderItemModifierDto[];
}

// ==================== ORDER DTO ====================

export class CreateOrderDto {
    @IsEnum(['DINE_IN', 'TAKEAWAY', 'DELIVERY'])
    type: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';

    @IsOptional()
    @IsUUID()
    customerId?: string;

    @IsOptional()
    @IsUUID()
    tableId?: string;

    @IsOptional()
    @IsInt()
    guestCount?: number;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateOrderItemDto)
    items: CreateOrderItemDto[];

    @IsOptional()
    @IsString()
    discountCode?: string;

    @IsOptional()
    @IsUUID()
    sessionId?: string;
}

export class UpdateOrderStatusDto {
    @IsEnum(['DRAFT', 'CONFIRMED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED'])
    status: 'DRAFT' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';
}

export class AddOrderItemDto extends CreateOrderItemDto { }

export class UpdateOrderItemDto {
    @IsOptional()
    @IsInt()
    @Min(1)
    quantity?: number;

    @IsOptional()
    @IsString()
    notes?: string;
}

export class ApplyDiscountDto {
    @IsString()
    discountCode: string;
}

// ==================== DELIVERY DTO ====================

export class SetDeliveryAddressDto {
    @IsUUID()
    addressId: string;

    @IsOptional()
    @IsString()
    zoneId?: string;
}
