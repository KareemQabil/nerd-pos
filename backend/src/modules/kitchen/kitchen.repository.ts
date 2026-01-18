// Kitchen Repository
// Source: FINAL/BACKEND/08-MODULE-KITCHEN.md, 08-repository.md

import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../core/repository/base.repository';
import { PrismaService } from '../../core/prisma/prisma.service';
import { KitchenTicket, KitchenTicketWithItems, KitchenTicketItem, KitchenStation } from './entities/kitchen.entity';

@Injectable()
export class KitchenRepository extends BaseRepository<KitchenTicket> {
    constructor(prisma: PrismaService) {
        super(prisma);
    }

    protected get model() {
        return 'kitchenTicket';
    }

    // ==================== TICKETS ====================

    async findWithItems(id: string): Promise<KitchenTicketWithItems | null> {
        return (this.prisma as any).kitchenTicket.findUnique({
            where: { id },
            include: { items: true, station: true },
        });
    }

    async findByOrder(orderId: string): Promise<KitchenTicket[]> {
        return (this.prisma as any).kitchenTicket.findMany({
            where: { orderId },
            include: { items: true },
        });
    }

    async findActive(stationId: string): Promise<KitchenTicketWithItems[]> {
        return (this.prisma as any).kitchenTicket.findMany({
            where: {
                stationId,
                status: { in: ['NEW', 'PREPARING', 'READY'] },
            },
            include: { items: true, station: true },
            orderBy: [{ priority: 'desc' }, { receivedAt: 'asc' }],
        });
    }

    async findByStation(stationId: string, status?: string): Promise<KitchenTicket[]> {
        const where: { stationId: string; status?: string } = { stationId };
        if (status) {
            where.status = status;
        }
        return (this.prisma as any).kitchenTicket.findMany({
            where,
            include: { items: true },
            orderBy: [{ priority: 'desc' }, { receivedAt: 'asc' }],
        });
    }

    async countByPrefix(prefix: string): Promise<number> {
        return (this.prisma as any).kitchenTicket.count({
            where: { ticketNumber: { startsWith: prefix } },
        });
    }

    // ==================== TICKET ITEMS ====================

    async addItem(ticketId: string, data: Omit<KitchenTicketItem, 'id' | 'ticketId'>): Promise<KitchenTicketItem> {
        return (this.prisma as any).kitchenTicketItem.create({
            data: { ...data, ticketId },
        });
    }

    async updateItem(itemId: string, data: Partial<KitchenTicketItem>): Promise<KitchenTicketItem> {
        return (this.prisma as any).kitchenTicketItem.update({
            where: { id: itemId },
            data,
        });
    }

    async findItemsByTicket(ticketId: string): Promise<KitchenTicketItem[]> {
        return (this.prisma as any).kitchenTicketItem.findMany({
            where: { ticketId },
        });
    }

    // ==================== STATIONS ====================

    async findAllStations(): Promise<KitchenStation[]> {
        return (this.prisma as any).kitchenStation.findMany({
            where: { isActive: true },
            orderBy: { displayOrder: 'asc' },
        });
    }

    async findStationById(id: string): Promise<KitchenStation | null> {
        return (this.prisma as any).kitchenStation.findUnique({
            where: { id },
        });
    }

    async findStationByCategory(categoryId: string): Promise<KitchenStation | null> {
        return (this.prisma as any).kitchenStation.findFirst({
            where: {
                categoryIds: { has: categoryId },
                isActive: true,
            },
        });
    }

    async createStation(data: Omit<KitchenStation, 'id'>): Promise<KitchenStation> {
        return (this.prisma as any).kitchenStation.create({ data });
    }

    async updateStation(id: string, data: Partial<KitchenStation>): Promise<KitchenStation> {
        return (this.prisma as any).kitchenStation.update({
            where: { id },
            data,
        });
    }

    // ==================== STATISTICS ====================

    async getStationStats(stationId: string): Promise<any> {
        const tickets = await (this.prisma as any).kitchenTicket.groupBy({
            by: ['status'],
            where: { stationId },
            _count: { id: true },
        });

        const avgPrepTime = await (this.prisma as any).kitchenTicket.aggregate({
            where: {
                stationId,
                status: 'COMPLETED',
                startedAt: { not: null },
                completedAt: { not: null },
            },
            _avg: {
                // This would need raw SQL for proper calculation
            },
        });

        return { tickets };
    }
}
