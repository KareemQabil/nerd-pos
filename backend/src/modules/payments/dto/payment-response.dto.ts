import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PaymentMethodResponseDto {
  @ApiProperty({ description: 'Payment method ID (UUID)', example: 'pm_123' })
  id: string;

  @ApiProperty({ description: 'Method code', example: 'CASH' })
  code: string;

  @ApiProperty({ description: 'Method name (English)', example: 'Cash' })
  nameEn: string;

  @ApiProperty({ description: 'Method name (Arabic)', example: 'Cash (AR)' })
  nameAr: string;

  @ApiProperty({ description: 'Method type', example: 'CASH' })
  type: string;

  @ApiProperty({ description: 'Requires terminal', example: false })
  requiresTerminal: boolean;

  @ApiProperty({ description: 'Requires reference number', example: false })
  requiresReference: boolean;

  @ApiProperty({ description: 'Whether method is active', example: true })
  isActive: boolean;

  @ApiProperty({ description: 'Sort order', example: 1 })
  sortOrder: number;
}

export class PaymentResponseDto {
  @ApiProperty({ description: 'Payment ID (UUID)', example: 'pay_123' })
  id: string;

  @ApiProperty({ description: 'Order ID (UUID)', example: 'ord_123' })
  orderId: string;

  @ApiPropertyOptional({ description: 'Order item ID (UUID)', example: 'item_123' })
  orderItemId?: string | null;

  @ApiProperty({ description: 'Payment method code', example: 'CARD' })
  paymentMethod: string;

  @ApiProperty({ description: 'Payment amount', example: 50 })
  amount: number;

  @ApiPropertyOptional({ description: 'Amount received', example: 60 })
  amountReceived?: number | null;

  @ApiPropertyOptional({ description: 'Change given', example: 10 })
  changeGiven?: number | null;

  @ApiPropertyOptional({ description: 'Reference number', example: 'REF-123' })
  referenceNumber?: string | null;

  @ApiPropertyOptional({ description: 'Terminal ID', example: 'term-001' })
  terminalId?: string | null;

  @ApiPropertyOptional({ description: 'Approval code', example: 'APPR-321' })
  approvalCode?: string | null;

  @ApiPropertyOptional({ description: 'Foreign currency code', example: 'USD' })
  foreignCurrencyCode?: string | null;

  @ApiPropertyOptional({ description: 'Foreign amount', example: 15 })
  foreignAmount?: number | null;

  @ApiPropertyOptional({ description: 'Exchange rate', example: 3.75 })
  exchangeRate?: number | null;

  @ApiProperty({ description: 'Payment status', example: 'COMPLETED' })
  status: string;

  @ApiProperty({ description: 'Payment date', example: '2026-01-23T12:06:00Z' })
  paymentDate: Date;

  @ApiProperty({ description: 'Session ID', example: 'sess_123' })
  sessionId: string;

  @ApiProperty({ description: 'Processed by user ID', example: 'user_123' })
  processedBy: string;

  @ApiPropertyOptional({ description: 'Tip amount', example: 5 })
  tipAmount?: number;

  @ApiPropertyOptional({ description: 'Refunded amount', example: 0 })
  refundedAmount?: number;

  @ApiPropertyOptional({ description: 'Metadata payload', example: { provider: 'stripe' } })
  metadata?: Record<string, unknown>;
}

export class RefundResponseDto {
  @ApiProperty({ description: 'Refund ID (UUID)', example: 'ref_123' })
  id: string;

  @ApiProperty({ description: 'Payment ID (UUID)', example: 'pay_123' })
  paymentId: string;

  @ApiProperty({ description: 'Refund amount', example: 50 })
  amount: number;

  @ApiProperty({ description: 'Refund reason', example: 'Customer complaint' })
  reason: string;

  @ApiPropertyOptional({ description: 'Notes', example: 'Approved by manager' })
  notes?: string | null;

  @ApiPropertyOptional({ description: 'Approved by user ID', example: 'user_456' })
  approvedBy?: string | null;

  @ApiPropertyOptional({ description: 'Approved at timestamp', example: '2026-01-23T12:10:00Z' })
  approvedAt?: Date | null;

  @ApiProperty({ description: 'Refund status', example: 'PENDING' })
  status: string;

  @ApiPropertyOptional({ description: 'Created by user ID', example: 'user_123' })
  createdBy?: string;

  @ApiPropertyOptional({ description: 'Created at timestamp', example: '2026-01-23T12:10:00Z' })
  createdAt?: Date;
}
