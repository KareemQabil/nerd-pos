// Reports Controller
// Security: Block 2 - All endpoints secured with @Permissions

import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../../core/constants/permissions';

@ApiTags('Reports')
@ApiBearerAuth('JWT')
@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) { }

  @Permissions(PERMISSIONS.REPORTS_SALES_VIEW) // 🔒 Manager+
  @Get('daily-sales')
  async dailySales(@Query('date') date: string) {
    return this.service.generateDailySalesReport(new Date(date));
  }

  @Permissions(PERMISSIONS.REPORTS_SALES_VIEW) // 🔒 Manager+
  @Get('z-report/:sessionId')
  async zReport(@Param('sessionId') sessionId: string) {
    return this.service.generateZReport(sessionId);
  }

  @Permissions(PERMISSIONS.REPORTS_SALES_VIEW) // 🔒 Manager+
  @Get('top-selling')
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

  @Permissions(PERMISSIONS.REPORTS_INVENTORY_VIEW) // 🔒 Manager+
  @Get('inventory-valuation')
  async inventoryValuation() {
    return this.service.getInventoryValuation();
  }
}
