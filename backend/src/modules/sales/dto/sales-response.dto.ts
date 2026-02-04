import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginatedResponseDto } from '../../../common/dto';

export class OrderItemModifierResponseDto {
  @ApiProperty({ description: 'Modifier ID (UUID)', example: 'mod_123' })
  modifierId: string;

  @ApiProperty({ description: 'Option ID (UUID)', example: 'opt_123' })
  optionId: string;

  @ApiProperty({ description: 'Modifier name', example: 'Extra Cheese' })
  name: string;

  @ApiProperty({ description: 'Modifier price', example: 2.5 })
  price: number;
}

export class OrderItemResponseDto {
  @ApiProperty({ description: 'Order item ID (UUID)', example: 'item_123' })
  id: string;

  @ApiProperty({ description: 'Order ID (UUID)', example: 'ord_123' })
  orderId: string;

  @ApiProperty({ description: 'Product ID (UUID)', example: 'prod_123' })
  productId: string;

  @ApiPropertyOptional({ description: 'Product name (English)', example: 'Latte' })
  productNameEn?: string | null;

  @ApiPropertyOptional({ description: 'Product name (Arabic)', example: 'Latte (AR)' })
  productNameAr?: string | null;

  @ApiProperty({ description: 'Quantity', example: 2 })
  quantity: number;

  @ApiProperty({ description: 'Unit price', example: 15 })
  unitPrice: number;

  @ApiProperty({ description: 'Line total', example: 30 })
  lineTotal: number;

  @ApiPropertyOptional({ description: 'Item notes', example: 'Extra hot' })
  notes?: string | null;

  @ApiProperty({ description: 'Item status', example: 'PENDING' })
  status: string;

  @ApiPropertyOptional({
    description: 'Item modifiers',
    type: () => OrderItemModifierResponseDto,
    isArray: true,
  })
  modifiers?: OrderItemModifierResponseDto[];
}

export class SalesOrderResponseDto {
  @ApiProperty({ description: 'Order ID (UUID)', example: 'ord_123' })
  id: string;

  @ApiProperty({ description: 'Order number', example: 'ORD-20260123-001' })
  orderNumber: string;

  @ApiProperty({ description: 'Order type', example: 'DINE_IN' })
  orderType: string;

  @ApiPropertyOptional({ description: 'Customer ID', example: 'cust_123' })
  customerId?: string | null;

  @ApiPropertyOptional({ description: 'Table ID', example: 'table_12' })
  tableId?: string | null;

  @ApiPropertyOptional({ description: 'Guest count', example: 2 })
  guestCount?: number | null;

  @ApiProperty({ description: 'Order status', example: 'CONFIRMED' })
  status: string;

  @ApiProperty({ description: 'Payment status', example: 'PENDING' })
  paymentStatus: string;

  @ApiProperty({ description: 'Item subtotal', example: 30 })
  itemSubtotal: number;

  @ApiProperty({ description: 'Service charge amount', example: 0 })
  serviceChargeAmount: number;

  @ApiProperty({ description: 'Delivery charge', example: 0 })
  deliveryCharge: number;

  @ApiProperty({ description: 'Tax amount', example: 4.5 })
  taxAmount: number;

  @ApiProperty({ description: 'Discount amount', example: 0 })
  discountAmount: number;

  @ApiProperty({ description: 'Grand total', example: 34.5 })
  grandTotal: number;

  @ApiProperty({ description: 'Order date', example: '2026-01-23T12:00:00Z' })
  orderDate: Date;

  @ApiProperty({ description: 'Created at', example: '2026-01-23T12:00:00Z' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated at', example: '2026-01-23T12:05:00Z' })
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'Order items',
    type: () => OrderItemResponseDto,
    isArray: true,
  })
  items?: OrderItemResponseDto[];
}

export class SalesOrderListItemDto {
  @ApiProperty({ description: 'Order ID (UUID)', example: 'ord_123' })
  id: string;

  @ApiProperty({ description: 'Order number', example: 'ORD-20260123-001' })
  orderNumber: string;

  @ApiProperty({ description: 'Order status', example: 'CONFIRMED' })
  status: string;

  @ApiProperty({ description: 'Grand total', example: 150 })
  grandTotal: number;
}

export class SalesOrderPaginatedResponseDto extends PaginatedResponseDto<SalesOrderListItemDto> {
  @ApiProperty({
    description: 'Orders for current page',
    type: () => SalesOrderListItemDto,
    isArray: true,
  })
  data: SalesOrderListItemDto[];
}
