/**
 * Reports Service Unit Tests
 *
 * Tests for reporting service that generates sales, Z-reports, and analytics.
 * ReportsService uses Prisma directly with Decimal.js for calculations.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundAppException } from '../../common/exceptions';
import { ReportsService } from './reports.service';
import { PrismaService } from '../../core/prisma/prisma.service';

function createMockPrisma() {
  return {
    salesOrder: {
      findMany: jest.fn(),
    },
    registerSession: {
      findUnique: jest.fn(),
    },
    orderItem: {
      groupBy: jest.fn(),
    },
    inventoryItem: {
      findMany: jest.fn(),
    },
  };
}

describe('ReportsService', () => {
  let service: ReportsService;
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(async () => {
    prisma = createMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [ReportsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
  });

  afterEach(() => jest.clearAllMocks());

  // ==================== DAILY SALES REPORT ====================
  describe('generateDailySalesReport', () => {
    it('should calculate total sales and tax using Decimal.js', async () => {
      prisma.salesOrder.findMany.mockResolvedValue([
        { id: 'order-1', grandTotal: 100, taxAmount: 15, status: 'COMPLETED' },
        { id: 'order-2', grandTotal: 200, taxAmount: 30, status: 'COMPLETED' },
        { id: 'order-3', grandTotal: 150, taxAmount: 22.5, status: 'PAID' },
      ]);

      const result = await service.generateDailySalesReport(
        new Date('2026-01-18'),
      );

      expect(result.totalSales).toBe(450);
      expect(result.totalTax).toBe(67.5);
      expect(result.orderCount).toBe(3);
      expect(result.averageOrderValue).toBe(150);
      expect(result.date).toBe('2026-01-18');
    });

    it('should handle no orders for the day', async () => {
      prisma.salesOrder.findMany.mockResolvedValue([]);

      const result = await service.generateDailySalesReport(
        new Date('2026-01-18'),
      );

      expect(result.totalSales).toBe(0);
      expect(result.totalTax).toBe(0);
      expect(result.orderCount).toBe(0);
      expect(result.averageOrderValue).toBe(0);
    });

    it('should filter by COMPLETED and PAID status', async () => {
      prisma.salesOrder.findMany.mockResolvedValue([]);

      await service.generateDailySalesReport(new Date('2026-01-18'));

      expect(prisma.salesOrder.findMany).toHaveBeenCalledWith({
        where: {
          orderDate: {
            gte: expect.any(Date),
            lte: expect.any(Date),
          },
          status: { in: ['COMPLETED', 'PAID'] },
        },
      });
    });

    it('should handle orders with null grandTotal', async () => {
      prisma.salesOrder.findMany.mockResolvedValue([
        {
          id: 'order-1',
          grandTotal: null,
          taxAmount: null,
          status: 'COMPLETED',
        },
      ]);

      const result = await service.generateDailySalesReport(
        new Date('2026-01-18'),
      );

      expect(result.totalSales).toBe(0);
      expect(result.orderCount).toBe(1);
    });
  });

  // ==================== Z-REPORT ====================
  describe('generateZReport', () => {
    it('should return session summary as Z-report', async () => {
      prisma.registerSession.findUnique.mockResolvedValue({
        id: 'session-1',
        openedAt: new Date('2026-01-18T08:00:00'),
        closedAt: new Date('2026-01-18T22:00:00'),
        openingBalance: 500,
        actualClosingBalance: 2500,
        expectedCash: 2500,
        discrepancy: 0,
        totalCashSales: 1200,
        totalCardSales: 700,
        totalOtherSales: 100,
        totalRefunds: 0,
        ordersCount: 50,
      });

      const result = await service.generateZReport('session-1');

      expect(result).toEqual({
        sessionId: 'session-1',
        sessionNumber: 'session-1',
        openedAt: expect.any(Date),
        closedAt: expect.any(Date),
        openingBalance: 500,
        closingBalance: 2500,
        expectedBalance: 2500,
        variance: 0,
        totalSales: 2000,
        cashSales: 1200,
        cardSales: 700,
        otherSales: 100,
        refunds: 0,
        orderCount: 50,
      });
    });

    it('should throw NotFoundException for non-existent session', async () => {
      prisma.registerSession.findUnique.mockResolvedValue(null);

      await expect(service.generateZReport('nonexistent')).rejects.toThrow(
        NotFoundAppException,
      );
    });
  });

  // ==================== TOP SELLING ITEMS ====================
  describe('getTopSellingItems', () => {
    it('should return top selling products by quantity', async () => {
      prisma.orderItem.groupBy.mockResolvedValue([
        { productId: 'prod-1', _sum: { quantity: 100, lineTotal: 5000 } },
        { productId: 'prod-2', _sum: { quantity: 75, lineTotal: 3750 } },
        { productId: 'prod-3', _sum: { quantity: 50, lineTotal: 2500 } },
      ]);

      const result = await service.getTopSellingItems(
        new Date('2026-01-01'),
        new Date('2026-01-18'),
        10,
      );

      expect(result).toHaveLength(3);
      expect(result[0]._sum.quantity).toBe(100);
    });

    it('should respect limit parameter', async () => {
      prisma.orderItem.groupBy.mockResolvedValue([
        { productId: 'prod-1', _sum: { quantity: 100 } },
      ]);

      await service.getTopSellingItems(
        new Date('2026-01-01'),
        new Date('2026-01-18'),
        5,
      );

      expect(prisma.orderItem.groupBy).toHaveBeenCalledWith({
        by: ['productId'],
        _sum: { quantity: true, lineTotal: true },
        where: {
          order: {
            orderDate: {
              gte: expect.any(Date),
              lte: expect.any(Date),
            },
            status: { in: ['COMPLETED', 'PAID'] },
          },
        },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      });
    });
  });

  // ==================== INVENTORY VALUATION ====================
  describe('getInventoryValuation', () => {
    it('should calculate total inventory value using Decimal.js', async () => {
      prisma.inventoryItem.findMany.mockResolvedValue([
        {
          productId: 'prod-1',
          quantityOnHand: 100,
          averageCost: 10,
          product: { nameEn: 'Chicken' },
        },
        {
          productId: 'prod-2',
          quantityOnHand: 50,
          averageCost: 20,
          product: { nameEn: 'Beef' },
        },
      ]);

      const result = await service.getInventoryValuation();

      expect(result.totalValue).toBe(2000); // 100*10 + 50*20
      expect(result.itemCount).toBe(2);
      expect(result.items).toHaveLength(2);
    });

    it('should handle empty inventory', async () => {
      prisma.inventoryItem.findMany.mockResolvedValue([]);

      const result = await service.getInventoryValuation();

      expect(result.totalValue).toBe(0);
      expect(result.itemCount).toBe(0);
      expect(result.items).toHaveLength(0);
    });

    it('should handle null quantity or cost', async () => {
      prisma.inventoryItem.findMany.mockResolvedValue([
        {
          productId: 'prod-1',
          quantityOnHand: null,
          averageCost: null,
          product: { nameEn: 'Test' },
        },
      ]);

      const result = await service.getInventoryValuation();

      expect(result.totalValue).toBe(0);
      expect(result.items[0].value).toBe(0);
    });

    it('should include product name in valuation', async () => {
      prisma.inventoryItem.findMany.mockResolvedValue([
        {
          productId: 'prod-1',
          quantityOnHand: 10,
          averageCost: 5,
          product: { nameEn: 'Chicken Wings' },
        },
      ]);

      const result = await service.getInventoryValuation();

      expect(result.items[0].productName).toBe('Chicken Wings');
      expect(result.items[0].value).toBe(50);
    });
  });
});
