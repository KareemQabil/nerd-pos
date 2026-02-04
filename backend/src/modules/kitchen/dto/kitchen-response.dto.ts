import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class KitchenStationResponseDto {
  @ApiProperty({ description: 'Station ID (UUID)', example: 'st_1' })
  id: string;

  @ApiProperty({ description: 'Station name (English)', example: 'Grill Station' })
  name: string;

  @ApiProperty({ description: 'Station name (Arabic)', example: 'Grill Station (AR)' })
  nameAr: string;

  @ApiProperty({ description: 'Display color (hex)', example: '#FF5722' })
  color: string;

  @ApiProperty({ description: 'Display order', example: 1 })
  displayOrder: number;

  @ApiProperty({ description: 'Is active', example: true })
  isActive: boolean;
}

export class KitchenTicketItemResponseDto {
  @ApiProperty({ description: 'Ticket item ID (UUID)', example: 'item_1' })
  id: string;

  @ApiProperty({ description: 'Ticket ID (UUID)', example: 'tkt_123' })
  ticketId: string;

  @ApiProperty({ description: 'Product ID (UUID)', example: 'prod_123' })
  productId: string;

  @ApiProperty({ description: 'Product name (English)', example: 'Burger' })
  productName: string;

  @ApiProperty({ description: 'Product name (Arabic)', example: 'Burger (AR)' })
  productNameAr: string;

  @ApiProperty({ description: 'Quantity', example: 2 })
  quantity: number;

  @ApiPropertyOptional({ description: 'Item notes', example: 'No onions' })
  notes?: string | null;

  @ApiPropertyOptional({ description: 'Item modifiers payload', example: [{ name: 'Extra Cheese', price: 5 }] })
  modifiers?: unknown;

  @ApiProperty({ description: 'Item status', example: 'PENDING' })
  status: string;

  @ApiProperty({ description: 'Created timestamp', example: '2026-01-23T12:00:00Z' })
  createdAt: Date;
}

export class KitchenTicketResponseDto {
  @ApiProperty({ description: 'Ticket ID (UUID)', example: 'tkt_123' })
  id: string;

  @ApiProperty({ description: 'Ticket number', example: 'KT-001' })
  ticketNumber: string;

  @ApiProperty({ description: 'Order ID (UUID)', example: 'ord_456' })
  orderId: string;

  @ApiProperty({ description: 'Station ID (UUID)', example: 'st_1' })
  stationId: string;

  @ApiProperty({ description: 'Priority', example: 1 })
  priority: number;

  @ApiProperty({ description: 'Status', example: 'PREPARING' })
  status: string;

  @ApiProperty({ description: 'Received at', example: '2026-01-23T12:00:00Z' })
  receivedAt: Date;

  @ApiPropertyOptional({ description: 'Started at', example: '2026-01-23T12:05:00Z' })
  startedAt?: Date | null;

  @ApiPropertyOptional({ description: 'Completed at', example: '2026-01-23T12:20:00Z' })
  completedAt?: Date | null;

  @ApiProperty({ description: 'Created at', example: '2026-01-23T12:00:00Z' })
  createdAt: Date;
}

export class KitchenTicketWithItemsResponseDto extends KitchenTicketResponseDto {
  @ApiPropertyOptional({
    description: 'Ticket items',
    type: () => KitchenTicketItemResponseDto,
    isArray: true,
  })
  items?: KitchenTicketItemResponseDto[];

  @ApiPropertyOptional({
    description: 'Kitchen station details',
    type: () => KitchenStationResponseDto,
  })
  station?: KitchenStationResponseDto;
}
