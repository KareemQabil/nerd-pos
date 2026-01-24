// Compliance Controller
// Security: Block 2 - All endpoints secured with @Permissions

import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
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
import { ComplianceService } from './compliance.service';
import { GenerateInvoiceDto, SubmitInvoiceDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../../core/constants/permissions';

@ApiTags('Compliance')
@ApiBearerAuth('JWT')
@ApiUnauthorizedResponse({ description: 'Not authenticated' })
@ApiForbiddenResponse({ description: 'Missing required permissions' })
@Controller('compliance')
export class ComplianceController {
  constructor(private readonly service: ComplianceService) { }

  @Post('invoice/generate')
  @Permissions(PERMISSIONS.COMPLIANCE_GENERATE) // Cashier+
  @ApiOperation({ summary: 'Generate tax invoice', description: 'Generates ETA/ZATCA compliant invoice for order' })
  @ApiResponse({ status: 201, description: 'Invoice generated' })
  @ApiBadRequestResponse({ description: 'Order not found or already invoiced' })
  async generate(@Body() dto: GenerateInvoiceDto & { orderData: any }) {
    return this.service.generateInvoice(dto.orderId, dto.orderData);
  }

  @Post('invoice/submit')
  @Permissions(PERMISSIONS.COMPLIANCE_GENERATE) // Cashier+
  @ApiOperation({ summary: 'Submit invoice to tax authority', description: 'Submits invoice to ETA/ZATCA for approval' })
  @ApiResponse({ status: 200, description: 'Invoice submitted' })
  @ApiNotFoundResponse({ description: 'Invoice not found' })
  @ApiBadRequestResponse({ description: 'Invoice already submitted or invalid' })
  async submit(@Body() dto: SubmitInvoiceDto) {
    return this.service.submitInvoice(dto.invoiceId);
  }

  @Get('invoice/order/:orderId')
  @Permissions(PERMISSIONS.COMPLIANCE_VIEW) // 🔒 Manager+
  @ApiOperation({ summary: 'Get invoice by order', description: 'Returns compliance invoice for order. Manager+ required.' })
  @ApiParam({ name: 'orderId', description: 'Order UUID' })
  @ApiResponse({ status: 200, description: 'Invoice found' })
  @ApiNotFoundResponse({ description: 'Invoice not found for order' })
  async findByOrder(@Param('orderId') orderId: string) {
    return this.service.findByOrder(orderId);
  }

  @Get('invoice/pending')
  @Permissions(PERMISSIONS.COMPLIANCE_VIEW) // 🔒 Manager+
  @ApiOperation({ summary: 'Get pending invoices', description: 'Returns invoices pending submission. Manager+ required.' })
  @ApiResponse({ status: 200, description: 'Pending invoices retrieved' })
  async getPending() {
    return this.service.getPendingInvoices();
  }

  @Get('hash-chain/verify')
  @Permissions(PERMISSIONS.COMPLIANCE_VIEW) // 🔒 Manager+
  @ApiOperation({ summary: 'Verify hash chain', description: 'Verifies integrity of invoice hash chain. Manager+ required.' })
  @ApiResponse({ status: 200, description: 'Hash chain verification result' })
  async verifyChain() {
    return this.service.verifyHashChain();
  }
}

