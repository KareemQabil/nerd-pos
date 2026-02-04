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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ==================== CREATE DISCOUNT ====================

export class CreateDiscountDto {
  @ApiProperty({ description: 'Discount code', example: 'RAMADAN2026' })
  @IsString()
  code: string;

  @ApiProperty({ description: 'Discount name (English)', example: 'Ramadan Special' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Discount name (Arabic)', example: '??? ?????' })
  @IsString()
  nameAr: string;

  @ApiPropertyOptional({ description: 'Description', example: '15% off all orders during Ramadan' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Discount type', enum: ['PERCENTAGE', 'FIXED_AMOUNT'], example: 'PERCENTAGE' })
  @IsIn(['PERCENTAGE', 'FIXED_AMOUNT'])
  type: 'PERCENTAGE' | 'FIXED_AMOUNT';

  @ApiProperty({ description: 'Discount value (% or SAR)', example: 15 })
  @IsNumber()
  value: number;

  @ApiPropertyOptional({ description: 'Minimum order amount (SAR)', example: 100 })
  @IsOptional()
  @IsNumber()
  minOrderAmount?: number;

  @ApiPropertyOptional({ description: 'Maximum discount amount (SAR)', example: 50 })
  @IsOptional()
  @IsNumber()
  maxDiscount?: number;

  @ApiPropertyOptional({ description: 'Discount scope', enum: ['ORDER', 'CATEGORY', 'PRODUCT'], example: 'ORDER' })
  @IsOptional()
  @IsIn(['ORDER', 'CATEGORY', 'PRODUCT'])
  applicableOn?: 'ORDER' | 'CATEGORY' | 'PRODUCT';

  @ApiPropertyOptional({ description: 'Category UUIDs (if scope is CATEGORY)', example: ['723e4567-e89b-12d3-a456-426614174006'] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  categoryIds?: string[];

  @ApiPropertyOptional({ description: 'Product UUIDs (if scope is PRODUCT)', example: ['123e4567-e89b-12d3-a456-426614174000'] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  productIds?: string[];

  @ApiPropertyOptional({ description: 'Start date (ISO)', example: '2026-03-01T00:00:00Z' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date;

  @ApiPropertyOptional({ description: 'End date (ISO)', example: '2026-03-31T23:59:59Z' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;

  @ApiPropertyOptional({ description: 'Start time (HH:mm)', example: '18:00' })
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiPropertyOptional({ description: 'End time (HH:mm)', example: '23:00' })
  @IsOptional()
  @IsString()
  endTime?: string;

  @ApiPropertyOptional({ description: 'Days of week (0=Sun..6=Sat)', example: [5, 6] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  daysOfWeek?: number[];

  @ApiPropertyOptional({ description: 'Corporate discount flag', example: false })
  @IsOptional()
  @IsBoolean()
  isCorporate?: boolean;

  @ApiPropertyOptional({ description: 'Corporate customer UUIDs', example: ['c23e4567-e89b-12d3-a456-426614174011'] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  corporateIds?: string[];

  @ApiPropertyOptional({ description: 'Requires manager approval', example: true })
  @IsOptional()
  @IsBoolean()
  requiresApproval?: boolean;

  @ApiPropertyOptional({ description: 'Approval threshold (SAR)', example: 200 })
  @IsOptional()
  @IsNumber()
  approvalThreshold?: number;

  @ApiPropertyOptional({ description: 'Maximum total uses', example: 500 })
  @IsOptional()
  @IsNumber()
  maxUses?: number;

  @ApiPropertyOptional({ description: 'Maximum uses per customer', example: 2 })
  @IsOptional()
  @IsNumber()
  maxUsesPerCustomer?: number;

  @ApiProperty({ description: 'User UUID who created the discount', example: 'u23e4567-e89b-12d3-a456-426614174020' })
  @IsString()
  createdBy: string;
}

export class UpdateDiscountDto extends PartialType(CreateDiscountDto) { }

// ==================== VALIDATE DISCOUNT ====================

export class ValidateDiscountDto {
  @ApiProperty({ description: 'Discount code', example: 'RAMADAN2026' })
  @IsString()
  code: string;

  @ApiProperty({ description: 'Order total before discount (SAR)', example: 250 })
  @IsNumber()
  orderTotal: number;

  @ApiPropertyOptional({ description: 'Customer UUID (optional)', example: 'c23e4567-e89b-12d3-a456-426614174011' })
  @IsOptional()
  @IsUUID()
  customerId?: string;
}

// ==================== APPLY DISCOUNT ====================

export class ApplyDiscountDto {
  @ApiProperty({ description: 'Discount UUID', example: 'd23e4567-e89b-12d3-a456-426614174099' })
  @IsUUID()
  discountId: string;

  @ApiProperty({ description: 'Order UUID', example: 'o23e4567-e89b-12d3-a456-426614174023' })
  @IsUUID()
  orderId: string;

  @ApiProperty({ description: 'Discount amount applied (SAR)', example: 25 })
  @IsNumber()
  amount: number;

  @ApiProperty({ description: 'Order total before discount (SAR)', example: 250 })
  @IsNumber()
  orderTotal: number;

  @ApiProperty({ description: 'User UUID applying the discount', example: 'u23e4567-e89b-12d3-a456-426614174020' })
  @IsString()
  userId: string;

  @ApiPropertyOptional({ description: 'Approver UUID (if approval required)', example: 'm23e4567-e89b-12d3-a456-426614174025' })
  @IsOptional()
  @IsString()
  approvedBy?: string;
}

// ==================== RESPONSE DTOs ====================

export * from './discount-response.dto';
