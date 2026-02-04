import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DailySalesReportDto {
  @ApiProperty({ description: 'Report date (YYYY-MM-DD)', example: '2026-01-23' })
  date: string;

  @ApiProperty({ description: 'Total sales amount', example: 5000 })
  totalSales: number;

  @ApiProperty({ description: 'Total tax amount', example: 750 })
  totalTax: number;

  @ApiProperty({ description: 'Number of orders', example: 150 })
  orderCount: number;

  @ApiProperty({ description: 'Average order value', example: 33.33 })
  averageOrderValue: number;
}

export class ZReportDto {
  @ApiProperty({ description: 'Session UUID', example: 'sess_123' })
  sessionId: string;

  @ApiProperty({ description: 'Session number (if applicable)', example: 'sess_123' })
  sessionNumber: string;

  @ApiProperty({ description: 'Session opened time', example: '2026-01-23T08:00:00Z' })
  openedAt: Date;

  @ApiProperty({ description: 'Session closed time', example: '2026-01-23T22:00:00Z' })
  closedAt: Date;

  @ApiProperty({ description: 'Opening balance', example: 100 })
  openingBalance: number;

  @ApiProperty({ description: 'Closing balance', example: 350 })
  closingBalance: number;

  @ApiProperty({ description: 'Expected cash balance', example: 340 })
  expectedBalance: number;

  @ApiProperty({ description: 'Cash variance', example: 10 })
  variance: number;

  @ApiProperty({ description: 'Total sales amount', example: 4500 })
  totalSales: number;

  @ApiProperty({ description: 'Cash sales amount', example: 2000 })
  cashSales: number;

  @ApiProperty({ description: 'Card sales amount', example: 2500 })
  cardSales: number;

  @ApiProperty({ description: 'Other sales amount', example: 0 })
  otherSales: number;

  @ApiProperty({ description: 'Refunds amount', example: 100 })
  refunds: number;

  @ApiProperty({ description: 'Number of orders', example: 150 })
  orderCount: number;
}

export class TopSellingAggregateDto {
  @ApiPropertyOptional({ description: 'Total quantity sold', example: 150 })
  quantity?: number | null;

  @ApiPropertyOptional({ description: 'Total line revenue', example: 2250 })
  lineTotal?: number | null;
}

export class TopSellingItemDto {
  @ApiProperty({ description: 'Product UUID', example: 'prod_123' })
  productId: string;

  @ApiProperty({ description: 'Aggregate totals', type: TopSellingAggregateDto })
  _sum: TopSellingAggregateDto;
}

export class InventoryValuationItemDto {
  @ApiProperty({ description: 'Product UUID', example: 'prod_123' })
  productId: string;

  @ApiPropertyOptional({ description: 'Product name', example: 'Coffee Beans' })
  productName?: string | null;

  @ApiProperty({ description: 'Quantity on hand', example: 120 })
  quantity: number;

  @ApiProperty({ description: 'Average unit cost', example: 10.5 })
  cost: number;

  @ApiProperty({ description: 'Total item value', example: 1260 })
  value: number;
}

export class InventoryValuationDto {
  @ApiProperty({ description: 'Total inventory value', example: 50000 })
  totalValue: number;

  @ApiProperty({ description: 'Count of items in valuation', example: 2500 })
  itemCount: number;

  @ApiProperty({ description: 'Valuation items', type: [InventoryValuationItemDto] })
  items: InventoryValuationItemDto[];
}
