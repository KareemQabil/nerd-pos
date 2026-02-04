import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DeliveryZoneResponseDto {
  @ApiProperty({ description: 'Zone ID (UUID)', example: 'zone_1' })
  id: string;

  @ApiProperty({ description: 'Zone name (English)', example: 'Downtown' })
  name: string;

  @ApiProperty({ description: 'Zone name (Arabic)', example: 'Downtown (AR)' })
  nameAr: string;

  @ApiProperty({ description: 'Districts in zone', example: ['Al Olaya', 'Al Malaz'] })
  districts: string[];

  @ApiProperty({ description: 'Delivery fee', example: 10 })
  deliveryFee: number;

  @ApiPropertyOptional({ description: 'Minimum order amount', example: 50 })
  minOrderAmount?: number | null;

  @ApiPropertyOptional({ description: 'Free delivery threshold', example: 200 })
  freeDeliveryThreshold?: number | null;

  @ApiProperty({ description: 'Estimated time (minutes)', example: 30 })
  estimatedTime: number;

  @ApiPropertyOptional({ description: 'Coordinates payload', example: { type: 'Polygon', coordinates: [] } })
  coordinates?: unknown | null;

  @ApiProperty({ description: 'Active flag', example: true })
  isActive: boolean;

  @ApiProperty({ description: 'Created timestamp', example: '2026-01-23T12:00:00Z' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated timestamp', example: '2026-01-24T12:00:00Z' })
  updatedAt: Date;
}

export class DriverResponseDto {
  @ApiProperty({ description: 'Driver ID (UUID)', example: 'drv_789' })
  id: string;

  @ApiProperty({ description: 'User ID (UUID)', example: 'user_123' })
  userId: string;

  @ApiProperty({ description: 'License number', example: 'LIC-123456' })
  licenseNumber: string;

  @ApiProperty({ description: 'Vehicle type', example: 'CAR' })
  vehicleType: string;

  @ApiProperty({ description: 'Vehicle plate', example: 'ABC-1234' })
  vehiclePlate: string;

  @ApiProperty({ description: 'Driver phone', example: '+966501234567' })
  phone: string;

  @ApiProperty({ description: 'Driver status', example: 'AVAILABLE' })
  status: string;

  @ApiPropertyOptional({ description: 'Latitude', example: 24.7136 })
  latitude?: number | null;

  @ApiPropertyOptional({ description: 'Longitude', example: 46.6753 })
  longitude?: number | null;

  @ApiPropertyOptional({ description: 'Last location update', example: '2026-01-23T12:00:00Z' })
  lastLocationUpdate?: Date | null;

  @ApiProperty({ description: 'Total deliveries', example: 120 })
  totalDeliveries: number;

  @ApiPropertyOptional({ description: 'Driver rating', example: 4.8 })
  rating?: number | null;

  @ApiProperty({ description: 'Active flag', example: true })
  isActive: boolean;

  @ApiProperty({ description: 'Created timestamp', example: '2026-01-23T12:00:00Z' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated timestamp', example: '2026-01-24T12:00:00Z' })
  updatedAt: Date;
}

export class DeliveryResponseDto {
  @ApiProperty({ description: 'Delivery ID (UUID)', example: 'del_123' })
  id: string;

  @ApiProperty({ description: 'Order ID', example: 'ord_456' })
  orderId: string;

  @ApiPropertyOptional({ description: 'Address ID', example: 'addr_123' })
  addressId?: string | null;

  @ApiPropertyOptional({ description: 'Zone ID', example: 'zone_1' })
  zoneId?: string | null;

  @ApiPropertyOptional({ description: 'Driver ID', example: 'drv_789' })
  driverId?: string | null;

  @ApiProperty({ description: 'Delivery fee', example: 15 })
  deliveryFee: number;

  @ApiPropertyOptional({ description: 'Estimated time (minutes)', example: 25 })
  estimatedTime?: number | null;

  @ApiPropertyOptional({ description: 'Scheduled for', example: '2026-01-23T18:00:00Z' })
  scheduledFor?: Date | null;

  @ApiPropertyOptional({ description: 'Dispatched at', example: '2026-01-23T18:05:00Z' })
  dispatchedAt?: Date | null;

  @ApiPropertyOptional({ description: 'Picked up at', example: '2026-01-23T18:10:00Z' })
  pickedUpAt?: Date | null;

  @ApiPropertyOptional({ description: 'Delivered at', example: '2026-01-23T18:40:00Z' })
  deliveredAt?: Date | null;

  @ApiProperty({ description: 'Delivery status', example: 'OUT_FOR_DELIVERY' })
  status: string;

  @ApiPropertyOptional({ description: 'Estimated arrival', example: '2026-01-23T18:30:00Z' })
  estimatedArrival?: Date | null;

  @ApiPropertyOptional({ description: 'Tracking notes', example: 'Driver en route' })
  trackingNotes?: string | null;

  @ApiPropertyOptional({ description: 'Instructions', example: 'Leave at reception' })
  instructions?: string | null;

  @ApiPropertyOptional({ description: 'Customer rating', example: 5 })
  customerRating?: number | null;

  @ApiPropertyOptional({ description: 'Customer feedback', example: 'Fast delivery' })
  customerFeedback?: string | null;

  @ApiProperty({ description: 'Created timestamp', example: '2026-01-23T12:00:00Z' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated timestamp', example: '2026-01-23T12:30:00Z' })
  updatedAt: Date;
}
