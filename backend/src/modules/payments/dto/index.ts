// Payments DTOs
// Source: FINAL/BACKEND/06-MODULE-PAYMENTS.md

import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsUUID,
  IsEnum,
  IsArray,
  ValidateNested,
  IsPositive,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ==================== CREATE PAYMENT ====================

export class CreatePaymentDto {
  @ApiProperty({
    description: 'Order UUID',
    example: 'o23e4567-e89b-12d3-a456-426614174023',
  })
  @IsUUID()
  orderId: string;

  @ApiProperty({
    description: 'Session UUID',
    example: 's23e4567-e89b-12d3-a456-426614174013',
  })
  @IsUUID()
  sessionId: string;

  @ApiProperty({
    description: 'Payment method',
    enum: ['CASH', 'CARD', 'MADA', 'WALLET'],
    example: 'CASH',
  })
  @IsEnum(['CASH', 'CARD', 'MADA', 'WALLET'])
  method: 'CASH' | 'CARD' | 'MADA' | 'WALLET';

  @ApiProperty({
    description: 'Payment amount (SAR)',
    example: 125.5,
    maximum: 999999,
  })
  @IsNumber()
  @IsPositive()
  @Max(999999)
  amount: number;

  @ApiPropertyOptional({
    description: 'Amount received from customer (for cash payments)',
    example: 150.0,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  receivedAmount?: number;

  @ApiPropertyOptional({
    description: 'Last 4 digits of card',
    example: '4532',
  })
  @IsOptional()
  @IsString()
  cardLast4?: string;

  @ApiPropertyOptional({
    description: 'Card type/network',
    example: 'Visa',
  })
  @IsOptional()
  @IsString()
  cardType?: string;

  @ApiPropertyOptional({
    description: 'Payment gateway transaction ID',
    example: 'TXN-20240115-123456',
  })
  @IsOptional()
  @IsString()
  transactionId?: string;

  @ApiPropertyOptional({
    description: 'Tip amount (SAR)',
    example: 10.0,
  })
  @IsOptional()
  @IsNumber()
  tipAmount?: number;

  @ApiProperty({
    description: 'User UUID who processed this payment',
    example: 'u23e4567-e89b-12d3-a456-426614174020',
  })
  @IsString()
  createdBy: string;
}

// ==================== SPLIT PAYMENT ====================

export class PaymentItemDto {
  @ApiProperty({
    description: 'Payment method',
    enum: ['CASH', 'CARD', 'MADA', 'WALLET'],
    example: 'CARD',
  })
  @IsEnum(['CASH', 'CARD', 'MADA', 'WALLET'])
  method: 'CASH' | 'CARD' | 'MADA' | 'WALLET';

  @ApiProperty({
    description: 'Amount for this payment method (SAR)',
    example: 75.0,
  })
  @IsNumber()
  amount: number;

  @ApiPropertyOptional({
    description: 'Received amount (for cash)',
    example: 80.0,
  })
  @IsOptional()
  @IsNumber()
  receivedAmount?: number;

  @ApiPropertyOptional({
    description: 'Last 4 digits of card',
    example: '7890',
  })
  @IsOptional()
  @IsString()
  cardLast4?: string;

  @ApiPropertyOptional({
    description: 'Transaction ID from payment gateway',
    example: 'TXN-SPLIT-123',
  })
  @IsOptional()
  @IsString()
  transactionId?: string;
}

export class SplitPaymentDto {
  @ApiProperty({
    description: 'Order UUID',
    example: 'o23e4567-e89b-12d3-a456-426614174023',
  })
  @IsUUID()
  orderId: string;

  @ApiProperty({
    description: 'Session UUID',
    example: 's23e4567-e89b-12d3-a456-426614174013',
  })
  @IsUUID()
  sessionId: string;

  @ApiProperty({
    description: 'List of payment splits',
    type: [PaymentItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentItemDto)
  payments: PaymentItemDto[];

  @ApiProperty({
    description: 'User UUID processing the split payment',
    example: 'u23e4567-e89b-12d3-a456-426614174020',
  })
  @IsString()
  userId: string;
}

// ==================== REFUND ====================

export class CreateRefundDto {
  @ApiProperty({
    description: 'Payment UUID to refund',
    example: 'p23e4567-e89b-12d3-a456-426614174024',
  })
  @IsUUID()
  paymentId: string;

  @ApiProperty({
    description: 'Refund amount (SAR)',
    example: 50.0,
  })
  @IsNumber()
  amount: number;

  @ApiProperty({
    description: 'Refund reason',
    example: 'Customer complaint - cold food',
  })
  @IsString()
  reason: string;

  @ApiPropertyOptional({
    description: 'Additional notes',
    example: 'Partial refund approved by manager',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    description: 'User UUID requesting the refund',
    example: 'u23e4567-e89b-12d3-a456-426614174020',
  })
  @IsString()
  userId: string;
}

export class ApproveRefundDto {
  @ApiProperty({
    description: 'Manager/Admin UUID approving the refund',
    example: 'm23e4567-e89b-12d3-a456-426614174025',
  })
  @IsString()
  approvedBy: string;
}

// ==================== PAYMENT METHOD ====================

export class CreatePaymentMethodDto {
  @ApiProperty({
    description: 'Payment method name (English)',
    example: 'Cash',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Payment method name (Arabic)',
    example: 'نقدي',
  })
  @IsString()
  nameAr: string;

  @ApiProperty({
    description: 'Payment method type',
    enum: ['CASH', 'CARD', 'MADA', 'WALLET'],
    example: 'CASH',
  })
  @IsEnum(['CASH', 'CARD', 'MADA', 'WALLET'])
  type: 'CASH' | 'CARD' | 'MADA' | 'WALLET';

  @ApiPropertyOptional({
    description: 'Payment provider/processor name',
    example: 'PayTabs',
  })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiPropertyOptional({
    description: 'Display sort order',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @ApiPropertyOptional({
    description: 'Whether this payment method is active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdatePaymentMethodDto extends PartialType(
  CreatePaymentMethodDto,
) {}
