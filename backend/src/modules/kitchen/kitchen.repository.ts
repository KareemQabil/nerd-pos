// Kitchen Repository
// Source: FINAL/BACKEND/08-MODULE-KITCHEN.md, 08-repository.md
//
// Type-safe repository using Prisma's generated types.
// No more `(this.prisma as any)` type casting!

import { Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { BaseRepository } from '../../core/repository/base.repository';
import { PrismaService } from '../../core/prisma/prisma.service';
import {
  KitchenTicket,
  KitchenTicketWithItems,
  KitchenTicketItem,
  KitchenStation,
} from './entities/kitchen.entity';

/**
 * Helper to get typed Prisma client
 * Provides direct access to all Prisma models with proper types
 */
function getTypedPrisma(prisma: PrismaService): PrismaClient {
  return prisma as PrismaClient;
}

@Injectable()
export class KitchenRepository extends BaseRepository<KitchenTicket> {
  private readonly prismaClient: PrismaClient;

  constructor(prisma: PrismaService) {
    super(prisma);
    this.prismaClient = getTypedPrisma(prisma);
  }

  protected get model() {
    return 'kitchenTicket';
  }

  // ==================== TICKETS ====================

  async findWithItems(id: string): Promise<KitchenTicketWithItems | null> {
    return this.prismaClient.kitchenTicket.findUnique({
      where: { id },
      include: { items: true, station: true },
    }) as Promise<KitchenTicketWithItems | null>;
  }

  async findByOrder(orderId: string): Promise<KitchenTicket[]> {
    return this.prismaClient.kitchenTicket.findMany({
      where: { orderId },
      include: { items: true },
    });
  }

  async findActive(stationId: string): Promise<KitchenTicketWithItems[]> {
    return this.prismaClient.kitchenTicket.findMany({
      where: {
        stationId,
        status: { in: ['NEW', 'PREPARING', 'READY'] },
      },
      include: { items: true, station: true },
      orderBy: [{ priority: 'desc' }, { receivedAt: 'asc' }],
    }) as Promise<KitchenTicketWithItems[]>;
  }

  async findByStation(
    stationId: string,
    status?: string,
  ): Promise<KitchenTicket[]> {
    const where: Prisma.KitchenTicketWhereInput = { stationId };
    if (status) {
      where.status = status;
    }
    return this.prismaClient.kitchenTicket.findMany({
      where,
      include: { items: true },
      orderBy: [{ priority: 'desc' }, { receivedAt: 'asc' }],
    });
  }

  async countByPrefix(prefix: string): Promise<number> {
    return this.prismaClient.kitchenTicket.count({
      where: { ticketNumber: { startsWith: prefix } },
    });
  }

  // ==================== TICKET ITEMS ====================

  async addItem(
    ticketId: string,
    data: Prisma.KitchenTicketItemCreateInput,
  ): Promise<KitchenTicketItem> {
    const { ticket, ...rest } = data as any;
    return this.prismaClient.kitchenTicketItem.create({
      data: {
        ...rest,
        ticket: { connect: { id: ticketId } },
      },
    });
  }

  async updateItem(
    itemId: string,
    data: Prisma.KitchenTicketItemUpdateInput,
  ): Promise<KitchenTicketItem> {
    return this.prismaClient.kitchenTicketItem.update({
      where: { id: itemId },
      data,
    });
  }

  async findItemsByTicket(ticketId: string): Promise<KitchenTicketItem[]> {
    return this.prismaClient.kitchenTicketItem.findMany({
      where: { ticketId },
    });
  }

  // ==================== STATIONS ====================

  async findAllStations(): Promise<KitchenStation[]> {
    return this.prismaClient.kitchenStation.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
    });
  }

  async findStationById(id: string): Promise<KitchenStation | null> {
    return this.prismaClient.kitchenStation.findUnique({
      where: { id },
    });
  }

  async findStationByCategory(
    categoryId: string,
  ): Promise<KitchenStation | null> {
    return this.prismaClient.kitchenStation.findFirst({
      where: {
        categoryIds: { has: categoryId },
        isActive: true,
      },
    });
  }

  async createStation(
    data: Prisma.KitchenStationCreateInput,
  ): Promise<KitchenStation> {
    return this.prismaClient.kitchenStation.create({ data });
  }

  async updateStation(
    id: string,
    data: Prisma.KitchenStationUpdateInput,
  ): Promise<KitchenStation> {
    return this.prismaClient.kitchenStation.update({
      where: { id },
      data,
    });
  }

  // ==================== STATISTICS ====================

  async getStationStats(stationId: string): Promise<{ tickets: Array<{ status: string; _count: { id: number } }> }> {
    const tickets = await this.prismaClient.kitchenTicket.groupBy({
      by: ['status'],
      where: { stationId },
      _count: { id: true },
    });

    return { tickets };
  }
}
