// Audit DTOs
import {
  IsString,
  IsOptional,
  IsDate,
  IsUUID,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAuditLogDto {
  @ApiProperty({ description: 'User UUID', example: 'u23e4567-e89b-12d3-a456-426614174020' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Username', example: 'admin' })
  @IsString()
  username: string;

  @ApiProperty({ description: 'Module name', example: 'sales' })
  @IsString()
  module: string;

  @ApiProperty({ description: 'Action name', example: 'CREATE_ORDER' })
  @IsString()
  action: string;

  @ApiProperty({ description: 'Entity type', example: 'Order' })
  @IsString()
  entity: string;

  @ApiProperty({ description: 'Entity UUID', example: 'o23e4567-e89b-12d3-a456-426614174023' })
  @IsString()
  entityId: string;

  @ApiPropertyOptional({
    description: 'State before the change',
    example: { status: 'DRAFT', grandTotal: 0 },
  })
  @IsOptional()
  before?: any;

  @ApiPropertyOptional({
    description: 'State after the change',
    example: { status: 'CONFIRMED', grandTotal: 115.5 },
  })
  @IsOptional()
  after?: any;

  @ApiPropertyOptional({ description: 'Client IP address', example: '192.168.1.10' })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional({ description: 'Endpoint path', example: '/api/v1/orders' })
  @IsOptional()
  @IsString()
  endpoint?: string;

  @ApiPropertyOptional({ description: 'HTTP method', example: 'POST' })
  @IsOptional()
  @IsString()
  method?: string;

  @ApiProperty({ description: 'Whether the action succeeded', example: true })
  @IsBoolean()
  success: boolean;

  @ApiPropertyOptional({ description: 'Error message (if failed)', example: 'Validation failed' })
  @IsOptional()
  @IsString()
  errorMessage?: string;

  @ApiPropertyOptional({ description: 'Session UUID', example: 's23e4567-e89b-12d3-a456-426614174013' })
  @IsOptional()
  @IsString()
  sessionId?: string;
}

export class AuditQueryDto {
  @ApiPropertyOptional({ description: 'Filter by user UUID', example: 'u23e4567-e89b-12d3-a456-426614174020' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ description: 'Filter by module', example: 'sales' })
  @IsOptional()
  @IsString()
  module?: string;

  @ApiPropertyOptional({ description: 'Filter by entity', example: 'Order' })
  @IsOptional()
  @IsString()
  entity?: string;

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
}
