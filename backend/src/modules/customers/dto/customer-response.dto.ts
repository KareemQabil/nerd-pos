import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginatedResponseDto } from '../../../common/dto';

export class CustomerResponseDto {
  @ApiProperty({ description: 'Customer ID (UUID)', example: 'c23e4567-e89b-12d3-a456-426614174011' })
  id: string;

  @ApiProperty({ description: 'Customer code', example: 'CUS20260100001' })
  code: string;

  @ApiProperty({ description: 'Customer name (Arabic)', example: 'Ahmed Mohamed (AR)' })
  nameAr: string;

  @ApiProperty({ description: 'Customer name (English)', example: 'Ahmed Mohamed' })
  nameEn: string;

  @ApiPropertyOptional({ description: 'Customer phone number', example: '+966501234567' })
  phone?: string | null;

  @ApiPropertyOptional({ description: 'Customer email', example: 'ahmed@example.com' })
  email?: string | null;

  @ApiPropertyOptional({ description: 'Preferred language', enum: ['en', 'ar'], example: 'ar' })
  preferredLanguage?: 'en' | 'ar';

  @ApiPropertyOptional({ description: 'Internal notes', example: 'VIP customer' })
  notes?: string | null;

  @ApiProperty({ description: 'Loyalty points balance', example: 0 })
  loyaltyPoints: number;

  @ApiProperty({ description: 'Loyalty tier', example: 'BRONZE' })
  loyaltyTier: string;

  @ApiProperty({ description: 'Total amount spent', example: 250.5 })
  totalSpent: number;

  @ApiProperty({ description: 'Number of visits/orders', example: 12 })
  visitsCount: number;

  @ApiPropertyOptional({ description: 'Last visit timestamp', example: '2026-01-23T12:00:00Z' })
  lastVisit?: Date | null;

  @ApiPropertyOptional({ description: 'Custom fields payload', example: { favoriteDrink: 'Latte' } })
  customFields?: Record<string, unknown> | null;

  @ApiProperty({ description: 'Whether the customer is active', example: true })
  isActive: boolean;

  @ApiProperty({ description: 'Created timestamp', example: '2026-01-20T09:15:00Z' })
  createdAt: Date;

  @ApiProperty({ description: 'Last updated timestamp', example: '2026-01-23T12:00:00Z' })
  updatedAt: Date;
}

export class CustomerAddressDto {
  @ApiProperty({ description: 'Address ID (UUID)', example: 'a23e4567-e89b-12d3-a456-426614174012' })
  id: string;

  @ApiProperty({ description: 'Customer ID (UUID)', example: 'c23e4567-e89b-12d3-a456-426614174011' })
  customerId: string;

  @ApiProperty({ description: 'Address label', example: 'Home' })
  label: string;

  @ApiProperty({ description: 'Street address', example: 'King Fahd Road' })
  street: string;

  @ApiPropertyOptional({ description: 'Building name/number', example: 'Tower 5' })
  building?: string | null;

  @ApiPropertyOptional({ description: 'Floor number', example: '12' })
  floor?: string | null;

  @ApiPropertyOptional({ description: 'Apartment number', example: '1205' })
  apartment?: string | null;

  @ApiProperty({ description: 'City name', example: 'Riyadh' })
  city: string;

  @ApiProperty({ description: 'District/Neighborhood', example: 'Al Olaya' })
  district: string;

  @ApiPropertyOptional({ description: 'GPS latitude', example: 24.7136 })
  latitude?: number | null;

  @ApiPropertyOptional({ description: 'GPS longitude', example: 46.6753 })
  longitude?: number | null;

  @ApiPropertyOptional({ description: 'Delivery instructions', example: 'Ring bell twice, leave at door' })
  instructions?: string | null;

  @ApiProperty({ description: 'Whether this is the default address', example: true })
  isDefault: boolean;
}

export class LoyaltyTierResponseDto {
  @ApiProperty({ description: 'Tier ID (UUID)', example: 't23e4567-e89b-12d3-a456-426614174013' })
  id: string;

  @ApiProperty({ description: 'Tier name (English)', example: 'Gold Member' })
  name: string;

  @ApiProperty({ description: 'Tier name (Arabic)', example: 'Gold Member (AR)' })
  nameAr: string;

  @ApiProperty({ description: 'Minimum total spent to reach this tier', example: 5000 })
  minSpent: number;

  @ApiProperty({ description: 'Minimum number of orders to reach this tier', example: 50 })
  minOrders: number;

  @ApiProperty({ description: 'Points multiplier for this tier', example: 1.5 })
  pointsMultiplier: number;

  @ApiProperty({ description: 'Discount percentage for this tier', example: 10 })
  discountPercent: number;

  @ApiProperty({ description: 'Display color (hex)', example: '#FFD700' })
  color: string;

  @ApiPropertyOptional({ description: 'Icon name/URL', example: 'crown' })
  icon?: string | null;

  @ApiProperty({ description: 'Display order', example: 2 })
  displayOrder: number;

  @ApiProperty({ description: 'Whether this tier is active', example: true })
  isActive: boolean;
}

export class CustomerWithTierResponseDto extends CustomerResponseDto {
  @ApiPropertyOptional({ description: 'Expanded tier details', type: () => LoyaltyTierResponseDto })
  tier?: LoyaltyTierResponseDto | null;

  @ApiPropertyOptional({ description: 'Customer addresses', type: () => CustomerAddressDto, isArray: true })
  addresses?: CustomerAddressDto[];
}

export class CustomerPaginatedResponseDto extends PaginatedResponseDto<CustomerResponseDto> {
  @ApiProperty({ description: 'Array of customers for current page', type: () => CustomerResponseDto, isArray: true })
  data: CustomerResponseDto[];
}
