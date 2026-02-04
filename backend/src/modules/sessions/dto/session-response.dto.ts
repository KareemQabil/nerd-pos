import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DenominationCountResponseDto {
  @ApiProperty({ description: 'Denomination value', example: 100 })
  denomination: number;

  @ApiProperty({ description: 'Count of bills/coins', example: 10 })
  count: number;

  @ApiProperty({ description: 'Total value for this denomination', example: 1000 })
  total: number;
}

export class SessionResponseDto {
  @ApiProperty({ description: 'Session ID (UUID)', example: 's23e4567-e89b-12d3-a456-426614174013' })
  id: string;

  @ApiPropertyOptional({ description: 'Human-readable session number', example: 'S-001' })
  sessionNumber?: string;

  @ApiProperty({ description: 'Terminal ID', example: 'term-001' })
  terminalId: string;

  @ApiProperty({ description: 'User ID (UUID)', example: 'u23e4567-e89b-12d3-a456-426614174020' })
  userId: string;

  @ApiProperty({ description: 'Business date', example: '2026-01-23' })
  businessDate: Date;

  @ApiProperty({ description: 'Opening cash balance', example: 500 })
  openingBalance: number;

  @ApiProperty({ description: 'Expected cash at close', example: 850 })
  expectedCash: number;

  @ApiPropertyOptional({ description: 'Actual closing cash balance', example: 845 })
  actualClosingBalance?: number | null;

  @ApiPropertyOptional({ description: 'Cash discrepancy', example: -5 })
  discrepancy?: number | null;

  @ApiProperty({ description: 'Opened at timestamp', example: '2026-01-23T09:00:00Z' })
  openedAt: Date;

  @ApiPropertyOptional({ description: 'Closed at timestamp', example: '2026-01-23T18:00:00Z' })
  closedAt?: Date | null;

  @ApiProperty({ description: 'Session status', example: 'OPEN' })
  status: string;

  @ApiProperty({ description: 'Total cash sales', example: 500 })
  totalCashSales: number;

  @ApiProperty({ description: 'Total card sales', example: 350 })
  totalCardSales: number;

  @ApiProperty({ description: 'Total other sales', example: 0 })
  totalOtherSales: number;

  @ApiProperty({ description: 'Total refunds', example: 0 })
  totalRefunds: number;

  @ApiProperty({ description: 'Number of orders', example: 25 })
  ordersCount: number;

  @ApiPropertyOptional({ description: 'Manager approval ID', example: 'u23e4567-e89b-12d3-a456-426614174020' })
  managerApprovalId?: string | null;

  @ApiPropertyOptional({ description: 'Closing notes', example: 'Drawer balanced' })
  closingNotes?: string | null;
}

export class SessionWithDetailsResponseDto extends SessionResponseDto {
  @ApiPropertyOptional({
    description: 'Denomination counts captured at close',
    type: () => DenominationCountResponseDto,
    isArray: true,
  })
  denominationCounts?: DenominationCountResponseDto[];
}
