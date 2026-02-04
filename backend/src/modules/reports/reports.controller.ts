// Reports Controller
// Security: Block 2 - All endpoints secured with @Permissions

import { Controller, Get, Query, Param } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../../core/constants/permissions';
import { ApiErrorResponse, ApiResultResponse } from '../../common/decorators';
import {
  DailySalesReportDto,
  ZReportDto,
  TopSellingItemDto,
  InventoryValuationDto,
} from './dto';

@ApiTags('Reports')
@ApiBearerAuth('JWT')
@ApiErrorResponse({ status: 401, description: 'Not authenticated' })
@ApiErrorResponse({ status: 403, description: 'Missing required permissions' })
@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) { }

  @Get('daily-sales')
  @Permissions(PERMISSIONS.REPORTS_SALES_VIEW) // 🔒 Manager+
  @ApiOperation({ summary: 'Get daily sales report', description: 'Generates daily sales summary. Manager+ required.' })
  @ApiQuery({ name: 'date', required: true, description: 'Date in ISO format (YYYY-MM-DD)' })
  @ApiResultResponse({
    status: 200,
    description: 'Daily sales report generated',
    type: DailySalesReportDto,
  })
  @ApiErrorResponse({ status: 400, description: 'Invalid date format' })
  async dailySales(@Query('date') date: string) {
    return this.service.generateDailySalesReport(new Date(date));
  }

  @Get('z-report/:sessionId')
  @Permissions(PERMISSIONS.REPORTS_SALES_VIEW) // 🔒 Manager+
  @ApiOperation({ summary: 'Generate Z-Report', description: 'Generates end-of-day Z-Report for session. Manager+ required.' })
  @ApiParam({ name: 'sessionId', description: 'Session UUID' })
  @ApiResultResponse({
    status: 200,
    description: 'Z-Report generated',
    type: ZReportDto,
  })
  @ApiErrorResponse({ status: 404, description: 'Session not found' })
  async zReport(@Param('sessionId') sessionId: string) {
    return this.service.generateZReport(sessionId);
  }

  @Get('top-selling')
  @Permissions(PERMISSIONS.REPORTS_SALES_VIEW) // 🔒 Manager+
  @ApiOperation({ summary: 'Get top selling items', description: 'Returns best-selling products in date range. Manager+ required.' })
  @ApiQuery({ name: 'startDate', required: true, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: true, description: 'End date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of items to return (default: 10)' })
  @ApiResultResponse({
    status: 200,
    description: 'Top selling items retrieved',
    type: TopSellingItemDto,
    isArray: true,
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
  @ApiOperation({ summary: 'Get inventory valuation', description: 'Returns current inventory value. Manager+ required.' })
  @ApiResultResponse({
    status: 200,
    description: 'Inventory valuation retrieved',
    type: InventoryValuationDto,
  })
  async inventoryValuation() {
    return this.service.getInventoryValuation();
  }
}

