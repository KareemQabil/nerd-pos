/**
 * Workflow 16: Daily Sales Report
 *
 * Source: WORKFLOWS.md - Reporting Workflows
 * Note: ReportsService uses Prisma directly, so we mock Prisma
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ReportsService } from '../../../../src/modules/reports/reports.service';
import { PrismaService } from '../../../../src/core/prisma/prisma.service';

function createMockPrisma() {
  return {
    order: {
      findMany: jest.fn(),
      aggregate: jest.fn(),
    },
    session: {
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

describe('Workflow 16: Daily Sales Report', () => {
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

  // ==================== 16.1: DAILY SALES REPORT ====================
  describe('16.1: Daily Sales Report', () => {
    it('should generate daily sales report', async () => {
      prisma.order.findMany.mockResolvedValue([
        {
          id: 'order-1',
          grandTotal: 150,
          taxAmount: 22.5,
          status: 'COMPLETED',
        },
        { id: 'order-2', grandTotal: 200, taxAmount: 30, status: 'COMPLETED' },
        { id: 'order-3', grandTotal: 100, taxAmount: 15, status: 'COMPLETED' },
      ]);

      const result = await service.generateDailySalesReport(new Date());

      expect(result.totalSales).toBe(450);
      expect(result.totalTax).toBe(67.5);
      expect(result.orderCount).toBe(3);
      expect(result.averageOrderValue).toBe(150);
    });

    it('should handle no orders for day', async () => {
      prisma.order.findMany.mockResolvedValue([]);

      const result = await service.generateDailySalesReport(new Date());

      expect(result.totalSales).toBe(0);
      expect(result.orderCount).toBe(0);
      expect(result.averageOrderValue).toBe(0);
    });
  });

  // ==================== 16.2: Z-REPORT ====================
  describe('16.2: Z-Report', () => {
    it('should generate Z-report for session', async () => {
      prisma.session.findUnique.mockResolvedValue({
        id: 'session-1',
        sessionNumber: 'S-001',
        openedAt: new Date('2026-01-18T08:00:00'),
        closedAt: new Date('2026-01-18T20:00:00'),
        openingBalance: 500,
        closingBalance: 2500,
        variance: 0,
        totalSales: 2000,
        orderCount: 25,
      });

      const result = await service.generateZReport('session-1');

      expect(result.sessionNumber).toBe('S-001');
      expect(result.totalSales).toBe(2000);
      expect(result.orderCount).toBe(25);
    });

    it('should return null for missing session', async () => {
      prisma.session.findUnique.mockResolvedValue(null);

      const result = await service.generateZReport('nonexistent');

      expect(result).toBeNull();
    });
  });

  // ==================== 16.3: TOP SELLING ITEMS ====================
  describe('16.3: Top Selling Items', () => {
    it('should get top selling items', async () => {
      prisma.orderItem.groupBy.mockResolvedValue([
        { productId: 'prod-1', _sum: { quantity: 50, total: 2500 } },
        { productId: 'prod-2', _sum: { quantity: 35, total: 1750 } },
        { productId: 'prod-3', _sum: { quantity: 25, total: 1000 } },
      ]);

      const result = await service.getTopSellingItems(
        new Date('2026-01-01'),
        new Date('2026-01-18'),
        10,
      );

      expect(result).toHaveLength(3);
      expect(result[0]._sum.quantity).toBe(50);
    });
  });

  // ==================== 16.4: INVENTORY VALUATION ====================
  describe('16.4: Inventory Valuation', () => {
    it('should get inventory valuation', async () => {
      prisma.inventoryItem.findMany.mockResolvedValue([
        {
          productId: 'prod-1',
          quantity: 100,
          cost: 10,
          product: { name: 'Chicken' },
        },
        {
          productId: 'prod-2',
          quantity: 50,
          cost: 20,
          product: { name: 'Beef' },
        },
      ]);

      const result = await service.getInventoryValuation();

      expect(result.totalValue).toBe(2000); // 100*10 + 50*20
      expect(result.itemCount).toBe(2);
    });
  });
});
