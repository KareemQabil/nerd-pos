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

export class CreateDeliveryZoneDto {
  @IsString() name: string;
  @IsString() nameAr: string;
  @IsArray() @IsString({ each: true }) districts: string[];
  @IsNumber() deliveryFee: number;
  @IsOptional() @IsNumber() minOrderAmount?: number;
  @IsOptional() @IsNumber() freeDeliveryThreshold?: number;
  @IsNumber() estimatedTime: number;
}

export class UpdateDeliveryZoneDto extends PartialType(CreateDeliveryZoneDto) {}

export class CreateDriverDto {
  @IsUUID() userId: string;
  @IsString() licenseNumber: string;
  @IsIn(['BIKE', 'SCOOTER', 'CAR']) vehicleType: 'BIKE' | 'SCOOTER' | 'CAR';
  @IsString() vehiclePlate: string;
  @IsString() phone: string;
}

export class CreateDeliveryDto {
  @IsUUID() orderId: string;
  @IsUUID() addressId: string;
  @IsNumber() orderTotal: number;
  @IsOptional() @IsDate() @Type(() => Date) scheduledFor?: Date;
}

export class AssignDriverDto {
  @IsUUID() driverId: string;
}

export class UpdateDeliveryStatusDto {
  @IsIn([
    'PENDING',
    'ASSIGNED',
    'PICKED_UP',
    'IN_TRANSIT',
    'DELIVERED',
    'CANCELLED',
  ])
  status: string;
}

export class UpdateDriverLocationDto {
  @IsNumber() latitude: number;
  @IsNumber() longitude: number;
}
