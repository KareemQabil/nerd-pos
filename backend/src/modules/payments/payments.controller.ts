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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
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
@Controller('payments')
export class PaymentsController {
  constructor(private readonly service: PaymentsService) { }

  // ==================== PAYMENTS ====================

  @Permissions(PERMISSIONS.PAYMENTS_CREATE) // Cashier+
  @Post()
  async createPayment(@Body() dto: CreatePaymentDto) {
    return this.service.createPayment(dto);
  }

  @Permissions(PERMISSIONS.PAYMENTS_SPLIT) // Cashier+
  @Post('split')
  async processSplitPayment(@Body() dto: SplitPaymentDto) {
    return this.service.processSplitPayment(dto);
  }

  @Permissions(PERMISSIONS.PAYMENTS_VIEW) // Cashier+
  @Get(':id')
  async findPaymentById(@Param('id') id: string) {
    return this.service.findPaymentById(id);
  }

  @Permissions(PERMISSIONS.PAYMENTS_VIEW) // Cashier+
  @Get('order/:orderId')
  async getPaymentsByOrder(@Param('orderId') orderId: string) {
    return this.service.findByOrder(orderId);
  }

  @Permissions(PERMISSIONS.PAYMENTS_VIEW_ALL) // 🔒 Manager+
  @Get('session/:sessionId')
  async getPaymentsBySession(@Param('sessionId') sessionId: string) {
    return this.service.findBySession(sessionId);
  }

  // ==================== REFUNDS ====================

  @Permissions(PERMISSIONS.PAYMENTS_CREATE) // Cashier+ (create refund request)
  @Post('refunds')
  async createRefund(@Body() dto: CreateRefundDto) {
    return this.service.processRefund(dto);
  }

  @Permissions(PERMISSIONS.PAYMENTS_APPROVE_REFUND) // 🔒 Manager only
  @Get('refunds/pending')
  async getPendingRefunds() {
    return this.service.getPendingRefunds();
  }

  @Permissions(PERMISSIONS.PAYMENTS_APPROVE_REFUND) // 🔒 Manager only
  @Put('refunds/:id/approve')
  async approveRefund(
    @Param('id') id: string,
    @Body() body: { userId: string },
  ) {
    return this.service.approveRefund(id, body.userId);
  }

  @Permissions(PERMISSIONS.PAYMENTS_APPROVE_REFUND) // 🔒 Manager only
  @Put('refunds/:id/reject')
  async rejectRefund(
    @Param('id') id: string,
    @Body() body: { userId: string; reason: string },
  ) {
    return this.service.rejectRefund(id, body.userId, body.reason);
  }

  // ==================== PAYMENT METHODS ====================

  @Permissions(PERMISSIONS.PAYMENTS_VIEW) // Cashier+ (view methods)
  @Get('methods')
  async getAllPaymentMethods() {
    return this.service.getAllPaymentMethods();
  }

  @Permissions(PERMISSIONS.SETTINGS_UPDATE) // 🔒 Admin only
  @Post('methods')
  async createPaymentMethod(@Body() dto: CreatePaymentMethodDto) {
    return this.service.createPaymentMethod(dto);
  }

  @Permissions(PERMISSIONS.SETTINGS_UPDATE) // 🔒 Admin only
  @Put('methods/:id')
  async updatePaymentMethod(
    @Param('id') id: string,
    @Body() dto: UpdatePaymentMethodDto,
  ) {
    return this.service.updatePaymentMethod(id, dto);
  }
}
