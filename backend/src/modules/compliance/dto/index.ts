// Compliance DTOs
import { IsString, IsUUID, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateInvoiceDto {
  @ApiProperty({ description: 'Order UUID to generate invoice for', example: 'o23e4567-e89b-12d3-a456-426614174023' })
  @IsUUID()
  orderId: string;
}

export class SubmitInvoiceDto {
  @ApiProperty({ description: 'Invoice UUID to submit', example: 'inv23e4567-e89b-12d3-a456-426614174111' })
  @IsUUID()
  invoiceId: string;
}

export class VerifyHashChainDto {
  @ApiPropertyOptional({ description: 'Start date (YYYY-MM-DD)', example: '2026-01-01' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date (YYYY-MM-DD)', example: '2026-01-31' })
  @IsOptional()
  @IsString()
  endDate?: string;
}
