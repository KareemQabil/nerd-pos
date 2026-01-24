// Sessions DTOs
// Source: FINAL/BACKEND/07-MODULE-SESSIONS.md

import {
  IsString,
  IsNumber,
  IsUUID,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

// ==================== OPEN SESSION ====================

export class OpenSessionDto {
  @ApiProperty({
    description: 'Terminal ID for the session',
    example: 'term-001',
  })
  @IsString()
  terminalId: string;

  @ApiProperty({
    description: 'Opening cash balance (SAR)',
    example: 500.0,
  })
  @IsNumber()
  openingBalance: number;
}

// ==================== DENOMINATION ====================

export class DenominationDto {
  @ApiProperty({
    description: 'Currency denomination value',
    example: 100,
    enum: [200, 100, 50, 20, 10, 5, 1, 0.5, 0.25, 0.10, 0.05],
  })
  @IsNumber()
  value: number;

  @ApiProperty({
    description: 'Count of bills/coins',
    example: 10,
  })
  @IsNumber()
  count: number;
}

// ==================== CLOSE SESSION ====================

export class CloseSessionDto {
  @ApiProperty({
    description: 'Session UUID to close',
    example: 's23e4567-e89b-12d3-a456-426614174013',
  })
  @IsUUID()
  sessionId: string;

  @ApiProperty({
    description: 'Cash denominations at closing',
    type: [DenominationDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DenominationDto)
  denominations: DenominationDto[];
}

// ==================== CREATE DENOMINATION (Repository) ====================

export class CreateDenominationDto {
  @ApiProperty({
    description: 'Session UUID',
    example: 's23e4567-e89b-12d3-a456-426614174013',
  })
  @IsString()
  sessionId: string;

  @ApiProperty({
    description: 'Denomination value',
    example: 100,
  })
  @IsNumber()
  denomination: number;

  @ApiProperty({
    description: 'Count of this denomination',
    example: 10,
  })
  @IsNumber()
  count: number;

  @ApiProperty({
    description: 'Total value (denomination × count)',
    example: 1000.0,
  })
  @IsNumber()
  total: number;
}
