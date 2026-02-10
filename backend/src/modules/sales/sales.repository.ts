// Sales Repository
// Source: FINAL/BACKEND/05-MODULE-SALES.md, 01-create-module workflow
// Aligned with: prisma/schema.prisma
// Sprint 4: Added optional transaction client support for ACID compliance
// BLOCK 3 FIX: Replaced magic strings with OrderStatus enum
//
// Type-safe repository using Prisma's generated types.
// No more `(this.prisma as any)` type casting!

import { Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { BaseRepository } from '../../core/repository/base.repository';
import { PrismaService } from '../../core/prisma/prisma.service';
import {
  SalesOrder,
  SalesOrderWithItems,
  OrderItem,
  CreateOrderData,
  CreateOrderItemData,
  Decimal,
} from './entities/sales.entity';
import { OrderStatus, KitchenItemStatus } from '../../core/constants/enums';
import {
  PaginationOptions,
  PaginatedResult,
} from '../../core/interfaces/pagination.interface';

/**
 * Helper to get typed Prisma client
 * Provides direct access to all Prisma models with proper types
 */
function getTypedPrisma(prisma: PrismaService): PrismaClient {
  return prisma as PrismaClient;
}

/**
 * Type alias for transaction client
 * Using Prisma's generated types for type safety
 */
type TxClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

@Injectable()
export class SalesRepository extends BaseRepository<SalesOrder, 'salesOrder'> {
  private readonly prismaClient: PrismaClient;

  constructor(prisma: PrismaService) {
    super(prisma);
    this.prismaClient = getTypedPrisma(prisma);
  }

  protected get model(): 'salesOrder' {
    return 'salesOrder';
  }

  // ==================== ORDER ====================

  async findWithItems(id: string): Promise<SalesOrderWithItems | null> {
    return this.prismaClient.salesOrder.findUnique({
      where: { id },
      include: {
        items: {
          include: { modifiers: true },
        },
        payments: true,
      },
    }) as Promise<SalesOrderWithItems | null>;
  }

  async findByOrderNumber(
    orderNumber: string,
  ): Promise<SalesOrderWithItems | null> {
    return this.prismaClient.salesOrder.findUnique({
      where: { orderNumber },
      include: {
        items: {
          include: { modifiers: true },
        },
        payments: true,
      },
    }) as Promise<SalesOrderWithItems | null>;
  }

  async findBySession(sessionId: string): Promise<SalesOrder[]> {
    return this.prismaClient.salesOrder.findMany({
      where: { sessionId },
      orderBy: { orderDate: 'desc' },
    });
  }

  // FORENSIC AUDIT FIX: Used by SessionsService to check for pending DRAFT orders
  async findBySessionAndStatus(
    sessionId: string,
    status: OrderStatus,
  ): Promise<SalesOrder[]> {
    return this.prismaClient.salesOrder.findMany({
      where: { sessionId, status },
    });
  }

  // NOTE: findByCustomer is disabled - customerId field not in Prisma schema
  // SalesOrder only has sessionId relation, not direct customerId
  // TODO: Add customerId field to schema if needed, or query through sessionId
  /*
  async findByCustomer(customerId: string): Promise<SalesOrder[]> {
    return this.prismaClient.salesOrder.findMany({
      where: { customerId },
      orderBy: { orderDate: 'desc' },
      take: 50,
    });
  }
  */

  async findByStatus(status: string): Promise<SalesOrder[]> {
    return this.prismaClient.salesOrder.findMany({
      where: { status },
      orderBy: { orderDate: 'desc' },
    });
  }

  // PAGINATION FIX: Paginated version for API endpoints
  async findByStatusPaginated(
    status: string,
    options: PaginationOptions,
  ): Promise<PaginatedResult<SalesOrder>> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.SalesOrderWhereInput = status ? { status } : {};

    const [data, total] = await Promise.all([
      this.prismaClient.salesOrder.findMany({
        where,
        orderBy: { orderDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prismaClient.salesOrder.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findByDateRange(start: Date, end: Date): Promise<SalesOrder[]> {
    return this.prismaClient.salesOrder.findMany({
      where: {
        orderDate: { gte: start, lte: end },
      },
      orderBy: { orderDate: 'desc' },
    });
  }

  // FORENSIC AUDIT FIX: Paginated date range for reports
  async findByDateRangePaginated(
    start: Date,
    end: Date,
    options: PaginationOptions,
  ): Promise<PaginatedResult<SalesOrder>> {
    const page = options.page || 1;
    const limit = options.limit || 50;
    const skip = (page - 1) * limit;

    const where: Prisma.SalesOrderWhereInput = {
      orderDate: { gte: start, lte: end },
    };

    const [data, total] = await Promise.all([
      this.prismaClient.salesOrder.findMany({
        where,
        orderBy: { orderDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prismaClient.salesOrder.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async countByPrefix(prefix: string): Promise<number> {
    return this.prismaClient.salesOrder.count({
      where: { orderNumber: { startsWith: prefix } },
    });
  }

  async createWithItems(
    data: Prisma.SalesOrderCreateInput,
    items: any[], // Use any for nested creates (order relation is implicit)
    tx?: TxClient,
  ): Promise<SalesOrderWithItems> {
    const client = tx || this.prismaClient;
    return client.salesOrder.create({
      data: {
        ...data,
        items: {
          create: items,
        },
      },
      include: {
        items: true,
      },
    }) as Promise<SalesOrderWithItems>;
  }

  // ==================== ORDER ITEMS ====================

  async addItem(
    orderId: string,
    item: Prisma.OrderItemUncheckedCreateInput,
    tx?: TxClient,
  ): Promise<OrderItem> {
    const client = tx || this.prismaClient;
    // Remove orderId from item if present, then add it back
    const { orderId: _orderId, ...itemData } = item;
    return client.orderItem.create({
      data: {
        ...itemData,
        orderId,
      },
      include: { modifiers: true },
    }) as Promise<OrderItem>;
  }

  async updateItem(
    itemId: string,
    data: Prisma.OrderItemUncheckedUpdateInput,
    tx?: TxClient,
  ): Promise<OrderItem> {
    const client = tx || this.prismaClient;
    return client.orderItem.update({
      where: { id: itemId },
      data,
      include: { modifiers: true },
    }) as Promise<OrderItem>;
  }

  async removeItem(itemId: string): Promise<void> {
    // First delete modifiers
    await this.prismaClient.orderItemModifier.deleteMany({
      where: { orderItemId: itemId },
    });
    // Then delete item
    await this.prismaClient.orderItem.delete({
      where: { id: itemId },
    });
  }

  async getOrderItems(orderId: string): Promise<OrderItem[]> {
    return this.prismaClient.orderItem.findMany({
      where: { orderId },
      include: { modifiers: true },
    }) as Promise<OrderItem[]>;
  }

  // ==================== STATISTICS ====================

  async getDailySalesTotal(date: Date): Promise<Decimal | number> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const result = await this.prismaClient.salesOrder.aggregate({
      where: {
        status: OrderStatus.COMPLETED,
        completedAt: { gte: startOfDay, lte: endOfDay },
      },
      _sum: { grandTotal: true },
    });

    return result._sum.grandTotal || 0;
  }

  async getDailyOrderCount(date: Date): Promise<number> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return this.prismaClient.salesOrder.count({
      where: {
        status: { not: OrderStatus.CANCELLED },
        orderDate: { gte: startOfDay, lte: endOfDay },
      },
    });
  }
}
