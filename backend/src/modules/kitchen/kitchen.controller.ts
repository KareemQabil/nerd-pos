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
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { KitchenService } from './kitchen.service';
import { CreateKitchenStationDto, UpdateKitchenStationDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../../core/constants/permissions';

@ApiTags('Kitchen')
@ApiBearerAuth('JWT')
@ApiUnauthorizedResponse({ description: 'Not authenticated' })
@ApiForbiddenResponse({ description: 'Missing required permissions' })
@Controller('kitchen')
export class KitchenController {
  constructor(private readonly service: KitchenService) { }

  // ==================== TICKETS ====================

  @Get('stations/:stationId/tickets')
  @Permissions(PERMISSIONS.KITCHEN_VIEW) // Kitchen staff
  @ApiOperation({ summary: 'Get active tickets', description: 'Returns active kitchen tickets for station' })
  @ApiParam({ name: 'stationId', description: 'Kitchen Station UUID' })
  @ApiResponse({ status: 200, description: 'Active tickets retrieved' })
  async getActiveTickets(@Param('stationId') stationId: string) {
    return this.service.getActiveTickets(stationId);
  }

  @Get('tickets/:id')
  @Permissions(PERMISSIONS.KITCHEN_VIEW) // Kitchen staff
  @ApiOperation({ summary: 'Get ticket by ID', description: 'Returns ticket with items' })
  @ApiParam({ name: 'id', description: 'Kitchen Ticket UUID' })
  @ApiResponse({ status: 200, description: 'Ticket found' })
  @ApiNotFoundResponse({ description: 'Ticket not found' })
  async getTicket(@Param('id') id: string) {
    return this.service.getTicketWithItems(id);
  }

  @Get('orders/:orderId/tickets')
  @Permissions(PERMISSIONS.KITCHEN_VIEW) // Kitchen staff
  @ApiOperation({ summary: 'Get tickets by order', description: 'Returns all kitchen tickets for order' })
  @ApiParam({ name: 'orderId', description: 'Order UUID' })
  @ApiResponse({ status: 200, description: 'Order tickets retrieved' })
  async getTicketsByOrder(@Param('orderId') orderId: string) {
    return this.service.getTicketsByOrder(orderId);
  }

  @Post('tickets/:id/start')
  @Permissions(PERMISSIONS.KITCHEN_UPDATE) // Kitchen staff
  @ApiOperation({ summary: 'Start preparation', description: 'Marks ticket as IN_PROGRESS' })
  @ApiParam({ name: 'id', description: 'Kitchen Ticket UUID' })
  @ApiResponse({ status: 200, description: 'Preparation started' })
  @ApiNotFoundResponse({ description: 'Ticket not found' })
  @ApiBadRequestResponse({ description: 'Ticket already started or completed' })
  async startPreparation(@Param('id') id: string) {
    return this.service.startPreparation(id);
  }

  @Post('tickets/:id/ready')
  @Permissions(PERMISSIONS.KITCHEN_UPDATE) // Kitchen staff
  @ApiOperation({ summary: 'Mark ticket ready', description: 'Marks ticket as READY for serving' })
  @ApiParam({ name: 'id', description: 'Kitchen Ticket UUID' })
  @ApiResponse({ status: 200, description: 'Ticket marked ready' })
  @ApiNotFoundResponse({ description: 'Ticket not found' })
  async markReady(@Param('id') id: string) {
    return this.service.markTicketReady(id);
  }

  @Post('tickets/:id/complete')
  @Permissions(PERMISSIONS.KITCHEN_UPDATE) // Kitchen staff
  @ApiOperation({ summary: 'Complete ticket', description: 'Marks ticket as COMPLETED' })
  @ApiParam({ name: 'id', description: 'Kitchen Ticket UUID' })
  @ApiResponse({ status: 200, description: 'Ticket completed' })
  @ApiNotFoundResponse({ description: 'Ticket not found' })
  async completeTicket(@Param('id') id: string) {
    return this.service.completeTicket(id);
  }

  @Post('tickets/:ticketId/items/:itemId/bump')
  @Permissions(PERMISSIONS.KITCHEN_UPDATE) // Kitchen staff
  @ApiOperation({ summary: 'Bump item', description: 'Marks individual ticket item as completed' })
  @ApiParam({ name: 'ticketId', description: 'Kitchen Ticket UUID' })
  @ApiParam({ name: 'itemId', description: 'Ticket Item UUID' })
  @ApiResponse({ status: 200, description: 'Item bumped' })
  @ApiNotFoundResponse({ description: 'Ticket or item not found' })
  async bumpItem(
    @Param('ticketId') ticketId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.service.bumpItem(ticketId, itemId);
  }

  // ==================== STATIONS ====================

  @Get('stations')
  @Permissions(PERMISSIONS.KITCHEN_VIEW) // Kitchen staff
  @ApiOperation({ summary: 'Get all stations', description: 'Returns all kitchen stations' })
  @ApiResponse({ status: 200, description: 'Stations retrieved' })
  async getAllStations() {
    return this.service.getAllStations();
  }

  @Post('stations')
  @Permissions(PERMISSIONS.KITCHEN_STATION_CREATE) // 🔒 Admin only
  @ApiOperation({ summary: 'Create station', description: 'Creates new kitchen station. Admin only.' })
  @ApiResponse({ status: 201, description: 'Station created' })
  @ApiBadRequestResponse({ description: 'Validation error or duplicate station name' })
  async createStation(@Body() dto: CreateKitchenStationDto) {
    return this.service.createStation(dto);
  }

  @Put('stations/:id')
  @Permissions(PERMISSIONS.KITCHEN_STATION_UPDATE) // Manager+
  @ApiOperation({ summary: 'Update station', description: 'Updates kitchen station. Manager+ required.' })
  @ApiParam({ name: 'id', description: 'Station UUID' })
  @ApiResponse({ status: 200, description: 'Station updated' })
  @ApiNotFoundResponse({ description: 'Station not found' })
  async updateStation(
    @Param('id') id: string,
    @Body() dto: UpdateKitchenStationDto,
  ) {
    return this.service.updateStation(id, dto);
  }
}

