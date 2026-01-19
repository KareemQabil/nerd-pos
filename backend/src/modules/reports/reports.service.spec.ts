/**
 * Reports Service Unit Tests
 *
 * Tests for reporting service that generates sales, Z-reports, and analytics.
 * ReportsService uses Prisma directly with Decimal.js for calculations.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ReportsService } from './reports.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import Decimal from 'decimal.js';

function createMockPrisma() {
  return {
    order: {
      findMany: jest.fn(),
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
      prisma.order.findMany.mockResolvedValue([
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
      prisma.order.findMany.mockResolvedValue([]);

      const result = await service.generateDailySalesReport(
        new Date('2026-01-18'),
      );

      expect(result.totalSales).toBe(0);
      expect(result.totalTax).toBe(0);
      expect(result.orderCount).toBe(0);
      expect(result.averageOrderValue).toBe(0);
    });

    it('should filter by COMPLETED and PAID status', async () => {
      prisma.order.findMany.mockResolvedValue([]);

      await service.generateDailySalesReport(new Date('2026-01-18'));

      expect(prisma.order.findMany).toHaveBeenCalledWith({
        where: {
          createdAt: {
            gte: expect.any(Date),
            lte: expect.any(Date),
          },
          status: { in: ['COMPLETED', 'PAID'] },
        },
      });
    });

    it('should handle orders with null grandTotal', async () => {
      prisma.order.findMany.mockResolvedValue([
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
      prisma.session.findUnique.mockResolvedValue({
        id: 'session-1',
        sessionNumber: 'S-001',
        openedAt: new Date('2026-01-18T08:00:00'),
        closedAt: new Date('2026-01-18T22:00:00'),
        openingBalance: 500,
        closingBalance: 2500,
        variance: 0,
        totalSales: 2000,
        orderCount: 50,
      });

      const result = await service.generateZReport('session-1');

      expect(result).toEqual({
        sessionNumber: 'S-001',
        openedAt: expect.any(Date),
        closedAt: expect.any(Date),
        openingBalance: 500,
        closingBalance: 2500,
        variance: 0,
        totalSales: 2000,
        orderCount: 50,
      });
    });

    it('should return null for non-existent session', async () => {
      prisma.session.findUnique.mockResolvedValue(null);

      const result = await service.generateZReport('nonexistent');

      expect(result).toBeNull();
    });
  });

  // ==================== TOP SELLING ITEMS ====================
  describe('getTopSellingItems', () => {
    it('should return top selling products by quantity', async () => {
      prisma.orderItem.groupBy.mockResolvedValue([
        { productId: 'prod-1', _sum: { quantity: 100, total: 5000 } },
        { productId: 'prod-2', _sum: { quantity: 75, total: 3750 } },
        { productId: 'prod-3', _sum: { quantity: 50, total: 2500 } },
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
        _sum: { quantity: true, total: true },
        where: {
          order: {
            createdAt: {
              gte: expect.any(Date),
              lte: expect.any(Date),
            },
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
          quantity: null,
          cost: null,
          product: { name: 'Test' },
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
          quantity: 10,
          cost: 5,
          product: { name: 'Chicken Wings' },
        },
      ]);

      const result = await service.getInventoryValuation();

      expect(result.items[0].productName).toBe('Chicken Wings');
      expect(result.items[0].value).toBe(50);
    });
  });
});
