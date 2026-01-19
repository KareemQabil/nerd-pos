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
} from 'class-validator';
import { Type } from 'class-transformer';

// ==================== CREATE PAYMENT ====================

export class CreatePaymentDto {
  @IsUUID()
  orderId: string;

  @IsEnum(['CASH', 'CARD', 'MADA', 'WALLET'])
  method: 'CASH' | 'CARD' | 'MADA' | 'WALLET';

  @IsNumber()
  amount: number;

  @IsOptional()
  @IsNumber()
  receivedAmount?: number; // For cash

  @IsOptional()
  @IsString()
  cardLast4?: string;

  @IsOptional()
  @IsString()
  cardType?: string;

  @IsOptional()
  @IsString()
  transactionId?: string;

  @IsOptional()
  @IsNumber()
  tipAmount?: number;

  @IsString()
  createdBy: string;
}

// ==================== SPLIT PAYMENT ====================

export class PaymentItemDto {
  @IsEnum(['CASH', 'CARD', 'MADA', 'WALLET'])
  method: 'CASH' | 'CARD' | 'MADA' | 'WALLET';

  @IsNumber()
  amount: number;

  @IsOptional()
  @IsNumber()
  receivedAmount?: number;

  @IsOptional()
  @IsString()
  cardLast4?: string;

  @IsOptional()
  @IsString()
  transactionId?: string;
}

export class SplitPaymentDto {
  @IsUUID()
  orderId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentItemDto)
  payments: PaymentItemDto[];

  @IsString()
  userId: string;
}

// ==================== REFUND ====================

export class CreateRefundDto {
  @IsUUID()
  paymentId: string;

  @IsNumber()
  amount: number;

  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsString()
  userId: string;
}

export class ApproveRefundDto {
  @IsString()
  approvedBy: string;
}

// ==================== PAYMENT METHOD ====================

export class CreatePaymentMethodDto {
  @IsString()
  name: string;

  @IsString()
  nameAr: string;

  @IsEnum(['CASH', 'CARD', 'MADA', 'WALLET'])
  type: 'CASH' | 'CARD' | 'MADA' | 'WALLET';

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

import { PartialType } from '@nestjs/mapped-types';
export class UpdatePaymentMethodDto extends PartialType(
  CreatePaymentMethodDto,
) {}
