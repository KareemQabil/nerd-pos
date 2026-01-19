// Kitchen Controller
// Source: FINAL/BACKEND/08-MODULE-KITCHEN.md
// Security: Block 2 - All endpoints secured with @Permissions

import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { KitchenService } from './kitchen.service';
import { CreateKitchenStationDto, UpdateKitchenStationDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../../core/constants/permissions';

@Controller('kitchen')
export class KitchenController {
  constructor(private readonly service: KitchenService) { }

  // ==================== TICKETS ====================

  @Permissions(PERMISSIONS.KITCHEN_VIEW) // Kitchen staff
  @Get('stations/:stationId/tickets')
  async getActiveTickets(@Param('stationId') stationId: string) {
    return this.service.getActiveTickets(stationId);
  }

  @Permissions(PERMISSIONS.KITCHEN_VIEW) // Kitchen staff
  @Get('tickets/:id')
  async getTicket(@Param('id') id: string) {
    return this.service.getTicketWithItems(id);
  }

  @Permissions(PERMISSIONS.KITCHEN_VIEW) // Kitchen staff
  @Get('orders/:orderId/tickets')
  async getTicketsByOrder(@Param('orderId') orderId: string) {
    return this.service.getTicketsByOrder(orderId);
  }

  @Permissions(PERMISSIONS.KITCHEN_UPDATE) // Kitchen staff
  @Post('tickets/:id/start')
  async startPreparation(@Param('id') id: string) {
    return this.service.startPreparation(id);
  }

  @Permissions(PERMISSIONS.KITCHEN_UPDATE) // Kitchen staff
  @Post('tickets/:id/ready')
  async markReady(@Param('id') id: string) {
    return this.service.markTicketReady(id);
  }

  @Permissions(PERMISSIONS.KITCHEN_UPDATE) // Kitchen staff
  @Post('tickets/:id/complete')
  async completeTicket(@Param('id') id: string) {
    return this.service.completeTicket(id);
  }

  @Permissions(PERMISSIONS.KITCHEN_UPDATE) // Kitchen staff
  @Post('tickets/:ticketId/items/:itemId/bump')
  async bumpItem(
    @Param('ticketId') ticketId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.service.bumpItem(ticketId, itemId);
  }

  // ==================== STATIONS ====================

  @Permissions(PERMISSIONS.KITCHEN_VIEW) // Kitchen staff
  @Get('stations')
  async getAllStations() {
    return this.service.getAllStations();
  }

  @Permissions(PERMISSIONS.KITCHEN_STATION_CREATE) // 🔒 Admin only
  @Post('stations')
  async createStation(@Body() dto: CreateKitchenStationDto) {
    return this.service.createStation(dto);
  }

  @Permissions(PERMISSIONS.KITCHEN_STATION_UPDATE) // Manager+
  @Put('stations/:id')
  async updateStation(
    @Param('id') id: string,
    @Body() dto: UpdateKitchenStationDto,
  ) {
    return this.service.updateStation(id, dto);
  }
}
