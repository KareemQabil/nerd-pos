// Customers DTOs
// Source: FINAL/BACKEND/09-MODULE-CUSTOMERS.md

import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsEmail,
  IsIn,
  IsUUID,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

// ==================== CREATE CUSTOMER ====================

export class CreateCustomerDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  nameAr?: string;

  @IsString()
  phone: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsIn(['en', 'ar'])
  preferredLanguage?: 'en' | 'ar';

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {}

// ==================== ADD ADDRESS ====================

export class AddAddressDto {
  @IsUUID()
  customerId: string;

  @IsString()
  label: string; // "Home", "Office"

  @IsString()
  street: string;

  @IsOptional()
  @IsString()
  building?: string;

  @IsOptional()
  @IsString()
  floor?: string;

  @IsOptional()
  @IsString()
  apartment?: string;

  @IsString()
  city: string;

  @IsString()
  district: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

// ==================== LOYALTY ====================

export class RedeemPointsDto {
  @IsNumber()
  points: number;
}

// ==================== LOYALTY TIER ====================

export class CreateLoyaltyTierDto {
  @IsString()
  name: string;

  @IsString()
  nameAr: string;

  @IsNumber()
  minSpent: number;

  @IsNumber()
  minOrders: number;

  @IsNumber()
  pointsMultiplier: number;

  @IsNumber()
  discountPercent: number;

  @IsString()
  color: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsNumber()
  displayOrder: number;
}

export class UpdateLoyaltyTierDto extends PartialType(CreateLoyaltyTierDto) {}
