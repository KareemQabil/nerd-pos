// Discounts DTOs
// Source: FINAL/BACKEND/13-MODULE-DISCOUNTS.md

import {
  IsString,
  IsNumber,
  IsOptional,
  IsUUID,
  IsArray,
  IsIn,
  IsBoolean,
  IsDate,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';

// ==================== CREATE DISCOUNT ====================

export class CreateDiscountDto {
  @IsString()
  code: string;

  @IsString()
  name: string;

  @IsString()
  nameAr: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsIn(['PERCENTAGE', 'FIXED_AMOUNT'])
  type: 'PERCENTAGE' | 'FIXED_AMOUNT';

  @IsNumber()
  value: number;

  @IsOptional()
  @IsNumber()
  minOrderAmount?: number;

  @IsOptional()
  @IsNumber()
  maxDiscount?: number;

  @IsOptional()
  @IsIn(['ORDER', 'CATEGORY', 'PRODUCT'])
  applicableOn?: 'ORDER' | 'CATEGORY' | 'PRODUCT';

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  categoryIds?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  productIds?: string[];

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;

  @IsOptional()
  @IsString()
  startTime?: string; // "18:00"

  @IsOptional()
  @IsString()
  endTime?: string; // "20:00"

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  daysOfWeek?: number[]; // [0-6]

  @IsOptional()
  @IsBoolean()
  isCorporate?: boolean;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  corporateIds?: string[];

  @IsOptional()
  @IsBoolean()
  requiresApproval?: boolean;

  @IsOptional()
  @IsNumber()
  approvalThreshold?: number;

  @IsOptional()
  @IsNumber()
  maxUses?: number;

  @IsOptional()
  @IsNumber()
  maxUsesPerCustomer?: number;

  @IsString()
  createdBy: string;
}

export class UpdateDiscountDto extends PartialType(CreateDiscountDto) {}

// ==================== VALIDATE DISCOUNT ====================

export class ValidateDiscountDto {
  @IsString()
  code: string;

  @IsNumber()
  orderTotal: number;

  @IsOptional()
  @IsUUID()
  customerId?: string;
}

// ==================== APPLY DISCOUNT ====================

export class ApplyDiscountDto {
  @IsUUID()
  discountId: string;

  @IsUUID()
  orderId: string;

  @IsNumber()
  amount: number;

  @IsNumber()
  orderTotal: number;

  @IsString()
  userId: string;

  @IsOptional()
  @IsString()
  approvedBy?: string;
}
