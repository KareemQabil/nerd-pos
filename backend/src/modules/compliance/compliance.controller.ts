// Compliance Controller
// Security: Block 2 - All endpoints secured with @Permissions

import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { ComplianceService } from './compliance.service';
import {
  GenerateInvoiceDto,
  SubmitInvoiceDto,
  ComplianceInvoiceResponseDto,
  HashChainStatusResponseDto,
} from './dto';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../../core/constants/permissions';
import { ApiErrorResponse, ApiResultResponse } from '../../common/decorators';

@ApiTags('Compliance')
@ApiBearerAuth('JWT')
@ApiErrorResponse({ status: 401, description: 'Not authenticated' })
@ApiErrorResponse({ status: 403, description: 'Missing required permissions' })
@Controller('compliance')
export class ComplianceController {
  constructor(private readonly service: ComplianceService) { }

  @Post('invoice/generate')
  @Permissions(PERMISSIONS.COMPLIANCE_GENERATE) // Cashier+
  @ApiOperation({ summary: 'Generate tax invoice', description: 'Generates ETA/ZATCA compliant invoice for order' })
  @ApiResultResponse({
    status: 201,
    description: 'Invoice generated',
    type: ComplianceInvoiceResponseDto,
  })
  @ApiErrorResponse({ status: 400, description: 'Order not found or already invoiced' })
  async generate(@Body() dto: GenerateInvoiceDto & { orderData: any }) {
    return this.service.generateInvoice(dto.orderId, dto.orderData);
  }

  @Post('invoice/submit')
  @Permissions(PERMISSIONS.COMPLIANCE_GENERATE) // Cashier+
  @ApiOperation({ summary: 'Submit invoice to tax authority', description: 'Submits invoice to ETA/ZATCA for approval' })
  @ApiResultResponse({
    status: 200,
    description: 'Invoice submitted',
    type: ComplianceInvoiceResponseDto,
  })
  @ApiErrorResponse({ status: 404, description: 'Invoice not found' })
  @ApiErrorResponse({ status: 400, description: 'Invoice already submitted or invalid' })
  async submit(@Body() dto: SubmitInvoiceDto) {
    return this.service.submitInvoice(dto.invoiceId);
  }

  @Get('invoice/order/:orderId')
  @Permissions(PERMISSIONS.COMPLIANCE_VIEW) // 🔒 Manager+
  @ApiOperation({ summary: 'Get invoice by order', description: 'Returns compliance invoice for order. Manager+ required.' })
  @ApiParam({ name: 'orderId', description: 'Order UUID' })
  @ApiResultResponse({
    status: 200,
    description: 'Invoice found',
    type: ComplianceInvoiceResponseDto,
  })
  @ApiErrorResponse({ status: 404, description: 'Invoice not found for order' })
  async findByOrder(@Param('orderId') orderId: string) {
    return this.service.findByOrder(orderId);
  }

  @Get('invoice/pending')
  @Permissions(PERMISSIONS.COMPLIANCE_VIEW) // 🔒 Manager+
  @ApiOperation({ summary: 'Get pending invoices', description: 'Returns invoices pending submission. Manager+ required.' })
  @ApiResultResponse({
    status: 200,
    description: 'Pending invoices retrieved',
    type: ComplianceInvoiceResponseDto,
    isArray: true,
  })
  async getPending() {
    return this.service.getPendingInvoices();
  }

  @Get('hash-chain/verify')
  @Permissions(PERMISSIONS.COMPLIANCE_VIEW) // 🔒 Manager+
  @ApiOperation({ summary: 'Verify hash chain', description: 'Verifies integrity of invoice hash chain. Manager+ required.' })
  @ApiResultResponse({
    status: 200,
    description: 'Hash chain verification result',
    type: HashChainStatusResponseDto,
  })
  async verifyChain() {
    return this.service.verifyHashChain();
  }
}

