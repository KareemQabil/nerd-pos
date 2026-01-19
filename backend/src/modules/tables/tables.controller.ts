// Tables Controller
// Source: FINAL/BACKEND/12-MODULE-TABLES.md
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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../../core/constants/permissions';

@Controller('tables')
export class TablesController {
  constructor(private readonly service: TablesService) { }

  // ==================== FLOORS ====================

  @Permissions(PERMISSIONS.TABLES_VIEW) // Cashier+
  @Get('floors')
  async getAllFloors() {
    return this.service.getAllFloors();
  }

  @Permissions(PERMISSIONS.TABLES_VIEW) // Cashier+
  @Get('floors/:id')
  async getFloorWithTables(@Param('id') id: string) {
    return this.service.getFloorWithTables(id);
  }

  @Permissions(PERMISSIONS.TABLES_FLOOR_MANAGE) // 🔒 Admin only
  @Post('floors')
  async createFloor(@Body() dto: CreateFloorDto) {
    return this.service.createFloor(dto);
  }

  @Permissions(PERMISSIONS.TABLES_FLOOR_MANAGE) // 🔒 Admin only
  @Put('floors/:id')
  async updateFloor(@Param('id') id: string, @Body() dto: UpdateFloorDto) {
    return this.service.updateFloor(id, dto);
  }

  // ==================== TABLES ====================

  @Permissions(PERMISSIONS.TABLES_CREATE) // Manager+
  @Post()
  async createTable(@Body() dto: CreateTableDto) {
    return this.service.createTable(dto);
  }

  @Permissions(PERMISSIONS.TABLES_UPDATE) // Manager+
  @Put(':id')
  async updateTable(@Param('id') id: string, @Body() dto: UpdateTableDto) {
    return this.service.updateTable(id, dto);
  }

  @Permissions(PERMISSIONS.TABLES_VIEW) // Cashier+
  @Get('floor/:floorId')
  async getTablesByFloor(@Param('floorId') floorId: string) {
    return this.service.getTablesByFloor(floorId);
  }

  @Permissions(PERMISSIONS.TABLES_VIEW) // Cashier+
  @Get('available')
  async getAvailable(@Query('floorId') floorId?: string) {
    return this.service.getAvailableTables(floorId);
  }

  @Permissions(PERMISSIONS.TABLES_VIEW) // Cashier+
  @Get('occupied')
  async getOccupied(@Query('floorId') floorId?: string) {
    return this.service.getOccupiedTables(floorId);
  }

  @Permissions(PERMISSIONS.TABLES_ASSIGN) // Cashier+
  @Post(':id/assign')
  async assignOrder(@Param('id') id: string, @Body() dto: { orderId: string }) {
    return this.service.assignOrderToTable(id, dto.orderId);
  }

  @Permissions(PERMISSIONS.TABLES_ASSIGN) // Cashier+
  @Post(':id/release')
  async release(@Param('id') id: string) {
    return this.service.releaseTable(id);
  }

  @Permissions(PERMISSIONS.TABLES_CLEAN) // Cashier+
  @Post(':id/clean')
  async markClean(@Param('id') id: string) {
    return this.service.markTableClean(id);
  }

  @Permissions(PERMISSIONS.TABLES_TRANSFER) // 🔒 Manager+
  @Post('transfer')
  async transfer(@Body() dto: TransferTableDto) {
    return this.service.transferTable(dto);
  }

  @Permissions(PERMISSIONS.TABLES_ASSIGN) // Cashier+
  @Post(':id/waiter')
  async assignWaiter(
    @Param('id') id: string,
    @Body() dto: { waiterId: string },
  ) {
    return this.service.assignWaiter(id, dto.waiterId);
  }

  // ==================== RESERVATIONS ====================

  @Permissions(PERMISSIONS.TABLES_RESERVATION_MANAGE) // Manager+
  @Post('reservations')
  async createReservation(@Body() dto: CreateReservationDto) {
    return this.service.createReservation(dto);
  }

  @Permissions(PERMISSIONS.TABLES_RESERVATION_MANAGE) // Manager+
  @Put('reservations/:id/status')
  async updateReservationStatus(
    @Param('id') id: string,
    @Body() dto: UpdateReservationStatusDto,
  ) {
    return this.service.updateReservationStatus(id, dto);
  }

  @Permissions(PERMISSIONS.TABLES_RESERVATION_VIEW) // Cashier+
  @Get('reservations/today')
  async getTodayReservations() {
    return this.service.getTodayReservations();
  }

  @Permissions(PERMISSIONS.TABLES_RESERVATION_VIEW) // Cashier+
  @Get(':tableId/reservations')
  async getReservationsByTable(
    @Param('tableId') tableId: string,
    @Query('date') date: string,
  ) {
    return this.service.getReservationsByTable(tableId, new Date(date));
  }
}
