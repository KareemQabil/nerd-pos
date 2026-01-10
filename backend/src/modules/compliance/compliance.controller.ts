// Compliance Controller
import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ComplianceService } from './compliance.service';
import { GenerateInvoiceDto, SubmitInvoiceDto } from './dto';

@Controller('compliance')
export class ComplianceController {
    constructor(private readonly service: ComplianceService) { }

    @Post('invoice/generate')
    async generate(@Body() dto: GenerateInvoiceDto & { orderData: any }) {
        return this.service.generateInvoice(dto.orderId, dto.orderData);
    }

    @Post('invoice/submit')
    async submit(@Body() dto: SubmitInvoiceDto) {
        return this.service.submitInvoice(dto.invoiceId);
    }

    @Get('invoice/order/:orderId')
    async findByOrder(@Param('orderId') orderId: string) {
        return this.service.findByOrder(orderId);
    }

    @Get('invoice/pending')
    async getPending() { return this.service.getPendingInvoices(); }

    @Get('hash-chain/verify')
    async verifyChain() { return this.service.verifyHashChain(); }
}
