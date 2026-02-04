import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginatedResponseDto } from '../../../common/dto';

export class DiscountResponseDto {
  @ApiProperty({ description: 'Discount ID (UUID)', example: 'disc_123' })
  id: string;

  @ApiProperty({ description: 'Discount code', example: 'SUMMER2026' })
  code: string;

  @ApiProperty({ description: 'Discount name (English)', example: 'Summer Sale' })
  name: string;

  @ApiProperty({ description: 'Discount name (Arabic)', example: 'Summer Sale (AR)' })
  nameAr: string;

  @ApiPropertyOptional({ description: 'Discount description', example: 'Summer Sale 10% Off' })
  description?: string | null;

  @ApiProperty({ description: 'Discount type', example: 'PERCENTAGE' })
  type: string;

  @ApiProperty({ description: 'Discount value', example: 10 })
  value: number;

  @ApiPropertyOptional({ description: 'Minimum order amount', example: 100 })
  minOrderAmount?: number | null;

  @ApiPropertyOptional({ description: 'Maximum discount amount', example: 50 })
  maxDiscount?: number | null;

  @ApiProperty({ description: 'Applicability scope', example: 'ORDER' })
  applicableOn: string;

  @ApiPropertyOptional({ description: 'Category IDs', example: ['cat_1'] })
  categoryIds?: string[];

  @ApiPropertyOptional({ description: 'Product IDs', example: ['prod_1'] })
  productIds?: string[];

  @ApiPropertyOptional({ description: 'Start date', example: '2026-06-01' })
  startDate?: Date | null;

  @ApiPropertyOptional({ description: 'End date', example: '2026-08-31' })
  endDate?: Date | null;

  @ApiPropertyOptional({ description: 'Start time', example: '18:00' })
  startTime?: string | null;

  @ApiPropertyOptional({ description: 'End time', example: '20:00' })
  endTime?: string | null;

  @ApiPropertyOptional({ description: 'Days of week (0=Sun)', example: [1, 2, 3, 4, 5] })
  daysOfWeek?: number[];

  @ApiProperty({ description: 'Corporate-only flag', example: false })
  isCorporate: boolean;

  @ApiPropertyOptional({ description: 'Eligible corporate IDs', example: ['cust_1'] })
  corporateIds?: string[];

  @ApiProperty({ description: 'Requires approval', example: false })
  requiresApproval: boolean;

  @ApiPropertyOptional({ description: 'Approval threshold', example: 200 })
  approvalThreshold?: number | null;

  @ApiPropertyOptional({ description: 'Maximum total uses', example: 1000 })
  maxUses?: number | null;

  @ApiProperty({ description: 'Used count', example: 45 })
  usedCount: number;

  @ApiPropertyOptional({ description: 'Maximum uses per customer', example: 5 })
  maxUsesPerCustomer?: number | null;

  @ApiProperty({ description: 'Active flag', example: true })
  isActive: boolean;

  @ApiProperty({ description: 'Created timestamp', example: '2026-01-23T12:00:00Z' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated timestamp', example: '2026-01-24T12:00:00Z' })
  updatedAt: Date;

  @ApiProperty({ description: 'Created by user ID', example: 'user_123' })
  createdBy: string;
}

export class DiscountValidationResponseDto {
  @ApiProperty({ description: 'Whether discount is valid', example: true })
  valid: boolean;

  @ApiProperty({ description: 'Discount amount', example: 15.5 })
  amount: number;

  @ApiProperty({ description: 'Requires approval', example: false })
  requiresApproval: boolean;

  @ApiPropertyOptional({ description: 'Validation message', example: 'Discount valid' })
  message?: string;
}

export class DiscountUsageResponseDto {
  @ApiProperty({ description: 'Usage ID (UUID)', example: 'usage_123' })
  id: string;

  @ApiProperty({ description: 'Discount ID', example: 'disc_123' })
  discountId: string;

  @ApiProperty({ description: 'Order ID', example: 'ord_123' })
  orderId: string;

  @ApiPropertyOptional({ description: 'Customer ID', example: 'cust_123' })
  customerId?: string | null;

  @ApiProperty({ description: 'Discount amount applied', example: 15.5 })
  discountAmount: number;

  @ApiProperty({ description: 'Order total', example: 155 })
  orderTotal: number;

  @ApiPropertyOptional({ description: 'Approved by user ID', example: 'user_456' })
  approvedBy?: string | null;

  @ApiPropertyOptional({ description: 'Approved at timestamp', example: '2026-01-23T12:10:00Z' })
  approvedAt?: Date | null;

  @ApiProperty({ description: 'Applied at timestamp', example: '2026-01-23T12:10:00Z' })
  appliedAt: Date;

  @ApiProperty({ description: 'Applied by user ID', example: 'user_123' })
  appliedBy: string;
}

export class DiscountPaginatedResponseDto extends PaginatedResponseDto<DiscountResponseDto> {
  @ApiProperty({
    description: 'Discounts for current page',
    type: () => DiscountResponseDto,
    isArray: true,
  })
  data: DiscountResponseDto[];
}
