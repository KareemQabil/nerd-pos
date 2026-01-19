// Sales Controller
// Source: FINAL/BACKEND/05-MODULE-SALES.md, 01-create-module workflow

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { SalesService } from './sales.service';
import {
  CreateOrderDto,
  UpdateOrderStatusDto,
  AddOrderItemDto,
  UpdateOrderItemDto,
} from './dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('orders')
export class SalesController {
  constructor(private readonly service: SalesService) {}

  // ==================== ORDER CRUD ====================

  @Post()
  async createOrder(
    @Body() dto: CreateOrderDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.service.createOrder(dto, userId);
  }

  @Get()
  async findOrders(@Query('status') status?: string) {
    if (status) {
      return this.service.findOrdersByStatus(status);
    }
    // Return recent orders by default
    return this.service.findOrdersByStatus('DRAFT');
  }

  @Get(':id')
  async findOrderById(@Param('id') id: string) {
    return this.service.findOrderByIdWithItems(id);
  }

  @Get('number/:orderNumber')
  async findOrderByNumber(@Param('orderNumber') orderNumber: string) {
    return this.service.findOrderByNumber(orderNumber);
  }

  // ==================== ORDER STATUS ====================

  @Put(':id/confirm')
  async confirmOrder(@Param('id') id: string) {
    return this.service.confirmOrder(id);
  }

  @Put(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.service.updateStatus(id, dto);
  }

  @Put(':id/cancel')
  async cancelOrder(
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    return this.service.cancelOrder(id, body.reason);
  }

  // ==================== ORDER ITEMS ====================

  @Post(':id/items')
  async addItem(@Param('id') id: string, @Body() dto: AddOrderItemDto) {
    return this.service.addItem(id, dto);
  }

  @Put(':id/items/:itemId')
  async updateItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateOrderItemDto,
  ) {
    return this.service.updateItem(id, itemId, dto);
  }

  @Delete(':id/items/:itemId')
  async removeItem(@Param('id') id: string, @Param('itemId') itemId: string) {
    return this.service.removeItem(id, itemId);
  }

  // ==================== QUERIES ====================

  @Get('session/:sessionId')
  async findBySession(@Param('sessionId') sessionId: string) {
    return this.service.findOrdersBySession(sessionId);
  }

  @Get('customer/:customerId')
  async findByCustomer(@Param('customerId') customerId: string) {
    return this.service.findOrdersByCustomer(customerId);
  }
}
