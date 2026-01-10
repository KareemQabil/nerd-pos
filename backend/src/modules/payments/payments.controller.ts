// Payments Controller
// Source: FINAL/BACKEND/06-MODULE-PAYMENTS.md

import {
    Controller,
    Get,
    Post,
    Put,
    Body,
    Param,
    Query,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import {
    CreatePaymentDto,
    SplitPaymentDto,
    CreateRefundDto,
    CreatePaymentMethodDto,
    UpdatePaymentMethodDto,
} from './dto';

@Controller('payments')
export class PaymentsController {
    constructor(private readonly service: PaymentsService) { }

    // ==================== PAYMENTS ====================

    @Post()
    async createPayment(@Body() dto: CreatePaymentDto) {
        return this.service.createPayment(dto);
    }

    @Post('split')
    async processSplitPayment(@Body() dto: SplitPaymentDto) {
        return this.service.processSplitPayment(dto);
    }

    @Get(':id')
    async findPaymentById(@Param('id') id: string) {
        return this.service.findPaymentById(id);
    }

    @Get('order/:orderId')
    async getPaymentsByOrder(@Param('orderId') orderId: string) {
        return this.service.findByOrder(orderId);
    }

    @Get('session/:sessionId')
    async getPaymentsBySession(@Param('sessionId') sessionId: string) {
        return this.service.findBySession(sessionId);
    }

    // ==================== REFUNDS ====================

    @Post('refunds')
    async createRefund(@Body() dto: CreateRefundDto) {
        return this.service.processRefund(dto);
    }

    @Get('refunds/pending')
    async getPendingRefunds() {
        return this.service.getPendingRefunds();
    }

    @Put('refunds/:id/approve')
    async approveRefund(
        @Param('id') id: string,
        @Body() body: { userId: string },
    ) {
        return this.service.approveRefund(id, body.userId);
    }

    @Put('refunds/:id/reject')
    async rejectRefund(
        @Param('id') id: string,
        @Body() body: { userId: string; reason: string },
    ) {
        return this.service.rejectRefund(id, body.userId, body.reason);
    }

    // ==================== PAYMENT METHODS ====================

    @Get('methods')
    async getAllPaymentMethods() {
        return this.service.getAllPaymentMethods();
    }

    @Post('methods')
    async createPaymentMethod(@Body() dto: CreatePaymentMethodDto) {
        return this.service.createPaymentMethod(dto);
    }

    @Put('methods/:id')
    async updatePaymentMethod(
        @Param('id') id: string,
        @Body() dto: UpdatePaymentMethodDto,
    ) {
        return this.service.updatePaymentMethod(id, dto);
    }
}
