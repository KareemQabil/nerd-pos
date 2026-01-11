// Sales Repository
// Source: FINAL/BACKEND/05-MODULE-SALES.md, 01-create-module workflow
// Aligned with: prisma/schema.prisma

import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../core/repository/base.repository';
import { PrismaService } from '../../core/prisma/prisma.service';
import {
    SalesOrder,
    SalesOrderWithItems,
    OrderItem,
} from './entities/sales.entity';

@Injectable()
export class SalesRepository extends BaseRepository<SalesOrder> {
    constructor(prisma: PrismaService) {
        super(prisma);
    }

    protected get model() {
        return 'salesOrder';
    }

    // ==================== ORDER ====================

    async findWithItems(id: string): Promise<SalesOrderWithItems | null> {
        return (this.prisma as any).salesOrder.findUnique({
            where: { id },
            include: {
                items: {
                    include: { modifiers: true },
                },
                payments: true,
            },
        });
    }

    async findByOrderNumber(orderNumber: string): Promise<SalesOrderWithItems | null> {
        return (this.prisma as any).salesOrder.findUnique({
            where: { orderNumber },
            include: {
                items: {
                    include: { modifiers: true },
                },
                payments: true,
            },
        });
    }

    async findBySession(sessionId: string): Promise<SalesOrder[]> {
        return (this.prisma as any).salesOrder.findMany({
            where: { sessionId },
            orderBy: { orderDate: 'desc' },
        });
    }

    async findByCustomer(customerId: string): Promise<SalesOrder[]> {
        return (this.prisma as any).salesOrder.findMany({
            where: { customerId },
            orderBy: { orderDate: 'desc' },
            take: 50,
        });
    }

    async findByStatus(status: string): Promise<SalesOrder[]> {
        return (this.prisma as any).salesOrder.findMany({
            where: { status },
            orderBy: { orderDate: 'desc' },
        });
    }

    async findByDateRange(start: Date, end: Date): Promise<SalesOrder[]> {
        return (this.prisma as any).salesOrder.findMany({
            where: {
                orderDate: { gte: start, lte: end },
            },
            orderBy: { orderDate: 'desc' },
        });
    }

    async countByPrefix(prefix: string): Promise<number> {
        return (this.prisma as any).salesOrder.count({
            where: { orderNumber: { startsWith: prefix } },
        });
    }

    async createWithItems(data: any, items: any[]): Promise<SalesOrderWithItems> {
        return (this.prisma as any).salesOrder.create({
            data: {
                ...data,
                items: {
                    create: items.map((item) => ({
                        ...item,
                        modifiers: item.modifiers
                            ? { create: item.modifiers }
                            : undefined,
                    })),
                },
            },
            include: {
                items: {
                    include: { modifiers: true },
                },
            },
        });
    }

    // ==================== ORDER ITEMS ====================

    async addItem(orderId: string, item: any): Promise<OrderItem> {
        return (this.prisma as any).salesOrderItem.create({
            data: {
                ...item,
                orderId,
                modifiers: item.modifiers
                    ? { create: item.modifiers }
                    : undefined,
            },
            include: { modifiers: true },
        });
    }

    async updateItem(itemId: string, data: Partial<OrderItem>): Promise<OrderItem> {
        return (this.prisma as any).salesOrderItem.update({
            where: { id: itemId },
            data,
            include: { modifiers: true },
        });
    }

    async removeItem(itemId: string): Promise<void> {
        // First delete modifiers
        await (this.prisma as any).salesOrderItemModifier.deleteMany({
            where: { orderItemId: itemId },
        });
        // Then delete item
        await (this.prisma as any).salesOrderItem.delete({
            where: { id: itemId },
        });
    }

    async getOrderItems(orderId: string): Promise<OrderItem[]> {
        return (this.prisma as any).salesOrderItem.findMany({
            where: { orderId },
            include: { modifiers: true },
        });
    }

    // ==================== STATISTICS ====================

    async getDailySalesTotal(date: Date): Promise<number> {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const result = await (this.prisma as any).salesOrder.aggregate({
            where: {
                status: 'COMPLETED',
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

        return (this.prisma as any).salesOrder.count({
            where: {
                status: { not: 'CANCELLED' },
                orderDate: { gte: startOfDay, lte: endOfDay },
            },
        });
    }
}
