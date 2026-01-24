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
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../../core/constants/permissions';

@ApiTags('Payments')
@ApiBearerAuth('JWT')
@ApiUnauthorizedResponse({ description: 'Not authenticated' })
@ApiForbiddenResponse({ description: 'Missing required permissions' })
@Controller('payments')
export class PaymentsController {
  constructor(private readonly service: PaymentsService) { }

  // ==================== PAYMENTS ====================

  @Post()
  @Permissions(PERMISSIONS.PAYMENTS_CREATE) // Cashier+
  @ApiOperation({ summary: 'Process payment', description: 'Processes a payment for an order' })
  @ApiResponse({ status: 201, description: 'Payment processed successfully' })
  @ApiBadRequestResponse({ description: 'Validation error or insufficient amount' })
  async createPayment(@Body() dto: CreatePaymentDto) {
    return this.service.createPayment(dto);
  }

  @Post('split')
  @Permissions(PERMISSIONS.PAYMENTS_SPLIT) // Cashier+
  @ApiOperation({ summary: 'Process split payment', description: 'Processes multiple payment methods for one order' })
  @ApiResponse({ status: 201, description: 'Split payment processed' })
  @ApiBadRequestResponse({ description: 'Validation error or amounts do not match total' })
  async processSplitPayment(@Body() dto: SplitPaymentDto) {
    return this.service.processSplitPayment(dto);
  }

  @Get(':id')
  @Permissions(PERMISSIONS.PAYMENTS_VIEW) // Cashier+
  @ApiOperation({ summary: 'Get payment by ID', description: 'Returns payment details' })
  @ApiParam({ name: 'id', description: 'Payment UUID' })
  @ApiResponse({ status: 200, description: 'Payment found' })
  @ApiNotFoundResponse({ description: 'Payment not found' })
  async findPaymentById(@Param('id') id: string) {
    return this.service.findPaymentById(id);
  }

  @Get('order/:orderId')
  @Permissions(PERMISSIONS.PAYMENTS_VIEW) // Cashier+
  @ApiOperation({ summary: 'Get payments by order', description: 'Returns all payments for an order' })
  @ApiParam({ name: 'orderId', description: 'Order UUID' })
  @ApiResponse({ status: 200, description: 'Payments retrieved' })
  async getPaymentsByOrder(@Param('orderId') orderId: string) {
    return this.service.findByOrder(orderId);
  }

  @Get('session/:sessionId')
  @Permissions(PERMISSIONS.PAYMENTS_VIEW_ALL) // 🔒 Manager+
  @ApiOperation({ summary: 'Get payments by session', description: 'Returns all payments for a session. Manager+ required.' })
  @ApiParam({ name: 'sessionId', description: 'Session UUID' })
  @ApiResponse({ status: 200, description: 'Payments retrieved' })
  async getPaymentsBySession(@Param('sessionId') sessionId: string) {
    return this.service.findBySession(sessionId);
  }

  // ==================== REFUNDS ====================

  @Post('refunds')
  @Permissions(PERMISSIONS.PAYMENTS_CREATE) // Cashier+ (create refund request)
  @ApiOperation({ summary: 'Create refund request', description: 'Creates a refund request for approval' })
  @ApiResponse({ status: 201, description: 'Refund request created' })
  @ApiBadRequestResponse({ description: 'Invalid refund amount or payment not found' })
  async createRefund(@Body() dto: CreateRefundDto) {
    return this.service.processRefund(dto);
  }

  @Get('refunds/pending')
  @Permissions(PERMISSIONS.PAYMENTS_APPROVE_REFUND) // 🔒 Manager only
  @ApiOperation({ summary: 'Get pending refunds', description: 'Returns refunds awaiting approval. Manager only.' })
  @ApiResponse({ status: 200, description: 'Pending refunds retrieved' })
  async getPendingRefunds() {
    return this.service.getPendingRefunds();
  }

  @Put('refunds/:id/approve')
  @Permissions(PERMISSIONS.PAYMENTS_APPROVE_REFUND) // 🔒 Manager only
  @ApiOperation({ summary: 'Approve refund', description: 'Approves a pending refund. Manager only.' })
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
  @ApiOperation({ summary: 'Reject refund', description: 'Rejects a pending refund with reason. Manager only.' })
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

  @Get('methods')
  @Permissions(PERMISSIONS.PAYMENTS_VIEW) // Cashier+ (view methods)
  @ApiOperation({ summary: 'Get payment methods', description: 'Returns all available payment methods' })
  @ApiResponse({ status: 200, description: 'Payment methods retrieved' })
  async getAllPaymentMethods() {
    return this.service.getAllPaymentMethods();
  }

  @Post('methods')
  @Permissions(PERMISSIONS.SETTINGS_UPDATE) // 🔒 Admin only
  @ApiOperation({ summary: 'Create payment method', description: 'Creates new payment method. Admin only.' })
  @ApiResponse({ status: 201, description: 'Payment method created' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  async createPaymentMethod(@Body() dto: CreatePaymentMethodDto) {
    return this.service.createPaymentMethod(dto);
  }

  @Put('methods/:id')
  @Permissions(PERMISSIONS.SETTINGS_UPDATE) // 🔒 Admin only
  @ApiOperation({ summary: 'Update payment method', description: 'Updates payment method. Admin only.' })
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
