// Tables DTOs
// Source: FINAL/BACKEND/12-MODULE-TABLES.md

import {
  IsString,
  IsNumber,
  IsOptional,
  IsUUID,
  IsIn,
  IsBoolean,
  IsDate,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ==================== FLOOR ====================

export class CreateFloorDto {
  @ApiProperty({
    description: 'Floor name (English)',
    example: 'Ground Floor',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Floor name (Arabic)',
    example: 'الطابق الأرضي',
  })
  @IsString()
  nameAr: string;

  @ApiProperty({
    description: 'Display order',
    example: 1,
  })
  @IsNumber()
  displayOrder: number;

  @ApiPropertyOptional({
    description: 'Whether the floor is active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateFloorDto extends PartialType(CreateFloorDto) { }

// ==================== TABLE ====================

export class CreateTableDto {
  @ApiProperty({
    description: 'Table number/identifier',
    example: 'T-12',
  })
  @IsString()
  number: string;

  @ApiProperty({
    description: 'Floor UUID this table belongs to',
    example: 'f23e4567-e89b-12d3-a456-426614174028',
  })
  @IsUUID()
  floorId: string;

  @ApiProperty({
    description: 'Maximum number of guests',
    example: 4,
  })
  @IsNumber()
  capacity: number;

  @ApiProperty({
    description: 'Table section/area',
    enum: ['INDOOR', 'OUTDOOR', 'VIP'],
    example: 'INDOOR',
  })
  @IsIn(['INDOOR', 'OUTDOOR', 'VIP'])
  section: 'INDOOR' | 'OUTDOOR' | 'VIP';

  @ApiPropertyOptional({
    description: 'Table shape',
    enum: ['SQUARE', 'ROUND', 'RECTANGLE'],
    example: 'SQUARE',
  })
  @IsOptional()
  @IsIn(['SQUARE', 'ROUND', 'RECTANGLE'])
  shape?: 'SQUARE' | 'ROUND' | 'RECTANGLE';

  @ApiPropertyOptional({
    description: 'X position on floor map',
    example: 100,
  })
  @IsOptional()
  @IsNumber()
  positionX?: number;

  @ApiPropertyOptional({
    description: 'Y position on floor map',
    example: 150,
  })
  @IsOptional()
  @IsNumber()
  positionY?: number;
}

export class UpdateTableDto extends PartialType(CreateTableDto) { }

// ==================== TABLE TRANSFER ====================

export class TransferTableDto {
  @ApiProperty({
    description: 'Source table UUID',
    example: 't23e4567-e89b-12d3-a456-426614174012',
  })
  @IsUUID()
  fromTableId: string;

  @ApiProperty({
    description: 'Destination table UUID',
    example: 't33e4567-e89b-12d3-a456-426614174029',
  })
  @IsUUID()
  toTableId: string;

  @ApiProperty({
    description: 'Order UUID to transfer',
    example: 'o23e4567-e89b-12d3-a456-426614174023',
  })
  @IsUUID()
  orderId: string;
}

// ==================== RESERVATION ====================

export class CreateReservationDto {
  @ApiProperty({
    description: 'Table UUID to reserve',
    example: 't23e4567-e89b-12d3-a456-426614174012',
  })
  @IsUUID()
  tableId: string;

  @ApiPropertyOptional({
    description: 'Customer UUID (if registered)',
    example: 'c23e4567-e89b-12d3-a456-426614174011',
  })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiProperty({
    description: 'Customer name',
    example: 'Mohammed Al-Otaibi',
  })
  @IsString()
  customerName: string;

  @ApiProperty({
    description: 'Customer phone number',
    example: '+966501234567',
  })
  @IsString()
  customerPhone: string;

  @ApiProperty({
    description: 'Reservation date and time',
    example: '2024-01-20T19:00:00Z',
  })
  @IsDate()
  @Type(() => Date)
  reservedFor: Date;

  @ApiProperty({
    description: 'Number of guests',
    example: 6,
  })
  @IsNumber()
  partySize: number;

  @ApiPropertyOptional({
    description: 'Reservation duration in minutes',
    example: 120,
  })
  @IsOptional()
  @IsNumber()
  duration?: number;

  @ApiPropertyOptional({
    description: 'Special requests or notes',
    example: 'Birthday celebration, need cake plates',
  })
  @IsOptional()
  @IsString()
  specialRequests?: string;

  @ApiProperty({
    description: 'User UUID who created the reservation',
    example: 'u23e4567-e89b-12d3-a456-426614174020',
  })
  @IsString()
  userId: string;

  @ApiPropertyOptional({
    description: 'Created by (redundant field)',
    example: 'u23e4567-e89b-12d3-a456-426614174020',
  })
  @IsOptional()
  @IsString()
  createdBy?: string;

  @ApiPropertyOptional({
    description: 'Reservation status',
    enum: ['PENDING', 'CONFIRMED', 'SEATED', 'CANCELLED', 'NO_SHOW'],
    example: 'CONFIRMED',
  })
  @IsOptional()
  @IsIn(['PENDING', 'CONFIRMED', 'SEATED', 'CANCELLED', 'NO_SHOW'])
  status?: 'PENDING' | 'CONFIRMED' | 'SEATED' | 'CANCELLED' | 'NO_SHOW';
}

export class UpdateReservationStatusDto {
  @ApiProperty({
    description: 'New reservation status',
    enum: ['PENDING', 'CONFIRMED', 'SEATED', 'CANCELLED', 'NO_SHOW'],
    example: 'SEATED',
  })
  @IsIn(['PENDING', 'CONFIRMED', 'SEATED', 'CANCELLED', 'NO_SHOW'])
  status: 'PENDING' | 'CONFIRMED' | 'SEATED' | 'CANCELLED' | 'NO_SHOW';
}
