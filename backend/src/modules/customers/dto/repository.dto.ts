import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCustomerAddressData {
  @ApiProperty({
    description: 'Customer UUID',
    example: 'c23e4567-e89b-12d3-a456-426614174011',
  })
  customerId: string;

  @ApiProperty({ description: 'Address label', example: 'Home' })
  label: string;

  @ApiProperty({ description: 'Street address', example: 'King Fahd Road' })
  street: string;

  @ApiPropertyOptional({
    description: 'Building name/number',
    example: 'Tower 5',
  })
  building?: string;

  @ApiPropertyOptional({ description: 'Floor number', example: '12' })
  floor?: string;

  @ApiPropertyOptional({ description: 'Apartment number', example: '1205' })
  apartment?: string;

  @ApiProperty({ description: 'City name', example: 'Riyadh' })
  city: string;

  @ApiProperty({ description: 'District/Neighborhood', example: 'Al Olaya' })
  district: string;

  @ApiPropertyOptional({ description: 'Rating score (0-5)', example: 4.5 })
  rating?: number;

  @ApiPropertyOptional({ description: 'GPS latitude', example: 24.7136 })
  latitude?: number;

  @ApiPropertyOptional({ description: 'GPS longitude', example: 46.6753 })
  longitude?: number;

  @ApiPropertyOptional({ description: 'Region/Province', example: 'Riyadh' })
  region?: string;

  @ApiPropertyOptional({ description: 'Postal code', example: '12345' })
  postalCode?: string;

  @ApiPropertyOptional({
    description: 'Delivery instructions',
    example: 'Ring bell twice',
  })
  instructions?: string;

  @ApiPropertyOptional({
    description: 'Mark as default address',
    example: true,
  })
  isDefault?: boolean;
}

export class CreateLoyaltyTierData {
  @ApiProperty({ description: 'Tier name (English)', example: 'Gold Member' })
  name: string;

  @ApiProperty({ description: 'Tier name (Arabic)', example: '??? ????' })
  nameAr: string;

  @ApiProperty({ description: 'Minimum total spent (SAR)', example: 5000 })
  minSpent: number;

  @ApiProperty({ description: 'Minimum number of orders', example: 50 })
  minOrders: number;

  @ApiProperty({ description: 'Points multiplier', example: 1.5 })
  pointsMultiplier: number;

  @ApiProperty({ description: 'Discount percentage', example: 10 })
  discountPercent: number;

  @ApiProperty({ description: 'Display color (hex)', example: '#FFD700' })
  color: string;

  @ApiPropertyOptional({ description: 'Icon name/URL', example: 'crown' })
  icon?: string;

  @ApiProperty({ description: 'Display order', example: 2 })
  displayOrder: number;

  @ApiPropertyOptional({
    description: 'Whether the tier is active',
    example: true,
  })
  isActive?: boolean;
}
