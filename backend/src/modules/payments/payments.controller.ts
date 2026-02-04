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
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import {
  CreatePaymentDto,
  SplitPaymentDto,
  CreateRefundDto,
  CreatePaymentMethodDto,
  UpdatePaymentMethodDto,
  PaymentMethodResponseDto,
  PaymentResponseDto,
  RefundResponseDto,
} from './dto';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../../core/constants/permissions';
import { examples } from '../../common/fixtures/swagger-examples';
import { ApiErrorResponse, ApiResultResponse } from '../../common/decorators';

@ApiTags('Payments')
@ApiBearerAuth('JWT')
@ApiErrorResponse({ status: 401, description: 'Not authenticated' })
@ApiErrorResponse({ status: 403, description: 'Missing required permissions' })
@Controller('payments')
export class PaymentsController {
  constructor(private readonly service: PaymentsService) { }

  // ==================== PAYMENTS ====================

  @Post()
  @Permissions(PERMISSIONS.PAYMENTS_CREATE) // Cashier+
  @ApiOperation({ summary: 'Process payment', description: 'Processes a payment for an order' })
  @ApiBody({ schema: { example: examples.payment.createPaymentRequest.value } })
  @ApiResultResponse({
    status: 201,
    description: 'Payment processed successfully',
    type: PaymentResponseDto,
  })
  @ApiErrorResponse({ status: 401, description: 'Unauthorized' })
  @ApiErrorResponse({ status: 422, description: 'Validation error' })
  async createPayment(@Body() dto: CreatePaymentDto) {
    return this.service.createPayment(dto);
  }

  @Post('split')
  @Permissions(PERMISSIONS.PAYMENTS_SPLIT) // Cashier+
  @ApiOperation({ summary: 'Process split payment', description: 'Processes multiple payment methods for one order' })
  @ApiBody({ schema: { example: examples.payment.createPaymentRequest.value } })
  @ApiResultResponse({
    status: 201,
    description: 'Split payment processed',
    type: PaymentResponseDto,
    isArray: true,
  })
  @ApiErrorResponse({ status: 401, description: 'Unauthorized' })
  @ApiErrorResponse({ status: 422, description: 'Validation error' })
  async processSplitPayment(@Body() dto: SplitPaymentDto) {
    return this.service.processSplitPayment(dto);
  }

  @Get('methods')
  @Permissions(PERMISSIONS.PAYMENTS_VIEW) // Cashier+ (view methods)
  @ApiOperation({ summary: 'Get payment methods', description: 'Returns all available payment methods' })
  @ApiResultResponse({
    status: 200,
    description: 'Payment methods retrieved',
    type: PaymentMethodResponseDto,
    isArray: true,
  })
  async getAllPaymentMethods() {
    return this.service.getAllPaymentMethods();
  }

  @Get(':id')
  @Permissions(PERMISSIONS.PAYMENTS_VIEW) // Cashier+
  @ApiOperation({ summary: 'Get payment by ID', description: 'Returns payment details' })
  @ApiParam({ name: 'id', description: 'Payment UUID' })
  @ApiResultResponse({
    status: 200,
    description: 'Payment found',
    type: PaymentResponseDto,
  })
  @ApiErrorResponse({ status: 404, description: 'Payment not found' })
  async findPaymentById(@Param('id') id: string) {
    return this.service.findPaymentById(id);
  }

  @Get('order/:orderId')
  @Permissions(PERMISSIONS.PAYMENTS_VIEW) // Cashier+
  @ApiOperation({ summary: 'Get payments by order', description: 'Returns all payments for an order' })
  @ApiParam({ name: 'orderId', description: 'Order UUID' })
  @ApiResultResponse({
    status: 200,
    description: 'Payments retrieved',
    type: PaymentResponseDto,
    isArray: true,
  })
  async getPaymentsByOrder(@Param('orderId') orderId: string) {
    return this.service.findByOrder(orderId);
  }

  @Get('session/:sessionId')
  @Permissions(PERMISSIONS.PAYMENTS_VIEW_ALL) // 🔒 Manager+
  @ApiOperation({ summary: 'Get payments by session', description: 'Returns all payments for a session. Manager+ required.' })
  @ApiParam({ name: 'sessionId', description: 'Session UUID' })
  @ApiResultResponse({
    status: 200,
    description: 'Payments retrieved',
    type: PaymentResponseDto,
    isArray: true,
  })
  async getPaymentsBySession(@Param('sessionId') sessionId: string) {
    return this.service.findBySession(sessionId);
  }

  // ==================== REFUNDS ====================

  @Post('refunds')
  @Permissions(PERMISSIONS.PAYMENTS_CREATE) // Cashier+ (create refund request)
  @ApiOperation({ summary: 'Create refund request', description: 'Creates a refund request for approval' })
  @ApiResultResponse({
    status: 201,
    description: 'Refund request created',
    type: RefundResponseDto,
  })
  @ApiErrorResponse({ status: 400, description: 'Invalid refund amount or payment not found' })
  async createRefund(@Body() dto: CreateRefundDto) {
    return this.service.processRefund(dto);
  }

  @Get('refunds/pending')
  @Permissions(PERMISSIONS.PAYMENTS_APPROVE_REFUND) // 🔒 Manager only
  @ApiOperation({ summary: 'Get pending refunds', description: 'Returns refunds awaiting approval. Manager only.' })
  @ApiResultResponse({
    status: 200,
    description: 'Pending refunds retrieved',
    type: RefundResponseDto,
    isArray: true,
  })
  async getPendingRefunds() {
    return this.service.getPendingRefunds();
  }

  @Put('refunds/:id/approve')
  @Permissions(PERMISSIONS.PAYMENTS_APPROVE_REFUND) // 🔒 Manager only
  @ApiOperation({ summary: 'Approve refund', description: 'Approves a pending refund. Manager only.' })
  @ApiParam({ name: 'id', description: 'Refund UUID' })
  @ApiResultResponse({
    status: 200,
    description: 'Refund approved',
    type: RefundResponseDto,
  })
  @ApiErrorResponse({ status: 404, description: 'Refund not found' })
  async approveRefund(
    @Param('id') id: string,
    @Body() body: { userId: string },
  ) {
    return this.service.approveRefund(id, body.userId);
  }

  @Put('refunds/:id/reject')
  @Permissions(PERMISSIONS.PAYMENTS_APPROVE_REFUND) // 🔒 Manager only
  @ApiOperation({ summary: 'Reject refund', description: 'Rejects a pending refund with reason. Manager only.' })
  @ApiParam({ name: 'id', description: 'Refund UUID' })
  @ApiResultResponse({
    status: 200,
    description: 'Refund rejected',
    type: RefundResponseDto,
  })
  @ApiErrorResponse({ status: 404, description: 'Refund not found' })
  async rejectRefund(
    @Param('id') id: string,
    @Body() body: { userId: string; reason: string },
  ) {
    return this.service.rejectRefund(id, body.userId, body.reason);
  }

  // ==================== PAYMENT METHODS ====================



  @Post('methods')
  @Permissions(PERMISSIONS.SETTINGS_UPDATE) // 🔒 Admin only
  @ApiOperation({ summary: 'Create payment method', description: 'Creates new payment method. Admin only.' })
  @ApiResultResponse({
    status: 201,
    description: 'Payment method created',
    type: PaymentMethodResponseDto,
  })
  @ApiErrorResponse({ status: 400, description: 'Validation error' })
  async createPaymentMethod(@Body() dto: CreatePaymentMethodDto) {
    return this.service.createPaymentMethod(dto);
  }

  @Put('methods/:id')
  @Permissions(PERMISSIONS.SETTINGS_UPDATE) // 🔒 Admin only
  @ApiOperation({ summary: 'Update payment method', description: 'Updates payment method. Admin only.' })
  @ApiParam({ name: 'id', description: 'Payment Method UUID' })
  @ApiResultResponse({
    status: 200,
    description: 'Payment method updated',
    type: PaymentMethodResponseDto,
  })
  @ApiErrorResponse({ status: 404, description: 'Payment method not found' })
  async updatePaymentMethod(
    @Param('id') id: string,
    @Body() dto: UpdatePaymentMethodDto,
  ) {
    return this.service.updatePaymentMethod(id, dto);
  }
}
