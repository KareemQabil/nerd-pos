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
import { ApiResultResponse, ApiErrorResponse } from '../../common/decorators';
import { GenerateInvoiceDto, SubmitInvoiceDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../../core/constants/permissions';

@ApiTags('Compliance')
@ApiBearerAuth('JWT')
@ApiUnauthorizedResponse({ description: 'Not authenticated' })
@ApiForbiddenResponse({ description: 'Missing required permissions' })
@ApiErrorResponse({ status: 401, description: 'Not authenticated' })
@ApiErrorResponse({ status: 403, description: 'Missing required permissions' })
@Controller('compliance')
export class ComplianceController {
  constructor(private readonly service: ComplianceService) {}

  @Post('invoice/generate')
  @Permissions(PERMISSIONS.COMPLIANCE_GENERATE) // Cashier+
  @ApiOperation({
    summary: 'Generate tax invoice',
    description: 'Generates ETA/ZATCA compliant invoice for order',
  })
  @ApiResultResponse({ status: 201, description: 'Invoice generated' })
  @ApiResponse({
    status: 201,
    description: 'Invoice generated',
    schema: {
      example: {
        success: true,
        message: 'Invoice generated successfully',
        data: {
          id: 'inv_123456789',
          orderId: 'ord_123',
          invoiceNumber: 'INV-2026-001',
          totalAmount: 115.0,
          taxAmount: 15.0,
          status: 'GENERATED',
          hash: 'a1b2c3d4...',
        },
        timestamp: '2026-01-23T12:00:00Z',
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Order not found or already invoiced' })
  async generate(@Body() dto: GenerateInvoiceDto & { orderData: any }) {
    return this.service.generateInvoice(dto.orderId, dto.orderData);
  }

  @Post('invoice/submit')
  @Permissions(PERMISSIONS.COMPLIANCE_GENERATE) // Cashier+
  @ApiOperation({
    summary: 'Submit invoice to tax authority',
    description: 'Submits invoice to ETA/ZATCA for approval',
  })
  @ApiResultResponse({ status: 200, description: 'Invoice submitted' })
  @ApiResponse({
    status: 200,
    description: 'Invoice submitted',
    schema: {
      example: {
        success: true,
        message: 'Invoice submitted successfully',
        data: {
          invoiceId: 'inv_123',
          status: 'SUBMITTED',
          submissionId: 'sub_999',
          ackTime: '2026-01-23T12:05:00Z',
        },
        timestamp: '2026-01-23T12:05:00Z',
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Invoice not found' })
  @ApiBadRequestResponse({
    description: 'Invoice already submitted or invalid',
  })
  async submit(@Body() dto: SubmitInvoiceDto) {
    return this.service.submitInvoice(dto.invoiceId);
  }

  @Get('invoice/order/:orderId')
  @Permissions(PERMISSIONS.COMPLIANCE_VIEW) // 🔒 Manager+
  @ApiOperation({
    summary: 'Get invoice by order',
    description: 'Returns compliance invoice for order. Manager+ required.',
  })
  @ApiParam({ name: 'orderId', description: 'Order UUID' })
  @ApiResultResponse({ status: 200, description: 'Invoice found' })
  @ApiResponse({
    status: 200,
    description: 'Invoice found',
    schema: {
      example: {
        success: true,
        message: 'Request successful',
        data: {
          id: 'inv_123',
          orderId: 'ord_123',
          status: 'CLEARED',
          qrCode: 'base64_encoded_qr_code...',
        },
        timestamp: '2026-01-23T12:00:00Z',
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Invoice not found for order' })
  async findByOrder(@Param('orderId') orderId: string) {
    return this.service.findByOrder(orderId);
  }

  @Get('invoice/pending')
  @Permissions(PERMISSIONS.COMPLIANCE_VIEW) // 🔒 Manager+
  @ApiOperation({
    summary: 'Get pending invoices',
    description: 'Returns invoices pending submission. Manager+ required.',
  })
  @ApiResultResponse({
    status: 200,
    description: 'Pending invoices retrieved',
  })
  @ApiResponse({
    status: 200,
    description: 'Pending invoices retrieved',
    schema: {
      example: {
        success: true,
        message: 'Request successful',
        data: [
          {
            id: 'inv_124',
            status: 'GENERATED',
            amount: 50.0,
            generatedAt: '2026-01-23T12:10:00Z',
          },
        ],
        timestamp: '2026-01-23T12:15:00Z',
      },
    },
  })
  async getPending() {
    return this.service.getPendingInvoices();
  }

  @Get('hash-chain/verify')
  @Permissions(PERMISSIONS.COMPLIANCE_VIEW) // 🔒 Manager+
  @ApiOperation({
    summary: 'Verify hash chain',
    description: 'Verifies integrity of invoice hash chain. Manager+ required.',
  })
  @ApiResultResponse({
    status: 200,
    description: 'Hash chain verification result',
  })
  @ApiResponse({
    status: 200,
    description: 'Hash chain verification result',
    schema: {
      example: {
        success: true,
        message: 'Hash chain verification complete',
        data: {
          isValid: true,
          brokenAt: null,
          lastVerifiedHash: 'h1a2s3h4...',
        },
        timestamp: '2026-01-23T12:00:00Z',
      },
    },
  })
  async verifyChain() {
    return this.service.verifyHashChain();
  }
}
