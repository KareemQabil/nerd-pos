// Payments Controller
// Source: FINAL/BACKEND/06-MODULE-PAYMENTS.md
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
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import {
  CreatePaymentDto,
  SplitPaymentDto,
  CreateRefundDto,
  CreatePaymentMethodDto,
  UpdatePaymentMethodDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { ResourceType } from '../auth/guards/ownership.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../../core/constants/permissions';
import { examples } from '../../common/fixtures/swagger-examples';
import { ApiBody } from '@nestjs/swagger';

@ApiTags('Payments')
@ApiBearerAuth('JWT')
@ApiUnauthorizedResponse({ description: 'Not authenticated' })
@ApiForbiddenResponse({ description: 'Missing required permissions' })
@ResourceType('payment')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  // ==================== PAYMENTS ====================

  @Post()
  @Permissions(PERMISSIONS.PAYMENTS_CREATE) // Cashier+
  @ApiOperation({
    summary: 'Process payment',
    description: 'Processes a payment for an order',
  })
  @ApiBody({ schema: { example: examples.payment.createPaymentRequest.value } })
  @ApiResponse({
    status: 201,
    description: 'Payment processed successfully',
    content: {
      'application/json': { example: examples.payment.paymentSuccess.value },
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
  async createPayment(@Body() dto: CreatePaymentDto) {
    return this.service.createPayment(dto);
  }

  @Post('split')
  @Permissions(PERMISSIONS.PAYMENTS_SPLIT) // Cashier+
  @ApiOperation({
    summary: 'Process split payment',
    description: 'Processes multiple payment methods for one order',
  })
  @ApiBody({ schema: { example: examples.payment.createPaymentRequest.value } })
  @ApiResponse({
    status: 201,
    description: 'Split payment processed',
    content: {
      'application/json': { example: examples.payment.paymentSuccess.value },
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
  async processSplitPayment(@Body() dto: SplitPaymentDto) {
    return this.service.processSplitPayment(dto);
  }

  @Get('methods')
  @Permissions(PERMISSIONS.PAYMENTS_VIEW) // Cashier+ (view methods)
  @ApiOperation({
    summary: 'Get payment methods',
    description: 'Returns all available payment methods',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment methods retrieved',
    schema: {
      example: {
        success: true,
        message: 'Request successful',
        data: [
          {
            id: 'pm_1',
            nameEn: 'Cash',
            nameAr: 'نقدي',
            type: 'CASH',
            active: true,
          },
        ],
        timestamp: '2026-01-23T12:00:00Z',
      },
    },
  })
  async getAllPaymentMethods() {
    return this.service.getAllPaymentMethods();
  }

  @Get(':id')
  @Permissions(PERMISSIONS.PAYMENTS_VIEW) // Cashier+
  @ApiOperation({
    summary: 'Get payment by ID',
    description: 'Returns payment details',
  })
  @ApiParam({ name: 'id', description: 'Payment UUID' })
  @ApiResponse({
    status: 200,
    description: 'Payment found',
    schema: {
      example: {
        success: true,
        message: 'Request successful',
        data: {
          id: 'pay_123',
          amount: 50.0,
          method: 'CARD',
          status: 'COMPLETED',
        },
        timestamp: '2026-01-23T12:06:00Z',
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Payment not found' })
  async findPaymentById(@Param('id') id: string) {
    return this.service.findPaymentById(id);
  }

  @Get('order/:orderId')
  @ResourceType('order', 'orderId')
  @Permissions(PERMISSIONS.PAYMENTS_VIEW) // Cashier+
  @ApiOperation({
    summary: 'Get payments by order',
    description: 'Returns all payments for an order',
  })
  @ApiParam({ name: 'orderId', description: 'Order UUID' })
  @ApiResponse({
    status: 200,
    description: 'Payments retrieved',
    schema: {
      example: {
        success: true,
        message: 'Request successful',
        data: [
          {
            id: 'pay_123',
            amount: 50.0,
            method: 'CASH',
            status: 'COMPLETED',
          },
        ],
        timestamp: '2026-01-23T12:06:00Z',
      },
    },
  })
  async getPaymentsByOrder(@Param('orderId') orderId: string) {
    return this.service.findByOrder(orderId);
  }

  @Get('session/:sessionId')
  @ResourceType('session', 'sessionId')
  @Permissions(PERMISSIONS.PAYMENTS_VIEW_ALL) // 🔒 Manager+
  @ApiOperation({
    summary: 'Get payments by session',
    description: 'Returns all payments for a session. Manager+ required.',
  })
  @ApiParam({ name: 'sessionId', description: 'Session UUID' })
  @ApiResponse({ status: 200, description: 'Payments retrieved' })
  async getPaymentsBySession(@Param('sessionId') sessionId: string) {
    return this.service.findBySession(sessionId);
  }

  // ==================== REFUNDS ====================

  @Post('refunds')
  @Permissions(PERMISSIONS.PAYMENTS_CREATE) // Cashier+ (create refund request)
  @ApiOperation({
    summary: 'Create refund request',
    description: 'Creates a refund request for approval',
  })
  @ApiResponse({
    status: 201,
    description: 'Refund request created',
    schema: {
      example: {
        success: true,
        message: 'Refund request created',
        data: {
          id: 'ref_123',
          paymentId: 'pay_123',
          amount: 50.0,
          status: 'PENDING',
          reason: 'Customer complaint',
        },
        timestamp: '2026-01-23T12:10:00Z',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid refund amount or payment not found',
  })
  async createRefund(@Body() dto: CreateRefundDto) {
    return this.service.processRefund(dto);
  }

  @Get('refunds/pending')
  @Permissions(PERMISSIONS.PAYMENTS_APPROVE_REFUND) // 🔒 Manager only
  @ApiOperation({
    summary: 'Get pending refunds',
    description: 'Returns refunds awaiting approval. Manager only.',
  })
  @ApiResponse({ status: 200, description: 'Pending refunds retrieved' })
  async getPendingRefunds() {
    return this.service.getPendingRefunds();
  }

  @Put('refunds/:id/approve')
  @Permissions(PERMISSIONS.PAYMENTS_APPROVE_REFUND) // 🔒 Manager only
  @ApiOperation({
    summary: 'Approve refund',
    description: 'Approves a pending refund. Manager only.',
  })
  @ApiParam({ name: 'id', description: 'Refund UUID' })
  @ApiResponse({ status: 200, description: 'Refund approved' })
  @ApiNotFoundResponse({ description: 'Refund not found' })
  async approveRefund(
    @Param('id') id: string,
    @Body() body: { userId: string },
  ) {
    return this.service.approveRefund(id, body.userId);
  }

  @Put('refunds/:id/reject')
  @Permissions(PERMISSIONS.PAYMENTS_APPROVE_REFUND) // 🔒 Manager only
  @ApiOperation({
    summary: 'Reject refund',
    description: 'Rejects a pending refund with reason. Manager only.',
  })
  @ApiParam({ name: 'id', description: 'Refund UUID' })
  @ApiResponse({ status: 200, description: 'Refund rejected' })
  @ApiNotFoundResponse({ description: 'Refund not found' })
  async rejectRefund(
    @Param('id') id: string,
    @Body() body: { userId: string; reason: string },
  ) {
    return this.service.rejectRefund(id, body.userId, body.reason);
  }

  // ==================== PAYMENT METHODS ====================

  @Post('methods')
  @Permissions(PERMISSIONS.SETTINGS_UPDATE) // 🔒 Admin only
  @ApiOperation({
    summary: 'Create payment method',
    description: 'Creates new payment method. Admin only.',
  })
  @ApiResponse({ status: 201, description: 'Payment method created' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  async createPaymentMethod(@Body() dto: CreatePaymentMethodDto) {
    return this.service.createPaymentMethod(dto);
  }

  @Put('methods/:id')
  @Permissions(PERMISSIONS.SETTINGS_UPDATE) // 🔒 Admin only
  @ApiOperation({
    summary: 'Update payment method',
    description: 'Updates payment method. Admin only.',
  })
  @ApiParam({ name: 'id', description: 'Payment Method UUID' })
  @ApiResponse({ status: 200, description: 'Payment method updated' })
  @ApiNotFoundResponse({ description: 'Payment method not found' })
  async updatePaymentMethod(
    @Param('id') id: string,
    @Body() dto: UpdatePaymentMethodDto,
  ) {
    return this.service.updatePaymentMethod(id, dto);
  }
}
