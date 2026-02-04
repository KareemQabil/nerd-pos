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
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { TablesService } from './tables.service';
import {
  CreateFloorDto,
  UpdateFloorDto,
  CreateTableDto,
  UpdateTableDto,
  TransferTableDto,
  CreateReservationDto,
  UpdateReservationStatusDto,
  FloorResponseDto,
  FloorWithTablesResponseDto,
  TableResponseDto,
  TableReservationResponseDto,
} from './dto';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../../core/constants/permissions';
import { ApiErrorResponse, ApiResultResponse } from '../../common/decorators';

@ApiTags('Tables')
@ApiBearerAuth('JWT')
@ApiErrorResponse({ status: 401, description: 'Not authenticated' })
@ApiErrorResponse({ status: 403, description: 'Missing required permissions' })
@Controller('tables')
export class TablesController {
  constructor(private readonly service: TablesService) { }

  // ==================== FLOORS ====================

  @Get('floors')
  @Permissions(PERMISSIONS.TABLES_VIEW) // Cashier+
  @ApiOperation({ summary: 'Get all floors', description: 'Returns all floor/section layouts' })
  @ApiResultResponse({
    status: 200,
    description: 'Floors retrieved',
    type: FloorResponseDto,
    isArray: true,
  })
  async getAllFloors() {
    return this.service.getAllFloors();
  }

  @Get('floors/:id')
  @Permissions(PERMISSIONS.TABLES_VIEW) // Cashier+
  @ApiOperation({ summary: 'Get floor with tables', description: 'Returns floor layout with all tables' })
  @ApiParam({ name: 'id', description: 'Floor UUID' })
  @ApiResultResponse({
    status: 200,
    description: 'Floor with tables',
    type: FloorWithTablesResponseDto,
  })
  @ApiErrorResponse({ status: 404, description: 'Floor not found' })
  async getFloorWithTables(@Param('id') id: string) {
    return this.service.getFloorWithTables(id);
  }

  @Post('floors')
  @Permissions(PERMISSIONS.TABLES_FLOOR_MANAGE) // 🔒 Admin only
  @ApiOperation({ summary: 'Create floor', description: 'Creates new floor/section. Admin only.' })
  @ApiResultResponse({ status: 201, description: 'Floor created', type: FloorResponseDto })
  @ApiErrorResponse({ status: 400, description: 'Validation error or duplicate floor name' })
  async createFloor(@Body() dto: CreateFloorDto) {
    return this.service.createFloor(dto);
  }

  @Put('floors/:id')
  @Permissions(PERMISSIONS.TABLES_FLOOR_MANAGE) // 🔒 Admin only
  @ApiOperation({ summary: 'Update floor', description: 'Updates floor details. Admin only.' })
  @ApiParam({ name: 'id', description: 'Floor UUID' })
  @ApiResultResponse({ status: 200, description: 'Floor updated', type: FloorResponseDto })
  @ApiErrorResponse({ status: 404, description: 'Floor not found' })
  async updateFloor(@Param('id') id: string, @Body() dto: UpdateFloorDto) {
    return this.service.updateFloor(id, dto);
  }

  // ==================== TABLES ====================

  @Post()
  @Permissions(PERMISSIONS.TABLES_CREATE) // Manager+
  @ApiOperation({ summary: 'Create table', description: 'Creates new table. Manager+ required.' })
  @ApiResultResponse({ status: 201, description: 'Table created', type: TableResponseDto })
  @ApiErrorResponse({ status: 400, description: 'Validation error or duplicate table number' })
  async createTable(@Body() dto: CreateTableDto) {
    return this.service.createTable(dto);
  }

  @Put(':id')
  @Permissions(PERMISSIONS.TABLES_UPDATE) // Manager+
  @ApiOperation({ summary: 'Update table', description: 'Updates table details. Manager+ required.' })
  @ApiParam({ name: 'id', description: 'Table UUID' })
  @ApiResultResponse({ status: 200, description: 'Table updated', type: TableResponseDto })
  @ApiErrorResponse({ status: 404, description: 'Table not found' })
  async updateTable(@Param('id') id: string, @Body() dto: UpdateTableDto) {
    return this.service.updateTable(id, dto);
  }

  @Get('floor/:floorId')
  @Permissions(PERMISSIONS.TABLES_VIEW) // Cashier+
  @ApiOperation({ summary: 'Get tables by floor', description: 'Returns all tables on specified floor' })
  @ApiParam({ name: 'floorId', description: 'Floor UUID' })
  @ApiResultResponse({
    status: 200,
    description: 'Tables retrieved',
    type: TableResponseDto,
    isArray: true,
  })
  async getTablesByFloor(@Param('floorId') floorId: string) {
    return this.service.getTablesByFloor(floorId);
  }

  @Get('available')
  @Permissions(PERMISSIONS.TABLES_VIEW) // Cashier+
  @ApiOperation({ summary: 'Get available tables', description: 'Returns tables with AVAILABLE status' })
  @ApiQuery({ name: 'floorId', required: false, description: 'Filter by floor UUID' })
  @ApiResultResponse({
    status: 200,
    description: 'Available tables retrieved',
    type: TableResponseDto,
    isArray: true,
  })
  async getAvailable(@Query('floorId') floorId?: string) {
    return this.service.getAvailableTables(floorId);
  }

  @Get('occupied')
  @Permissions(PERMISSIONS.TABLES_VIEW) // Cashier+
  @ApiOperation({ summary: 'Get occupied tables', description: 'Returns tables with OCCUPIED status' })
  @ApiQuery({ name: 'floorId', required: false, description: 'Filter by floor UUID' })
  @ApiResultResponse({
    status: 200,
    description: 'Occupied tables retrieved',
    type: TableResponseDto,
    isArray: true,
  })
  async getOccupied(@Query('floorId') floorId?: string) {
    return this.service.getOccupiedTables(floorId);
  }

  @Post(':id/assign')
  @Permissions(PERMISSIONS.TABLES_ASSIGN) // Cashier+
  @ApiOperation({ summary: 'Assign order to table', description: 'Associates an order with a table' })
  @ApiParam({ name: 'id', description: 'Table UUID' })
  @ApiResultResponse({ status: 200, description: 'Order assigned to table', type: TableResponseDto })
  @ApiErrorResponse({ status: 404, description: 'Table not found' })
  @ApiErrorResponse({ status: 400, description: 'Table already occupied' })
  async assignOrder(@Param('id') id: string, @Body() dto: { orderId: string }) {
    return this.service.assignOrderToTable(id, dto.orderId);
  }

  @Post(':id/release')
  @Permissions(PERMISSIONS.TABLES_ASSIGN) // Cashier+
  @ApiOperation({ summary: 'Release table', description: 'Releases table and marks for cleaning' })
  @ApiParam({ name: 'id', description: 'Table UUID' })
  @ApiResultResponse({ status: 200, description: 'Table released', type: TableResponseDto })
  @ApiErrorResponse({ status: 404, description: 'Table not found' })
  async release(@Param('id') id: string) {
    return this.service.releaseTable(id);
  }

  @Post(':id/clean')
  @Permissions(PERMISSIONS.TABLES_CLEAN) // Cashier+
  @ApiOperation({ summary: 'Mark table clean', description: 'Marks table as cleaned and available' })
  @ApiParam({ name: 'id', description: 'Table UUID' })
  @ApiResultResponse({ status: 200, description: 'Table marked clean', type: TableResponseDto })
  @ApiErrorResponse({ status: 404, description: 'Table not found' })
  async markClean(@Param('id') id: string) {
    return this.service.markTableClean(id);
  }

  @Post('transfer')
  @Permissions(PERMISSIONS.TABLES_TRANSFER) // 🔒 Manager+
  @ApiOperation({ summary: 'Transfer table', description: 'Transfers order between tables. Manager+ required.' })
  @ApiResultResponse({ status: 200, description: 'Table transferred' })
  @ApiErrorResponse({ status: 400, description: 'Validation error or target table occupied' })
  async transfer(@Body() dto: TransferTableDto) {
    return this.service.transferTable(dto);
  }

  @Post(':id/waiter')
  @Permissions(PERMISSIONS.TABLES_ASSIGN) // Cashier+
  @ApiOperation({ summary: 'Assign waiter to table', description: 'Assigns waiter responsibility for table' })
  @ApiParam({ name: 'id', description: 'Table UUID' })
  @ApiResultResponse({ status: 200, description: 'Waiter assigned', type: TableResponseDto })
  @ApiErrorResponse({ status: 404, description: 'Table not found' })
  async assignWaiter(
    @Param('id') id: string,
    @Body() dto: { waiterId: string },
  ) {
    return this.service.assignWaiter(id, dto.waiterId);
  }

  // ==================== RESERVATIONS ====================

  @Post('reservations')
  @Permissions(PERMISSIONS.TABLES_RESERVATION_MANAGE) // Manager+
  @ApiOperation({ summary: 'Create reservation', description: 'Creates a table reservation. Manager+ required.' })
  @ApiResultResponse({ status: 201, description: 'Reservation created', type: TableReservationResponseDto })
  @ApiErrorResponse({ status: 400, description: 'Time slot not available' })
  async createReservation(@Body() dto: CreateReservationDto) {
    return this.service.createReservation(dto);
  }

  @Put('reservations/:id/status')
  @Permissions(PERMISSIONS.TABLES_RESERVATION_MANAGE) // Manager+
  @ApiOperation({ summary: 'Update reservation status', description: 'Updates reservation status (confirmed, cancelled, etc.). Manager+ required.' })
  @ApiParam({ name: 'id', description: 'Reservation UUID' })
  @ApiResultResponse({ status: 200, description: 'Reservation status updated', type: TableReservationResponseDto })
  @ApiErrorResponse({ status: 404, description: 'Reservation not found' })
  async updateReservationStatus(
    @Param('id') id: string,
    @Body() dto: UpdateReservationStatusDto,
  ) {
    return this.service.updateReservationStatus(id, dto);
  }

  @Get('reservations/today')
  @Permissions(PERMISSIONS.TABLES_RESERVATION_VIEW) // Cashier+
  @ApiOperation({ summary: 'Get today reservations', description: 'Returns all reservations for today' })
  @ApiResultResponse({
    status: 200,
    description: 'Today reservations retrieved',
    type: TableReservationResponseDto,
    isArray: true,
  })
  async getTodayReservations() {
    return this.service.getTodayReservations();
  }

  @Get(':tableId/reservations')
  @Permissions(PERMISSIONS.TABLES_RESERVATION_VIEW) // Cashier+
  @ApiOperation({ summary: 'Get table reservations', description: 'Returns reservations for table on specific date' })
  @ApiParam({ name: 'tableId', description: 'Table UUID' })
  @ApiQuery({ name: 'date', required: true, description: 'Date in ISO format (YYYY-MM-DD)' })
  @ApiResultResponse({
    status: 200,
    description: 'Table reservations retrieved',
    type: TableReservationResponseDto,
    isArray: true,
  })
  async getReservationsByTable(
    @Param('tableId') tableId: string,
    @Query('date') date: string,
  ) {
    return this.service.getReservationsByTable(tableId, new Date(date));
  }
}

