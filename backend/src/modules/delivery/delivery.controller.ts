// Delivery Controller
import { Controller, Get, Post, Put, Body, Param, Query } from '@nestjs/common';
import { DeliveryService } from './delivery.service';
import {
  CreateDeliveryDto,
  CreateDeliveryZoneDto,
  CreateDriverDto,
  AssignDriverDto,
  UpdateDeliveryStatusDto,
  UpdateDriverLocationDto,
} from './dto';

@Controller('delivery')
export class DeliveryController {
  constructor(private readonly service: DeliveryService) {}

  @Get('active')
  async getActive(@Query('driverId') driverId?: string) {
    return this.service.getActiveDeliveries(driverId);
  }

  @Post()
  async create(@Body() dto: CreateDeliveryDto & { district: string }) {
    return this.service.createDelivery(dto, dto.district);
  }

  @Post(':id/assign')
  async assign(@Param('id') id: string, @Body() dto: AssignDriverDto) {
    return this.service.assignDriver(id, dto.driverId);
  }

  @Put(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateDeliveryStatusDto & { driverId?: string },
  ) {
    return this.service.updateStatus(id, dto.status, dto.driverId);
  }

  // Zones
  @Get('zones')
  async getZones() {
    return this.service.getAllZones();
  }

  @Post('zones')
  async createZone(@Body() dto: CreateDeliveryZoneDto) {
    return this.service.createZone(dto);
  }

  // Drivers
  @Get('drivers')
  async getDrivers() {
    return this.service.getAllDrivers();
  }

  @Get('drivers/available')
  async getAvailableDrivers() {
    return this.service.getAvailableDrivers();
  }

  @Post('drivers')
  async createDriver(@Body() dto: CreateDriverDto) {
    return this.service.createDriver(dto);
  }

  @Put('drivers/:id/location')
  async updateLocation(
    @Param('id') id: string,
    @Body() dto: UpdateDriverLocationDto,
  ) {
    return this.service.updateDriverLocation(id, dto.latitude, dto.longitude);
  }
}
