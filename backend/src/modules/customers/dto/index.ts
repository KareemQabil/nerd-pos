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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ==================== CREATE CUSTOMER ====================

export class CreateCustomerDto {
  @ApiProperty({
    description: 'Customer name (English)',
    example: 'Ahmed Al-Mansouri',
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Customer name (Arabic)',
    example: 'أحمد المنصوري',
  })
  @IsOptional()
  @IsString()
  nameAr?: string;

  @ApiProperty({
    description: 'Customer phone number (with country code)',
    example: '+966501234567',
  })
  @IsString()
  phone: string;

  @ApiPropertyOptional({
    description: 'Customer email address',
    example: 'ahmed.almansouri@example.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'Preferred language',
    enum: ['en', 'ar'],
    example: 'ar',
  })
  @IsOptional()
  @IsIn(['en', 'ar'])
  preferredLanguage?: 'en' | 'ar';

  @ApiPropertyOptional({
    description: 'Internal notes about the customer',
    example: 'VIP customer - prefers table by window',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateCustomerDto extends PartialType(CreateCustomerDto) { }

// ==================== ADD ADDRESS ====================

export class AddAddressDto {
  @ApiProperty({
    description: 'Customer UUID',
    example: 'c23e4567-e89b-12d3-a456-426614174011',
  })
  @IsUUID()
  customerId: string;

  @ApiProperty({
    description: 'Address label',
    example: 'Home',
  })
  @IsString()
  label: string;

  @ApiProperty({
    description: 'Street address',
    example: 'King Fahd Road',
  })
  @IsString()
  street: string;

  @ApiPropertyOptional({
    description: 'Building name/number',
    example: 'Tower 5',
  })
  @IsOptional()
  @IsString()
  building?: string;

  @ApiPropertyOptional({
    description: 'Floor number',
    example: '12',
  })
  @IsOptional()
  @IsString()
  floor?: string;

  @ApiPropertyOptional({
    description: 'Apartment number',
    example: '1205',
  })
  @IsOptional()
  @IsString()
  apartment?: string;

  @ApiProperty({
    description: 'City name',
    example: 'Riyadh',
  })
  @IsString()
  city: string;

  @ApiProperty({
    description: 'District/Neighborhood',
    example: 'Al Olaya',
  })
  @IsString()
  district: string;

  @ApiPropertyOptional({
    description: 'GPS latitude',
    example: 24.7136,
  })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({
    description: 'GPS longitude',
    example: 46.6753,
  })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({
    description: 'Delivery instructions',
    example: 'Ring bell twice, leave at door',
  })
  @IsOptional()
  @IsString()
  instructions?: string;

  @ApiPropertyOptional({
    description: 'Mark as default address',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

// ==================== LOYALTY ====================

export class RedeemPointsDto {
  @ApiProperty({
    description: 'Number of points to redeem',
    example: 500,
  })
  @IsNumber()
  points: number;
}

// ==================== LOYALTY TIER ====================

export class CreateLoyaltyTierDto {
  @ApiProperty({
    description: 'Tier name (English)',
    example: 'Gold Member',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Tier name (Arabic)',
    example: 'عضو ذهبي',
  })
  @IsString()
  nameAr: string;

  @ApiProperty({
    description: 'Minimum total spent to reach this tier (SAR)',
    example: 5000.0,
  })
  @IsNumber()
  minSpent: number;

  @ApiProperty({
    description: 'Minimum number of orders to reach this tier',
    example: 50,
  })
  @IsNumber()
  minOrders: number;

  @ApiProperty({
    description: 'Points multiplier for this tier',
    example: 1.5,
  })
  @IsNumber()
  pointsMultiplier: number;

  @ApiProperty({
    description: 'Discount percentage for this tier',
    example: 10.0,
  })
  @IsNumber()
  discountPercent: number;

  @ApiProperty({
    description: 'Display color (hex)',
    example: '#FFD700',
  })
  @IsString()
  color: string;

  @ApiPropertyOptional({
    description: 'Icon name/URL',
    example: 'crown',
  })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiProperty({
    description: 'Display order',
    example: 2,
  })
  @IsNumber()
  displayOrder: number;
}

export class UpdateLoyaltyTierDto extends PartialType(CreateLoyaltyTierDto) { }
