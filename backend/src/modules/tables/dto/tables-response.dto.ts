import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FloorResponseDto {
  @ApiProperty({ description: 'Floor ID (UUID)', example: 'floor_1' })
  id: string;

  @ApiProperty({ description: 'Floor name (English)', example: 'Main Hall' })
  name: string;

  @ApiProperty({ description: 'Floor name (Arabic)', example: 'Main Hall (AR)' })
  nameAr: string;

  @ApiProperty({ description: 'Display order', example: 1 })
  displayOrder: number;

  @ApiProperty({ description: 'Active flag', example: true })
  isActive: boolean;

  @ApiProperty({ description: 'Created timestamp', example: '2026-01-23T12:00:00Z' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated timestamp', example: '2026-01-24T12:00:00Z' })
  updatedAt: Date;
}

export class TableResponseDto {
  @ApiProperty({ description: 'Table ID (UUID)', example: 'tbl_1' })
  id: string;

  @ApiProperty({ description: 'Table number', example: 'T1' })
  number: string;

  @ApiProperty({ description: 'Floor ID', example: 'floor_1' })
  floorId: string;

  @ApiProperty({ description: 'Capacity', example: 4 })
  capacity: number;

  @ApiProperty({ description: 'Section', example: 'INDOOR' })
  section: string;

  @ApiProperty({ description: 'Shape', example: 'SQUARE' })
  shape: string;

  @ApiPropertyOptional({ description: 'Position X', example: 10 })
  positionX?: number | null;

  @ApiPropertyOptional({ description: 'Position Y', example: 12 })
  positionY?: number | null;

  @ApiProperty({ description: 'Status', example: 'AVAILABLE' })
  status: string;

  @ApiPropertyOptional({ description: 'Current order ID', example: 'ord_123' })
  currentOrderId?: string | null;

  @ApiPropertyOptional({ description: 'Assigned waiter ID', example: 'user_123' })
  waiterId?: string | null;

  @ApiProperty({ description: 'Active flag', example: true })
  isActive: boolean;

  @ApiProperty({ description: 'Created timestamp', example: '2026-01-23T12:00:00Z' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated timestamp', example: '2026-01-24T12:00:00Z' })
  updatedAt: Date;
}

export class FloorWithTablesResponseDto extends FloorResponseDto {
  @ApiProperty({ description: 'Tables on the floor', type: () => TableResponseDto, isArray: true })
  tables: TableResponseDto[];
}

export class TableReservationResponseDto {
  @ApiProperty({ description: 'Reservation ID (UUID)', example: 'res_123' })
  id: string;

  @ApiProperty({ description: 'Table ID', example: 'tbl_1' })
  tableId: string;

  @ApiPropertyOptional({ description: 'Customer ID', example: 'cust_123' })
  customerId?: string | null;

  @ApiProperty({ description: 'Customer name', example: 'Ahmed Ali' })
  customerName: string;

  @ApiProperty({ description: 'Customer phone', example: '+966501234567' })
  customerPhone: string;

  @ApiProperty({ description: 'Reserved for datetime', example: '2026-01-23T19:00:00Z' })
  reservedFor: Date;

  @ApiProperty({ description: 'Party size', example: 4 })
  partySize: number;

  @ApiProperty({ description: 'Duration in minutes', example: 90 })
  duration: number;

  @ApiPropertyOptional({ description: 'Special requests', example: 'Window seat' })
  specialRequests?: string | null;

  @ApiProperty({ description: 'Reservation status', example: 'CONFIRMED' })
  status: string;

  @ApiProperty({ description: 'Created by user ID', example: 'user_123' })
  createdBy: string;

  @ApiProperty({ description: 'Created at timestamp', example: '2026-01-23T12:00:00Z' })
  createdAt: Date;
}
