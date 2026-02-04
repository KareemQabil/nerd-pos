import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuditLogResponseDto {
  @ApiProperty({ description: 'Audit log ID', example: 'audit_1' })
  id: string;

  @ApiPropertyOptional({ description: 'User UUID', example: 'usr_456' })
  userId?: string | null;

  @ApiProperty({ description: 'Action type', example: 'UPDATE' })
  action: string;

  @ApiProperty({ description: 'Entity type', example: 'Product' })
  entityType: string;

  @ApiProperty({ description: 'Entity UUID', example: 'prod_123' })
  entityId: string;

  @ApiPropertyOptional({ description: 'Previous values' })
  oldValues?: Record<string, unknown> | null;

  @ApiPropertyOptional({ description: 'New values' })
  newValues?: Record<string, unknown> | null;

  @ApiPropertyOptional({ description: 'Client IP address', example: '192.168.1.10' })
  ipAddress?: string | null;

  @ApiPropertyOptional({ description: 'User agent string' })
  userAgent?: string | null;

  @ApiProperty({ description: 'Created at', example: '2026-01-23T12:00:00Z' })
  createdAt: Date;

  @ApiPropertyOptional({ description: 'Alias for entityType', example: 'Product' })
  entity?: string;

  @ApiPropertyOptional({ description: 'Alias for oldValues' })
  before?: Record<string, unknown> | null;

  @ApiPropertyOptional({ description: 'Alias for newValues' })
  after?: Record<string, unknown> | null;

  @ApiPropertyOptional({ description: 'Username', example: 'admin' })
  username?: string;

  @ApiPropertyOptional({ description: 'Module name', example: 'products' })
  module?: string;

  @ApiPropertyOptional({ description: 'Calculated changes object' })
  changes?: Record<string, unknown> | null;

  @ApiPropertyOptional({ description: 'API endpoint path', example: '/api/v1/products' })
  endpoint?: string | null;

  @ApiPropertyOptional({ description: 'HTTP method', example: 'PUT' })
  method?: string | null;

  @ApiPropertyOptional({ description: 'Success flag', example: true })
  success?: boolean;

  @ApiPropertyOptional({ description: 'Error message', example: 'Validation error' })
  errorMessage?: string | null;

  @ApiPropertyOptional({ description: 'Session UUID', example: 'sess_123' })
  sessionId?: string | null;

  @ApiPropertyOptional({ description: 'Business date', example: '2026-01-23T00:00:00Z' })
  businessDate?: Date;
}
