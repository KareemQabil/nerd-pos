// Delivery DTOs
import {
  IsString,
  IsNumber,
  IsOptional,
  IsUUID,
  IsIn,
  IsDate,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDeliveryZoneDto {
  @ApiProperty({ description: 'Zone name (English)', example: 'Al Olaya District' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Zone name (Arabic)', example: 'حي العليا' })
  @IsString()
  nameAr: string;

  @ApiProperty({ description: 'District names covered', example: ['Al Olaya', 'King Fahd'] })
  @IsArray()
  @IsString({ each: true })
  districts: string[];

  @ApiProperty({ description: 'Delivery fee (SAR)', example: 15.0 })
  @IsNumber()
  deliveryFee: number;

  @ApiPropertyOptional({ description: 'Min order for delivery (SAR)', example: 50.0 })
  @IsOptional()
  @IsNumber()
  minOrderAmount?: number;

  @ApiPropertyOptional({ description: 'Free delivery threshold (SAR)', example: 150.0 })
  @IsOptional()
  @IsNumber()
  freeDeliveryThreshold?: number;

  @ApiProperty({ description: 'Estimated delivery time (minutes)', example: 30 })
  @IsNumber()
  estimatedTime: number;
}

export class UpdateDeliveryZoneDto extends PartialType(CreateDeliveryZoneDto) { }

export class CreateDriverDto {
  @ApiProperty({ description: 'User UUID', example: 'u23e4567-e89b-12d3-a456-426614174020' })
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'Driver license number', example: 'LIC-123456' })
  @IsString()
  licenseNumber: string;

  @ApiProperty({ description: 'Vehicle type', enum: ['BIKE', 'SCOOTER', 'CAR'], example: 'BIKE' })
  @IsIn(['BIKE', 'SCOOTER', 'CAR'])
  vehicleType: 'BIKE' | 'SCOOTER' | 'CAR';

  @ApiProperty({ description: 'Vehicle plate number', example: 'ABC-1234' })
  @IsString()
  vehiclePlate: string;

  @ApiProperty({ description: 'Driver phone', example: '+966501234567' })
  @IsString()
  phone: string;
}

export class CreateDeliveryDto {
  @ApiProperty({ description: 'Order UUID', example: 'o23e4567-e89b-12d3-a456-426614174023' })
  @IsUUID()
  orderId: string;

  @ApiProperty({ description: 'Customer address UUID', example: 'd23e4567-e89b-12d3-a456-426614174014' })
  @IsUUID()
  addressId: string;

  @ApiProperty({ description: 'Order total (SAR)', example: 125.50 })
  @IsNumber()
  orderTotal: number;

  @ApiPropertyOptional({ description: 'Scheduled delivery time', example: '2024-01-20T14:00:00Z' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  scheduledFor?: Date;
}

export class AssignDriverDto {
  @ApiProperty({ description: 'Driver UUID', example: 'dr23e4567-e89b-12d3-a456-426614174031' })
  @IsUUID()
  driverId: string;
}

export class UpdateDeliveryStatusDto {
  @ApiProperty({
    description: 'Delivery status',
    enum: ['PENDING', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'],
    example: 'PICKED_UP',
  })
  @IsIn(['PENDING', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'])
  status: string;
}

export class UpdateDriverLocationDto {
  @ApiProperty({ description: 'Driver latitude', example: 24.7136 })
  @IsNumber()
  latitude: number;

  @ApiProperty({ description: 'Driver longitude', example: 46.6753 })
  @IsNumber()
  longitude: number;
}

// ==================== RESPONSE DTOs ====================

export * from './delivery-response.dto';
