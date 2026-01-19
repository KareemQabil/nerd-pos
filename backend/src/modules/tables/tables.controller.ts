// Tables Controller
// Source: FINAL/BACKEND/12-MODULE-TABLES.md

import { Controller, Get, Post, Put, Body, Param, Query } from '@nestjs/common';
import { TablesService } from './tables.service';
import {
  CreateFloorDto,
  UpdateFloorDto,
  CreateTableDto,
  UpdateTableDto,
  TransferTableDto,
  CreateReservationDto,
  UpdateReservationStatusDto,
} from './dto';

@Controller('tables')
export class TablesController {
  constructor(private readonly service: TablesService) {}

  // ==================== FLOORS ====================

  @Get('floors')
  async getAllFloors() {
    return this.service.getAllFloors();
  }

  @Get('floors/:id')
  async getFloorWithTables(@Param('id') id: string) {
    return this.service.getFloorWithTables(id);
  }

  @Post('floors')
  async createFloor(@Body() dto: CreateFloorDto) {
    return this.service.createFloor(dto);
  }

  @Put('floors/:id')
  async updateFloor(@Param('id') id: string, @Body() dto: UpdateFloorDto) {
    return this.service.updateFloor(id, dto);
  }

  // ==================== TABLES ====================

  @Post()
  async createTable(@Body() dto: CreateTableDto) {
    return this.service.createTable(dto);
  }

  @Put(':id')
  async updateTable(@Param('id') id: string, @Body() dto: UpdateTableDto) {
    return this.service.updateTable(id, dto);
  }

  @Get('floor/:floorId')
  async getTablesByFloor(@Param('floorId') floorId: string) {
    return this.service.getTablesByFloor(floorId);
  }

  @Get('available')
  async getAvailable(@Query('floorId') floorId?: string) {
    return this.service.getAvailableTables(floorId);
  }

  @Get('occupied')
  async getOccupied(@Query('floorId') floorId?: string) {
    return this.service.getOccupiedTables(floorId);
  }

  @Post(':id/assign')
  async assignOrder(@Param('id') id: string, @Body() dto: { orderId: string }) {
    return this.service.assignOrderToTable(id, dto.orderId);
  }

  @Post(':id/release')
  async release(@Param('id') id: string) {
    return this.service.releaseTable(id);
  }

  @Post(':id/clean')
  async markClean(@Param('id') id: string) {
    return this.service.markTableClean(id);
  }

  @Post('transfer')
  async transfer(@Body() dto: TransferTableDto) {
    return this.service.transferTable(dto);
  }

  @Post(':id/waiter')
  async assignWaiter(
    @Param('id') id: string,
    @Body() dto: { waiterId: string },
  ) {
    return this.service.assignWaiter(id, dto.waiterId);
  }

  // ==================== RESERVATIONS ====================

  @Post('reservations')
  async createReservation(@Body() dto: CreateReservationDto) {
    return this.service.createReservation(dto);
  }

  @Put('reservations/:id/status')
  async updateReservationStatus(
    @Param('id') id: string,
    @Body() dto: UpdateReservationStatusDto,
  ) {
    return this.service.updateReservationStatus(id, dto);
  }

  @Get('reservations/today')
  async getTodayReservations() {
    return this.service.getTodayReservations();
  }

  @Get(':tableId/reservations')
  async getReservationsByTable(
    @Param('tableId') tableId: string,
    @Query('date') date: string,
  ) {
    return this.service.getReservationsByTable(tableId, new Date(date));
  }
}
