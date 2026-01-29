// Reports Service
// BLOCK 3 FIX: Replaced magic strings with OrderStatus enum
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { OrderStatus } from '../../core/constants/enums';
import Decimal from 'decimal.js';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) { }

  async generateDailySalesReport(date: Date): Promise<any> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const orders = await (this.prisma as any).salesOrder.findMany({
      where: {
        orderDate: { gte: startOfDay, lte: endOfDay },
        status: { in: [OrderStatus.COMPLETED, OrderStatus.PAID] },
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
    const session = await (this.prisma as any).registerSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const cashSales = new Decimal(session.totalCashSales || 0);
    const cardSales = new Decimal(session.totalCardSales || 0);
    const otherSales = new Decimal(session.totalOtherSales || 0);
    const refunds = new Decimal(session.totalRefunds || 0);
    const totalSales = cashSales.plus(cardSales).plus(otherSales);

    return {
      sessionId: session.id,
      sessionNumber: session.id,
      openedAt: session.openedAt,
      closedAt: session.closedAt,
      openingBalance: session.openingBalance,
      closingBalance: session.actualClosingBalance,
      expectedBalance: session.expectedCash,
      variance: session.discrepancy,
      totalSales: totalSales.toNumber(),
      cashSales: cashSales.toNumber(),
      cardSales: cardSales.toNumber(),
      otherSales: otherSales.toNumber(),
      refunds: refunds.toNumber(),
      orderCount: session.ordersCount,
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
      _sum: { quantity: true, lineTotal: true },
      where: {
        order: {
          orderDate: { gte: startDate, lte: endDate },
          status: { in: [OrderStatus.COMPLETED, OrderStatus.PAID] },
        },
      },
      orderBy: { _sum: { quantity: 'desc' } },
      take: limit,
    });
    return items;
  }

  async getInventoryValuation(): Promise<any> {
    const items = await (this.prisma as any).inventoryItem.findMany({
      include: { product: true },
    });
    const valuation = items.map((i: any) => {
      const quantity = new Decimal(i.quantityOnHand || 0);
      const cost = new Decimal(i.averageCost || 0);
      return {
        productId: i.productId,
        productName: i.product?.nameEn || i.product?.nameAr || null,
        quantity: quantity.toNumber(),
        cost: cost.toNumber(),
        value: quantity.times(cost).toNumber(),
      };
    });
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
