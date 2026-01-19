// Delivery Controller
// Security: Block 2 - All endpoints secured with @Permissions

import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DeliveryService } from './delivery.service';
import {
  CreateDeliveryDto,
  CreateDeliveryZoneDto,
  CreateDriverDto,
  AssignDriverDto,
  UpdateDeliveryStatusDto,
  UpdateDriverLocationDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../../core/constants/permissions';

@Controller('delivery')
export class DeliveryController {
  constructor(private readonly service: DeliveryService) { }

  @Permissions(PERMISSIONS.DELIVERY_VIEW) // Cashier+
  @Get('active')
  async getActive(@Query('driverId') driverId?: string) {
    return this.service.getActiveDeliveries(driverId);
  }

  @Permissions(PERMISSIONS.DELIVERY_CREATE) // Cashier+
  @Post()
  async create(@Body() dto: CreateDeliveryDto & { district: string }) {
    return this.service.createDelivery(dto, dto.district);
  }

  @Permissions(PERMISSIONS.DELIVERY_ASSIGN) // 🔒 Manager+
  @Post(':id/assign')
  async assign(@Param('id') id: string, @Body() dto: AssignDriverDto) {
    return this.service.assignDriver(id, dto.driverId);
  }

  @Permissions(PERMISSIONS.DELIVERY_UPDATE) // Cashier+
  @Put(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateDeliveryStatusDto & { driverId?: string },
  ) {
    return this.service.updateStatus(id, dto.status, dto.driverId);
  }

  // Zones
  @Permissions(PERMISSIONS.DELIVERY_VIEW) // Cashier+
  @Get('zones')
  async getZones() {
    return this.service.getAllZones();
  }

  @Permissions(PERMISSIONS.DELIVERY_ZONE_MANAGE) // 🔒 Admin only
  @Post('zones')
  async createZone(@Body() dto: CreateDeliveryZoneDto) {
    return this.service.createZone(dto);
  }

  // Drivers
  @Permissions(PERMISSIONS.DELIVERY_VIEW) // Cashier+
  @Get('drivers')
  async getDrivers() {
    return this.service.getAllDrivers();
  }

  @Permissions(PERMISSIONS.DELIVERY_VIEW) // Cashier+
  @Get('drivers/available')
  async getAvailableDrivers() {
    return this.service.getAvailableDrivers();
  }

  @Permissions(PERMISSIONS.DELIVERY_PARTNER_MANAGE) // 🔒 Admin only
  @Post('drivers')
  async createDriver(@Body() dto: CreateDriverDto) {
    return this.service.createDriver(dto);
  }

  @Permissions(PERMISSIONS.DELIVERY_UPDATE) // Cashier+ (driver location update)
  @Put('drivers/:id/location')
  async updateLocation(
    @Param('id') id: string,
    @Body() dto: UpdateDriverLocationDto,
  ) {
    return this.service.updateDriverLocation(id, dto.latitude, dto.longitude);
  }
}
