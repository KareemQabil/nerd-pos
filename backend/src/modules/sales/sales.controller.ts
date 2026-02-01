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
import { examples } from '../../common/fixtures/swagger-examples';
import { ApiBody } from '@nestjs/swagger';

@ApiTags('Sales')
@ApiBearerAuth('JWT')
@ApiUnauthorizedResponse({
  description: 'Not authenticated - JWT token missing or invalid',
})
@ApiForbiddenResponse({ description: 'Missing required permissions' })
@Controller('orders')
export class SalesController {
  constructor(private readonly service: SalesService) {}

  // ==================== ORDER CRUD ====================

  @Post()
  @Permissions(PERMISSIONS.SALES_CREATE) // Cashier+
  @ApiOperation({
    summary: 'Create new order',
    description: 'Creates a new order (DINE_IN, TAKEAWAY, or DELIVERY)',
  })
  @ApiBody({ schema: { example: examples.sales.createOrderRequest.value } })
  @ApiResponse({
    status: 201,
    description: 'Order created successfully',
    content: {
      'application/json': { example: examples.sales.createOrderSuccess.value },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    content: {
      'application/json': { example: examples.errors.unauthorizedError.value },
    },
  })
  @ApiResponse({
    status: 422,
    description: 'Validation error',
    content: {
      'application/json': { example: examples.errors.validationError.value },
    },
  })
  async createOrder(
    @Body() dto: CreateOrderDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.service.createOrder(dto, userId);
  }

  @Get()
  @Permissions(PERMISSIONS.SALES_VIEW) // Cashier+
  @ApiOperation({
    summary: 'Get all orders',
    description: 'Returns paginated list of orders with optional status filter',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by order status (DRAFT, CONFIRMED, etc.)',
  })
  @ApiResponse({
    status: 200,
    description: 'Orders retrieved successfully',
    schema: {
      example: {
        success: true,
        message: 'Request successful',
        data: [
          {
            id: 'ord_123',
            orderNumber: 'ORD-001',
            status: 'CONFIRMED',
            total: 150.0,
          },
        ],
        meta: {
          total: 50,
          page: 1,
          limit: 10,
        },
        timestamp: '2026-01-23T12:00:00Z',
        path: '/api/v1/orders',
      },
    },
  })
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

  @Get(':id')
  @Permissions(PERMISSIONS.SALES_VIEW) // Cashier+
  @ApiOperation({
    summary: 'Get order by ID',
    description: 'Returns order with all items and details',
  })
  @ApiParam({ name: 'id', description: 'Order UUID' })
  @ApiResponse({
    status: 200,
    description: 'Order found',
    content: {
      'application/json': { example: examples.sales.createOrderSuccess.value },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Order not found',
    content: {
      'application/json': { example: examples.errors.notFoundError.value },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    content: {
      'application/json': { example: examples.errors.unauthorizedError.value },
    },
  })
  async findOrderById(@Param('id') id: string) {
    return this.service.findOrderByIdWithItems(id);
  }

  @Get('number/:orderNumber')
  @Permissions(PERMISSIONS.SALES_VIEW) // Cashier+
  @ApiOperation({
    summary: 'Get order by number',
    description: 'Returns order by human-readable order number',
  })
  @ApiParam({
    name: 'orderNumber',
    description: 'Order number (e.g., ORD-20260123-001)',
  })
  @ApiResponse({
    status: 200,
    description: 'Order found',
    schema: {
      example: {
        success: true,
        message: 'Request successful',
        data: {
          id: 'ord_123',
          orderNumber: 'ORD-20260123-001',
        },
        timestamp: '2026-01-23T12:00:00Z',
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Order not found' })
  async findOrderByNumber(@Param('orderNumber') orderNumber: string) {
    return this.service.findOrderByNumber(orderNumber);
  }

  // ==================== ORDER STATUS ====================

  @Put(':id/confirm')
  @Permissions(PERMISSIONS.SALES_CONFIRM) // Cashier+
  @ApiOperation({
    summary: 'Confirm order',
    description: 'Confirms order and sends to kitchen',
  })
  @ApiParam({ name: 'id', description: 'Order UUID' })
  @ApiResponse({
    status: 200,
    description: 'Order confirmed',
    content: {
      'application/json': { example: examples.sales.confirmOrderSuccess.value },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Order not found',
    content: {
      'application/json': { example: examples.errors.notFoundError.value },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    content: {
      'application/json': { example: examples.errors.unauthorizedError.value },
    },
  })
  async confirmOrder(@Param('id') id: string) {
    return this.service.confirmOrder(id);
  }

  @Put(':id/status')
  @Permissions(PERMISSIONS.SALES_UPDATE) // Cashier+
  @ApiOperation({
    summary: 'Update order status',
    description: 'Updates order status',
  })
  @ApiParam({ name: 'id', description: 'Order UUID' })
  @ApiResponse({ status: 200, description: 'Status updated' })
  @ApiNotFoundResponse({ description: 'Order not found' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.service.updateStatus(id, dto);
  }

  @Put(':id/cancel')
  @Permissions(PERMISSIONS.SALES_CANCEL) // 🔒 Manager+
  @ApiOperation({
    summary: 'Cancel order',
    description: 'Cancels order. Manager+ role required.',
  })
  @ApiParam({ name: 'id', description: 'Order UUID' })
  @ApiResponse({ status: 200, description: 'Order cancelled' })
  @ApiNotFoundResponse({ description: 'Order not found' })
  async cancelOrder(
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    return this.service.cancelOrder(id, body.reason);
  }

  // ==================== ORDER ITEMS ====================

  @Post(':id/items')
  @Permissions(PERMISSIONS.SALES_UPDATE) // Cashier+
  @ApiOperation({
    summary: 'Add item to order',
    description: 'Adds new item to existing order',
  })
  @ApiParam({ name: 'id', description: 'Order UUID' })
  @ApiResponse({
    status: 201,
    description: 'Item added',
    schema: {
      example: {
        success: true,
        message: 'Item added successfully',
        data: {
          id: 'item_1',
          productId: 'prod_123',
          quantity: 1,
          price: 15.0,
        },
        timestamp: '2026-01-23T12:00:00Z',
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Order not found' })
  async addItem(@Param('id') id: string, @Body() dto: AddOrderItemDto) {
    return this.service.addItem(id, dto);
  }

  @Put(':id/items/:itemId')
  @Permissions(PERMISSIONS.SALES_UPDATE) // Cashier+
  @ApiOperation({
    summary: 'Update order item',
    description: 'Updates quantity or modifiers for an item',
  })
  @ApiParam({ name: 'id', description: 'Order UUID' })
  @ApiParam({ name: 'itemId', description: 'Order Item UUID' })
  @ApiResponse({ status: 200, description: 'Item updated' })
  @ApiNotFoundResponse({ description: 'Order or item not found' })
  async updateItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateOrderItemDto,
  ) {
    return this.service.updateItem(id, itemId, dto);
  }

  @Delete(':id/items/:itemId')
  @Permissions(PERMISSIONS.SALES_UPDATE) // Cashier+
  @ApiOperation({
    summary: 'Remove item from order',
    description: 'Removes item from order',
  })
  @ApiParam({ name: 'id', description: 'Order UUID' })
  @ApiParam({ name: 'itemId', description: 'Order Item UUID' })
  @ApiResponse({ status: 200, description: 'Item removed' })
  @ApiNotFoundResponse({ description: 'Order or item not found' })
  async removeItem(@Param('id') id: string, @Param('itemId') itemId: string) {
    return this.service.removeItem(id, itemId);
  }

  // ==================== QUERIES ====================

  @Get('session/:sessionId')
  @Permissions(PERMISSIONS.SALES_VIEW_ALL) // 🔒 Manager+
  @ApiOperation({
    summary: 'Get orders by session',
    description:
      'Returns all orders for a cashier session. Manager+ role required.',
  })
  @ApiParam({ name: 'sessionId', description: 'Session UUID' })
  @ApiResponse({ status: 200, description: 'Orders retrieved' })
  async findBySession(@Param('sessionId') sessionId: string) {
    return this.service.findOrdersBySession(sessionId);
  }

  // NOTE: findByCustomer endpoint disabled - customerId field not in Prisma schema
  // TODO: Implement customer order lookup through sessionId if needed
  /*
  @Get('customer/:customerId')
  @Permissions(PERMISSIONS.SALES_VIEW) // Cashier+
  @ApiOperation({ summary: 'Get orders by customer', description: 'Returns all orders for a customer' })
  @ApiParam({ name: 'customerId', description: 'Customer UUID' })
  @ApiResponse({ status: 200, description: 'Orders retrieved' })
  async findByCustomer(@Param('customerId') customerId: string) {
    return this.service.findOrdersByCustomer(customerId);
  }
  */
}
