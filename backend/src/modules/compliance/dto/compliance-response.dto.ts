import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ComplianceInvoiceResponseDto {
  @ApiProperty({ description: 'Invoice ID', example: 'inv_123' })
  id: string;

  @ApiProperty({ description: 'Order UUID', example: 'ord_123' })
  orderId: string;

  @ApiPropertyOptional({ description: 'Invoice UUID', example: 'uuid_123' })
  uuid?: string;

  @ApiPropertyOptional({ description: 'Invoice hash', example: 'a1b2c3d4' })
  hash?: string;

  @ApiPropertyOptional({ description: 'Invoice hash alias', example: 'a1b2c3d4' })
  invoiceHash?: string;

  @ApiPropertyOptional({ description: 'Current hash alias', example: 'a1b2c3d4' })
  currentHash?: string;

  @ApiPropertyOptional({ description: 'Previous hash in chain', example: 'z9y8x7w6' })
  previousHash?: string | null;

  @ApiPropertyOptional({ description: 'Digital signature' })
  signature?: string | null;

  @ApiPropertyOptional({ description: 'Certificate public key' })
  publicKey?: string | null;

  @ApiPropertyOptional({ description: 'Invoice XML content' })
  xmlContent?: string;

  @ApiPropertyOptional({ description: 'QR code data (Base64)' })
  qrCodeData?: string;

  @ApiPropertyOptional({ description: 'Submission timestamp', example: '2026-01-23T12:05:00Z' })
  submittedAt?: Date | null;

  @ApiPropertyOptional({ description: 'Clearance status', example: 'CLEARED' })
  clearanceStatus?: string | null;

  @ApiPropertyOptional({ description: 'Clearance ID', example: 'clr_123' })
  clearanceId?: string | null;

  @ApiPropertyOptional({ description: 'ETA UUID', example: 'eta_123' })
  etaUuid?: string | null;

  @ApiPropertyOptional({ description: 'ETA submitted at', example: '2026-01-23T12:06:00Z' })
  etaSubmittedAt?: Date | null;

  @ApiPropertyOptional({ description: 'ETA status', example: 'ACCEPTED' })
  etaStatus?: string | null;

  @ApiPropertyOptional({ description: 'Created at', example: '2026-01-23T12:00:00Z' })
  createdAt?: Date;

  @ApiPropertyOptional({ description: 'Invoice number alias', example: 'INV-2026-000001' })
  invoiceNumber?: string;

  @ApiPropertyOptional({ description: 'Submission status alias', example: 'SUBMITTED' })
  submissionStatus?: string;

  @ApiPropertyOptional({ description: 'QR code alias (Base64)' })
  qrCode?: string;

  @ApiPropertyOptional({ description: 'Invoice XML alias' })
  invoiceXML?: string;

  @ApiPropertyOptional({ description: 'Signed XML alias' })
  signedXML?: string | null;

  @ApiPropertyOptional({ description: 'Response code', example: '200' })
  responseCode?: string | null;

  @ApiPropertyOptional({ description: 'Response message', example: 'Accepted' })
  responseMessage?: string | null;
}

export class HashChainStatusResponseDto {
  @ApiProperty({ description: 'Last invoice ID in chain', example: 'inv_123' })
  lastInvoiceId: string;

  @ApiProperty({ description: 'Last hash value', example: 'a1b2c3d4' })
  lastHash: string;

  @ApiProperty({ description: 'Chain valid flag', example: true })
  chainValid: boolean;

  @ApiProperty({ description: 'Total invoices checked', example: 10 })
  totalInvoices: number;

  @ApiPropertyOptional({ description: 'Broken invoice ID', example: 'inv_100' })
  brokenAtInvoiceId?: string;

  @ApiPropertyOptional({ description: 'Expected hash', example: 'expected_hash' })
  expectedHash?: string;

  @ApiPropertyOptional({ description: 'Actual hash', example: 'actual_hash' })
  actualHash?: string;
}
