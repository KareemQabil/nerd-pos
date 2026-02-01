// Kitchen DTOs
// Source: FINAL/BACKEND/08-MODULE-KITCHEN.md

import {
  IsString,
  IsNumber,
  IsOptional,
  IsUUID,
  IsArray,
  IsIn,
  IsBoolean,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ==================== KITCHEN STATION ====================

export class CreateKitchenStationDto {
  @ApiProperty({
    description: 'Kitchen station name (English)',
    example: 'Grill Station',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Kitchen station name (Arabic)',
    example: 'محطة الشواء',
  })
  @IsString()
  nameAr: string;

  @ApiProperty({
    description: 'Display color (hex)',
    example: '#FF5722',
  })
  @IsString()
  color: string;

  @ApiProperty({
    description: 'Display order on KDS',
    example: 1,
  })
  @IsNumber()
  displayOrder: number;

  @ApiPropertyOptional({
    description: 'Category UUIDs routed to this station',
    example: ['723e4567-e89b-12d3-a456-426614174006'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  categoryIds?: string[];
}

export class UpdateKitchenStationDto extends PartialType(
  CreateKitchenStationDto,
) {}

// ==================== TICKET OPERATIONS ====================

export class RouteOrderDto {
  @ApiProperty({
    description: 'Order UUID to route to kitchen',
    example: 'o23e4567-e89b-12d3-a456-426614174023',
  })
  @IsUUID()
  orderId: string;
}

export class BumpItemDto {
  @ApiProperty({
    description: 'Kitchen ticket UUID',
    example: 'k23e4567-e89b-12d3-a456-426614174026',
  })
  @IsUUID()
  ticketId: string;

  @ApiProperty({
    description: 'Ticket item UUID to bump (mark as completed)',
    example: 'i23e4567-e89b-12d3-a456-426614174027',
  })
  @IsUUID()
  itemId: string;
}

export class UpdateTicketStatusDto {
  @ApiProperty({
    description: 'New ticket status',
    enum: ['NEW', 'PREPARING', 'READY', 'COMPLETED'],
    example: 'PREPARING',
  })
  @IsIn(['NEW', 'PREPARING', 'READY', 'COMPLETED'])
  status: 'NEW' | 'PREPARING' | 'READY' | 'COMPLETED';
}

// ==================== TICKET ITEM ====================

export class UpdateTicketItemStatusDto {
  @ApiProperty({
    description: 'New item status',
    enum: ['NEW', 'PREPARING', 'READY'],
    example: 'READY',
  })
  @IsIn(['NEW', 'PREPARING', 'READY'])
  status: 'NEW' | 'PREPARING' | 'READY';
}
