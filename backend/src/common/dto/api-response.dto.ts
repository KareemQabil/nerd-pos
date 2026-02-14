import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApiErrorDto {
  @ApiProperty({
    description: 'Error message key for localization',
    example: 'CUSTOMER_NOT_FOUND',
  })
  messageKey: string;

  @ApiProperty({
    description: 'Error message in English',
    example: 'Customer not found.',
  })
  messageEn: string;

  @ApiProperty({
    description: 'Error message in Arabic',
    example: 'العميل غير موجود',
  })
  messageAr: string;

  @ApiPropertyOptional({
    description: 'Optional error details payload',
    example: { customerId: 'c23e4567-e89b-12d3-a456-426614174011' },
  })
  details?: unknown;
}

export class ApiResponseEnvelopeDto<T> {
  @ApiProperty({
    description: 'Result payload (null on errors)',
    nullable: true,
  })
  result: T | null;

  @ApiProperty({
    description: 'Error payload (null on success)',
    nullable: true,
    type: () => ApiErrorDto,
  })
  error: ApiErrorDto | null;
}
