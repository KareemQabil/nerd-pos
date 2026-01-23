// Compliance Controller
// Security: Block 2 - All endpoints secured with @Permissions

import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ComplianceService } from './compliance.service';
import { GenerateInvoiceDto, SubmitInvoiceDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../../core/constants/permissions';

@ApiTags('Compliance')
@ApiBearerAuth('JWT')
@Controller('compliance')
export class ComplianceController {
  constructor(private readonly service: ComplianceService) { }

  @Permissions(PERMISSIONS.COMPLIANCE_GENERATE) // Cashier+
  @Post('invoice/generate')
  async generate(@Body() dto: GenerateInvoiceDto & { orderData: any }) {
    return this.service.generateInvoice(dto.orderId, dto.orderData);
  }

  @Permissions(PERMISSIONS.COMPLIANCE_GENERATE) // Cashier+
  @Post('invoice/submit')
  async submit(@Body() dto: SubmitInvoiceDto) {
    return this.service.submitInvoice(dto.invoiceId);
  }

  @Permissions(PERMISSIONS.COMPLIANCE_VIEW) // 🔒 Manager+
  @Get('invoice/order/:orderId')
  async findByOrder(@Param('orderId') orderId: string) {
    return this.service.findByOrder(orderId);
  }

  @Permissions(PERMISSIONS.COMPLIANCE_VIEW) // 🔒 Manager+
  @Get('invoice/pending')
  async getPending() {
    return this.service.getPendingInvoices();
  }

  @Permissions(PERMISSIONS.COMPLIANCE_VIEW) // 🔒 Manager+
  @Get('hash-chain/verify')
  async verifyChain() {
    return this.service.verifyHashChain();
  }
}
