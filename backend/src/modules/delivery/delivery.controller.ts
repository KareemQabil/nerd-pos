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
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
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

@ApiTags('Delivery')
@ApiBearerAuth('JWT')
@ApiUnauthorizedResponse({ description: 'Not authenticated' })
@ApiForbiddenResponse({ description: 'Missing required permissions' })
@Controller('delivery')
export class DeliveryController {
  constructor(private readonly service: DeliveryService) { }

  @Get('active')
  @Permissions(PERMISSIONS.DELIVERY_VIEW) // Cashier+
  @ApiOperation({ summary: 'Get active deliveries', description: 'Returns deliveries in progress' })
  @ApiQuery({ name: 'driverId', required: false, description: 'Filter by driver UUID' })
  @ApiResponse({ status: 200, description: 'Active deliveries retrieved' })
  async getActive(@Query('driverId') driverId?: string) {
    return this.service.getActiveDeliveries(driverId);
  }

  @Post()
  @Permissions(PERMISSIONS.DELIVERY_CREATE) // Cashier+
  @ApiOperation({ summary: 'Create delivery', description: 'Creates a new delivery order' })
  @ApiResponse({ status: 201, description: 'Delivery created' })
  @ApiBadRequestResponse({ description: 'Validation error or district not in delivery zone' })
  async create(@Body() dto: CreateDeliveryDto & { district: string }) {
    return this.service.createDelivery(dto, dto.district);
  }

  @Post(':id/assign')
  @Permissions(PERMISSIONS.DELIVERY_ASSIGN) // 🔒 Manager+
  @ApiOperation({ summary: 'Assign driver', description: 'Assigns a driver to delivery. Manager+ required.' })
  @ApiParam({ name: 'id', description: 'Delivery UUID' })
  @ApiResponse({ status: 200, description: 'Driver assigned' })
  @ApiNotFoundResponse({ description: 'Delivery or driver not found' })
  async assign(@Param('id') id: string, @Body() dto: AssignDriverDto) {
    return this.service.assignDriver(id, dto.driverId);
  }

  @Put(':id/status')
  @Permissions(PERMISSIONS.DELIVERY_UPDATE) // Cashier+
  @ApiOperation({ summary: 'Update delivery status', description: 'Updates delivery status (PICKED_UP, DELIVERED, etc.)' })
  @ApiParam({ name: 'id', description: 'Delivery UUID' })
  @ApiResponse({ status: 200, description: 'Delivery status updated' })
  @ApiNotFoundResponse({ description: 'Delivery not found' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateDeliveryStatusDto & { driverId?: string },
  ) {
    return this.service.updateStatus(id, dto.status, dto.driverId);
  }

  // Zones
  @Get('zones')
  @Permissions(PERMISSIONS.DELIVERY_VIEW) // Cashier+
  @ApiOperation({ summary: 'Get delivery zones', description: 'Returns all delivery zones with fees' })
  @ApiResponse({ status: 200, description: 'Delivery zones retrieved' })
  async getZones() {
    return this.service.getAllZones();
  }

  @Post('zones')
  @Permissions(PERMISSIONS.DELIVERY_ZONE_MANAGE) // 🔒 Admin only
  @ApiOperation({ summary: 'Create delivery zone', description: 'Creates a new delivery zone. Admin only.' })
  @ApiResponse({ status: 201, description: 'Delivery zone created' })
  @ApiBadRequestResponse({ description: 'Validation error or duplicate zone name' })
  async createZone(@Body() dto: CreateDeliveryZoneDto) {
    return this.service.createZone(dto);
  }

  // Drivers
  @Get('drivers')
  @Permissions(PERMISSIONS.DELIVERY_VIEW) // Cashier+
  @ApiOperation({ summary: 'Get all drivers', description: 'Returns all delivery drivers' })
  @ApiResponse({ status: 200, description: 'Drivers retrieved' })
  async getDrivers() {
    return this.service.getAllDrivers();
  }

  @Get('drivers/available')
  @Permissions(PERMISSIONS.DELIVERY_VIEW) // Cashier+
  @ApiOperation({ summary: 'Get available drivers', description: 'Returns drivers not currently on delivery' })
  @ApiResponse({ status: 200, description: 'Available drivers retrieved' })
  async getAvailableDrivers() {
    return this.service.getAvailableDrivers();
  }

  @Post('drivers')
  @Permissions(PERMISSIONS.DELIVERY_PARTNER_MANAGE) // 🔒 Admin only
  @ApiOperation({ summary: 'Create driver', description: 'Registers a new delivery driver. Admin only.' })
  @ApiResponse({ status: 201, description: 'Driver created' })
  @ApiBadRequestResponse({ description: 'Validation error or phone already registered' })
  async createDriver(@Body() dto: CreateDriverDto) {
    return this.service.createDriver(dto);
  }

  @Put('drivers/:id/location')
  @Permissions(PERMISSIONS.DELIVERY_UPDATE) // Cashier+ (driver location update)
  @ApiOperation({ summary: 'Update driver location', description: 'Updates driver GPS coordinates' })
  @ApiParam({ name: 'id', description: 'Driver UUID' })
  @ApiResponse({ status: 200, description: 'Location updated' })
  @ApiNotFoundResponse({ description: 'Driver not found' })
  async updateLocation(
    @Param('id') id: string,
    @Body() dto: UpdateDriverLocationDto,
  ) {
    return this.service.updateDriverLocation(id, dto.latitude, dto.longitude);
  }
}

