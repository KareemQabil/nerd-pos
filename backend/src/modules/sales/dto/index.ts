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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '../../../core/constants/enums';

// ==================== ORDER ITEM DTO ====================

export class OrderItemModifierDto {
  @ApiProperty({
    description: 'Modifier group UUID',
    example: '823e4567-e89b-12d3-a456-426614174007',
  })
  @IsUUID()
  modifierId: string;

  @ApiProperty({
    description: 'Modifier option UUID',
    example: 'b23e4567-e89b-12d3-a456-426614174010',
  })
  @IsUUID()
  optionId: string;

  @ApiProperty({
    description: 'Modifier option name',
    example: 'Extra Cheese',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Modifier price (SAR)',
    example: 5.0,
  })
  @IsNumber()
  price: number;
}

export class CreateOrderItemDto {
  @ApiProperty({
    description: 'Product UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  productId: string;

  @ApiProperty({
    description: 'Product name (English)',
    example: 'Shawarma Plate',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Product name (Arabic)',
    example: '??? ??????',
  })
  @IsString()
  nameAr: string;

  @ApiProperty({
    description: 'Unit price (SAR)',
    example: 35.0,
  })
  @IsNumber()
  price: number;

  @ApiProperty({
    description: 'Quantity ordered',
    example: 2,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({
    description: 'Special instructions for this item',
    example: 'No onions, extra tahini',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Selected modifiers for this item',
    type: [OrderItemModifierDto],
    example: [
      {
        modifierId: '823e4567-e89b-12d3-a456-426614174007',
        optionId: 'b23e4567-e89b-12d3-a456-426614174010',
        name: 'Extra Cheese',
        price: 5.0,
      },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemModifierDto)
  modifiers?: OrderItemModifierDto[];
}

// ==================== ORDER DTO ====================

export class CreateOrderDto {
  @ApiProperty({
    description: 'Order type',
    enum: ['DINE_IN', 'TAKEAWAY', 'DELIVERY'],
    example: 'DINE_IN',
  })
  @IsEnum(['DINE_IN', 'TAKEAWAY', 'DELIVERY'])
  type: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';

  @ApiPropertyOptional({
    description: 'Customer UUID (optional for walk-in)',
    example: 'c23e4567-e89b-12d3-a456-426614174011',
  })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({
    description: 'Table UUID (required for DINE_IN)',
    example: 't23e4567-e89b-12d3-a456-426614174012',
  })
  @IsOptional()
  @IsUUID()
  tableId?: string;

  @ApiPropertyOptional({
    description: 'Number of guests',
    example: 4,
  })
  @IsOptional()
  @IsInt()
  guestCount?: number;

  @ApiProperty({
    description: 'Order items',
    type: [CreateOrderItemDto],
    example: [
      {
        productId: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Shawarma Plate',
        nameAr: '??? ??????',
        price: 35.0,
        quantity: 2,
        notes: 'No onions',
        modifiers: [
          {
            modifierId: '823e4567-e89b-12d3-a456-426614174007',
            optionId: 'b23e4567-e89b-12d3-a456-426614174010',
            name: 'Extra Cheese',
            price: 5.0,
          },
        ],
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @ApiPropertyOptional({
    description: 'Discount code to apply',
    example: 'RAMADAN2026',
  })
  @IsOptional()
  @IsString()
  discountCode?: string;

  @ApiProperty({
    description: 'Session UUID to associate with (optional - for audit trail)',
    example: 's23e4567-e89b-12d3-a456-426614174013',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  sessionId?: string;
}

export class UpdateOrderStatusDto {
  @ApiProperty({
    description: 'New order status',
    enum: OrderStatus,
    example: 'PAID',
  })
  @IsEnum(OrderStatus)
  status: OrderStatus;
}

export class AddOrderItemDto extends CreateOrderItemDto {}

export class UpdateOrderItemDto {
  @ApiPropertyOptional({
    description: 'Updated quantity',
    example: 3,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional({
    description: 'Updated special instructions',
    example: 'Extra spicy',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ApplyDiscountDto {
  @ApiProperty({
    description: 'Discount code',
    example: 'RAMADAN2026',
  })
  @IsString()
  discountCode: string;
}

// ==================== DELIVERY DTO ====================

export class SetDeliveryAddressDto {
  @ApiProperty({
    description: 'Customer address UUID',
    example: 'd23e4567-e89b-12d3-a456-426614174014',
  })
  @IsUUID()
  addressId: string;

  @ApiPropertyOptional({
    description: 'Delivery zone UUID',
    example: 'z23e4567-e89b-12d3-a456-426614174015',
  })
  @IsOptional()
  @IsString()
  zoneId?: string;
}
