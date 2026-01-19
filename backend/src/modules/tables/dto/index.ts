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

// ==================== FLOOR ====================

export class CreateFloorDto {
  @IsString()
  name: string;

  @IsString()
  nameAr: string;

  @IsNumber()
  displayOrder: number;
}

export class UpdateFloorDto extends PartialType(CreateFloorDto) {}

// ==================== TABLE ====================

export class CreateTableDto {
  @IsString()
  number: string;

  @IsUUID()
  floorId: string;

  @IsNumber()
  capacity: number;

  @IsIn(['INDOOR', 'OUTDOOR', 'VIP'])
  section: 'INDOOR' | 'OUTDOOR' | 'VIP';

  @IsOptional()
  @IsIn(['SQUARE', 'ROUND', 'RECTANGLE'])
  shape?: 'SQUARE' | 'ROUND' | 'RECTANGLE';

  @IsOptional()
  @IsNumber()
  positionX?: number;

  @IsOptional()
  @IsNumber()
  positionY?: number;
}

export class UpdateTableDto extends PartialType(CreateTableDto) {}

// ==================== TABLE TRANSFER ====================

export class TransferTableDto {
  @IsUUID()
  fromTableId: string;

  @IsUUID()
  toTableId: string;

  @IsUUID()
  orderId: string;
}

// ==================== RESERVATION ====================

export class CreateReservationDto {
  @IsUUID()
  tableId: string;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsString()
  customerName: string;

  @IsString()
  customerPhone: string;

  @IsDate()
  @Type(() => Date)
  reservedFor: Date;

  @IsNumber()
  partySize: number;

  @IsOptional()
  @IsNumber()
  duration?: number;

  @IsOptional()
  @IsString()
  specialRequests?: string;

  @IsString()
  userId: string;
}

export class UpdateReservationStatusDto {
  @IsIn(['PENDING', 'CONFIRMED', 'SEATED', 'CANCELLED', 'NO_SHOW'])
  status: 'PENDING' | 'CONFIRMED' | 'SEATED' | 'CANCELLED' | 'NO_SHOW';
}
