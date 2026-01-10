// Reports Controller
import { Controller, Get, Query, Param } from '@nestjs/common';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
    constructor(private readonly service: ReportsService) { }

    @Get('daily-sales')
    async dailySales(@Query('date') date: string) { return this.service.generateDailySalesReport(new Date(date)); }

    @Get('z-report/:sessionId')
    async zReport(@Param('sessionId') sessionId: string) { return this.service.generateZReport(sessionId); }

    @Get('top-selling')
    async topSelling(@Query('startDate') start: string, @Query('endDate') end: string, @Query('limit') limit?: number) {
        return this.service.getTopSellingItems(new Date(start), new Date(end), limit || 10);
    }

    @Get('inventory-valuation')
    async inventoryValuation() { return this.service.getInventoryValuation(); }
}
