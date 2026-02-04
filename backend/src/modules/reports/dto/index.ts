// Reports DTOs
import { IsString, IsOptional, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateReportDto {
  @ApiProperty({ description: 'Report type', example: 'DAILY_SALES' })
  @IsString()
  reportType: string;

  @ApiPropertyOptional({ description: 'Start date (ISO)', example: '2026-01-01T00:00:00Z' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date;

  @ApiPropertyOptional({ description: 'End date (ISO)', example: '2026-01-31T23:59:59Z' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;

  @ApiPropertyOptional({ description: 'User UUID (optional filter)', example: 'u23e4567-e89b-12d3-a456-426614174020' })
  @IsOptional()
  @IsString()
  userId?: string;
}

export class DateRangeDto {
  @ApiProperty({ description: 'Start date (ISO)', example: '2026-01-01T00:00:00Z' })
  @IsDate()
  @Type(() => Date)
  startDate: Date;

  @ApiProperty({ description: 'End date (ISO)', example: '2026-01-31T23:59:59Z' })
  @IsDate()
  @Type(() => Date)
  endDate: Date;
}

export * from './reports-response.dto';
