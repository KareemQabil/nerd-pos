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

// ==================== OPEN SESSION ====================

export class OpenSessionDto {
  @IsString()
  userId: string;

  @IsNumber()
  openingBalance: number;
}

// ==================== DENOMINATION ====================

export class DenominationDto {
  @IsNumber()
  value: number; // 200, 100, 50, 20, 10, 5, 1, 0.5, 0.25, 0.10, 0.05

  @IsNumber()
  count: number;
}

// ==================== CLOSE SESSION ====================

export class CloseSessionDto {
  @IsUUID()
  sessionId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DenominationDto)
  denominations: DenominationDto[];
}
