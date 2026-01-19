// Reports Service
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import Decimal from 'decimal.js';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async generateDailySalesReport(date: Date): Promise<any> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const orders = await (this.prisma as any).order.findMany({
      where: {
        createdAt: { gte: startOfDay, lte: endOfDay },
        status: { in: ['COMPLETED', 'PAID'] },
      },
    });

    const totalSales = orders.reduce(
      (sum: Decimal, o: any) => sum.plus(new Decimal(o.grandTotal || 0)),
      new Decimal(0),
    );
    const totalTax = orders.reduce(
      (sum: Decimal, o: any) => sum.plus(new Decimal(o.taxAmount || 0)),
      new Decimal(0),
    );

    return {
      date: date.toISOString().split('T')[0],
      totalSales: totalSales.toNumber(),
      totalTax: totalTax.toNumber(),
      orderCount: orders.length,
      averageOrderValue: orders.length
        ? totalSales.dividedBy(orders.length).toNumber()
        : 0,
    };
  }

  async generateZReport(sessionId: string): Promise<any> {
    const session = await (this.prisma as any).session.findUnique({
      where: { id: sessionId },
    });
    if (!session) return null;
    return {
      sessionNumber: session.sessionNumber,
      openedAt: session.openedAt,
      closedAt: session.closedAt,
      openingBalance: session.openingBalance,
      closingBalance: session.closingBalance,
      variance: session.variance,
      totalSales: session.totalSales,
      orderCount: session.orderCount,
    };
  }

  async getTopSellingItems(
    startDate: Date,
    endDate: Date,
    limit = 10,
  ): Promise<any[]> {
    // Simplified - would use aggregation in production
    const items = await (this.prisma as any).orderItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true, total: true },
      where: { order: { createdAt: { gte: startDate, lte: endDate } } },
      orderBy: { _sum: { quantity: 'desc' } },
      take: limit,
    });
    return items;
  }

  async getInventoryValuation(): Promise<any> {
    const items = await (this.prisma as any).inventoryItem.findMany({
      include: { product: true },
    });
    const valuation = items.map((i: any) => ({
      productId: i.productId,
      productName: i.product?.name,
      quantity: i.quantity,
      cost: i.cost,
      value: new Decimal(i.quantity || 0)
        .times(new Decimal(i.cost || 0))
        .toNumber(),
    }));
    const totalValue = valuation.reduce(
      (sum: Decimal, v: any) => sum.plus(v.value),
      new Decimal(0),
    );
    return {
      totalValue: totalValue.toNumber(),
      itemCount: valuation.length,
      items: valuation,
    };
  }
}
