// Reports Controller
// Security: Block 2 - All endpoints secured with @Permissions

import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../../core/constants/permissions';

@ApiTags('Reports')
@ApiBearerAuth('JWT')
@ApiUnauthorizedResponse({ description: 'Not authenticated' })
@ApiForbiddenResponse({ description: 'Missing required permissions' })
@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('daily-sales')
  @Permissions(PERMISSIONS.REPORTS_SALES_VIEW) // 🔒 Manager+
  @ApiOperation({
    summary: 'Get daily sales report',
    description: 'Generates daily sales summary. Manager+ required.',
  })
  @ApiQuery({
    name: 'date',
    required: true,
    description: 'Date in ISO format (YYYY-MM-DD)',
  })
  @ApiResponse({
    status: 200,
    description: 'Daily sales report generated',
    schema: {
      example: {
        success: true,
        message: 'Request successful',
        data: {
          date: '2026-01-23',
          totalSales: 5000.0,
          totalOrders: 150,
          averageOrderValue: 33.33,
          categoryBreakdown: {
            'Main Dishes': 3000.0,
            Beverages: 1000.0,
            Desserts: 1000.0,
          },
        },
        timestamp: '2026-01-23T12:00:00Z',
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid date format' })
  async dailySales(@Query('date') date: string) {
    return this.service.generateDailySalesReport(new Date(date));
  }

  @Get('z-report/:sessionId')
  @Permissions(PERMISSIONS.REPORTS_SALES_VIEW) // 🔒 Manager+
  @ApiOperation({
    summary: 'Generate Z-Report',
    description:
      'Generates end-of-day Z-Report for session. Manager+ required.',
  })
  @ApiParam({ name: 'sessionId', description: 'Session UUID' })
  @ApiResponse({
    status: 200,
    description: 'Z-Report generated',
    schema: {
      example: {
        success: true,
        message: 'Request successful',
        data: {
          sessionId: 'sess_123',
          openedAt: '2026-01-23T08:00:00Z',
          closedAt: '2026-01-23T22:00:00Z',
          totalSales: 4500.0,
          paymentBreakdown: {
            CASH: 2000.0,
            CARD: 2500.0,
          },
          netSales: 3913.04,
          taxAmount: 586.96,
        },
        timestamp: '2026-01-23T12:00:00Z',
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Session not found' })
  async zReport(@Param('sessionId') sessionId: string) {
    return this.service.generateZReport(sessionId);
  }

  @Get('top-selling')
  @Permissions(PERMISSIONS.REPORTS_SALES_VIEW) // 🔒 Manager+
  @ApiOperation({
    summary: 'Get top selling items',
    description:
      'Returns best-selling products in date range. Manager+ required.',
  })
  @ApiQuery({
    name: 'startDate',
    required: true,
    description: 'Start date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'endDate',
    required: true,
    description: 'End date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of items to return (default: 10)',
  })
  @ApiResponse({
    status: 200,
    description: 'Top selling items retrieved',
    schema: {
      example: {
        success: true,
        message: 'Request successful',
        data: [
          {
            rank: 1,
            productId: 'prod_1',
            name: 'Cheeseburger',
            quantitySold: 150,
            totalRevenue: 2250.0,
          },
        ],
        timestamp: '2026-01-23T12:00:00Z',
      },
    },
  })
  async topSelling(
    @Query('startDate') start: string,
    @Query('endDate') end: string,
    @Query('limit') limit?: number,
  ) {
    return this.service.getTopSellingItems(
      new Date(start),
      new Date(end),
      limit || 10,
    );
  }

  @Get('inventory-valuation')
  @Permissions(PERMISSIONS.REPORTS_INVENTORY_VIEW) // 🔒 Manager+
  @ApiOperation({
    summary: 'Get inventory valuation',
    description: 'Returns current inventory value. Manager+ required.',
  })
  @ApiResponse({
    status: 200,
    description: 'Inventory valuation retrieved',
    schema: {
      example: {
        success: true,
        message: 'Request successful',
        data: {
          totalValue: 50000.0,
          itemCount: 2500,
          lastUpdated: '2026-01-23T12:00:00Z',
        },
        timestamp: '2026-01-23T12:00:00Z',
      },
    },
  })
  async inventoryValuation() {
    return this.service.getInventoryValuation();
  }
}
