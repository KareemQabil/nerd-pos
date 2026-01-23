// Sales Controller
// Source: FINAL/BACKEND/05-MODULE-SALES.md, 01-create-module workflow
// Security: Block 2 - All endpoints secured with @Permissions

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SalesService } from './sales.service';
import { PaginationDto, PaginatedResponseDto } from '../../common/dto';
import {
  CreateOrderDto,
  UpdateOrderStatusDto,
  AddOrderItemDto,
  UpdateOrderItemDto,
} from './dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../../core/constants/permissions';

@ApiTags('Sales')
@ApiBearerAuth('JWT')
@Controller('orders')
export class SalesController {
  constructor(private readonly service: SalesService) { }

  // ==================== ORDER CRUD ====================

  @Permissions(PERMISSIONS.SALES_CREATE) // Cashier+
  @Post()
  async createOrder(
    @Body() dto: CreateOrderDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.service.createOrder(dto, userId);
  }

  @Permissions(PERMISSIONS.SALES_VIEW) // Cashier+
  @Get()
  async findOrders(
    @Query() pagination: PaginationDto,
    @Query('status') status?: string,
  ) {
    const result = await this.service.findOrdersByStatusPaginated(status, {
      page: pagination.page,
      limit: pagination.limit,
    });

    return new PaginatedResponseDto(
      result.data,
      result.total,
      result.page,
      result.limit,
    );
  }

  @Permissions(PERMISSIONS.SALES_VIEW) // Cashier+
  @Get(':id')
  async findOrderById(@Param('id') id: string) {
    return this.service.findOrderByIdWithItems(id);
  }

  @Permissions(PERMISSIONS.SALES_VIEW) // Cashier+
  @Get('number/:orderNumber')
  async findOrderByNumber(@Param('orderNumber') orderNumber: string) {
    return this.service.findOrderByNumber(orderNumber);
  }

  // ==================== ORDER STATUS ====================

  @Permissions(PERMISSIONS.SALES_CONFIRM) // Cashier+
  @Put(':id/confirm')
  async confirmOrder(@Param('id') id: string) {
    return this.service.confirmOrder(id);
  }

  @Permissions(PERMISSIONS.SALES_UPDATE) // Cashier+
  @Put(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.service.updateStatus(id, dto);
  }

  @Permissions(PERMISSIONS.SALES_CANCEL) // 🔒 Manager+
  @Put(':id/cancel')
  async cancelOrder(
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    return this.service.cancelOrder(id, body.reason);
  }

  // ==================== ORDER ITEMS ====================

  @Permissions(PERMISSIONS.SALES_UPDATE) // Cashier+
  @Post(':id/items')
  async addItem(@Param('id') id: string, @Body() dto: AddOrderItemDto) {
    return this.service.addItem(id, dto);
  }

  @Permissions(PERMISSIONS.SALES_UPDATE) // Cashier+
  @Put(':id/items/:itemId')
  async updateItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateOrderItemDto,
  ) {
    return this.service.updateItem(id, itemId, dto);
  }

  @Permissions(PERMISSIONS.SALES_UPDATE) // Cashier+
  @Delete(':id/items/:itemId')
  async removeItem(@Param('id') id: string, @Param('itemId') itemId: string) {
    return this.service.removeItem(id, itemId);
  }

  // ==================== QUERIES ====================

  @Permissions(PERMISSIONS.SALES_VIEW_ALL) // 🔒 Manager+
  @Get('session/:sessionId')
  async findBySession(@Param('sessionId') sessionId: string) {
    return this.service.findOrdersBySession(sessionId);
  }

  @Permissions(PERMISSIONS.SALES_VIEW) // Cashier+
  @Get('customer/:customerId')
  async findByCustomer(@Param('customerId') customerId: string) {
    return this.service.findOrdersByCustomer(customerId);
  }
}
