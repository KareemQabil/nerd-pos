// Kitchen Service
// Source: FINAL/BACKEND/08-MODULE-KITCHEN.md
// Handles: Ticket routing, preparation tracking, bump bar, station management

import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { KitchenRepository } from './kitchen.repository';
import { PrismaService } from '../../core/prisma/prisma.service';
import { IEventBus } from '../../core/event-bus/event-bus.interface';
import { KitchenGateway } from './kitchen.gateway';
import { CreateKitchenStationDto, UpdateKitchenStationDto } from './dto';
import {
  TicketCreatedEvent,
  TicketStartedEvent,
  TicketCompletedEvent,
  ItemBumpedEvent,
  OrderPreparedEvent,
} from './events/kitchen.events';
import {
  KitchenTicket,
  KitchenTicketWithItems,
  KitchenStation,
} from './entities/kitchen.entity';

@Injectable()
export class KitchenService {
  constructor(
    private readonly repo: KitchenRepository,
    private readonly prisma: PrismaService,
    @Inject('IEventBus') private readonly eventBus: IEventBus,
    private readonly websocketGateway: KitchenGateway,
  ) {}

  // ==================== TICKET ROUTING ====================

  async routeOrderToKitchen(
    orderId: string,
    items: Array<{
      productId: string;
      productName: string;
      productNameAr: string;
      categoryId: string;
      quantity: number;
      notes?: string;
      modifiers?: string[];
    }>,
    orderType: string,
  ): Promise<KitchenTicket[]> {
    // Group items by station based on category (read-only, outside TX)
    const itemsByStation = await this.groupItemsByStation(items);

    // AUDIT FIX: Wrap all DB writes in transaction for ACID atomicity
    const tickets = await this.prisma.$transaction(async (tx) => {
      const createdTickets: KitchenTicket[] = [];

      for (const [stationId, stationItems] of itemsByStation.entries()) {
        const ticketNumber = await this.generateTicketNumber();
        const priority = this.calculatePriority(orderType);

        // Create ticket using transaction client
        const ticket = await (tx as any).kitchenTicket.create({
          data: {
            ticketNumber,
            orderId,
            stationId,
            priority,
            status: 'NEW',
            receivedAt: new Date(),
          },
        });

        // Add items to ticket atomically
        for (const item of stationItems) {
          await (tx as any).kitchenTicketItem.create({
            data: {
              ticketId: ticket.id,
              productId: item.productId,
              productName: item.productName,
              productNameAr: item.productNameAr,
              quantity: item.quantity,
              notes: item.notes,
              modifiers: item.modifiers || [],
              status: 'NEW',
            },
          });
        }

        createdTickets.push(ticket);
      }

      return createdTickets;
    });

    // Emit events AFTER transaction commits (side effects outside TX)
    for (const ticket of tickets) {
      this.websocketGateway.emitToStation(
        ticket.stationId,
        'newTicket',
        ticket,
      );
      await this.eventBus.publish(
        'TicketCreated',
        new TicketCreatedEvent(ticket.id, ticket.stationId, orderId),
      );
    }

    return tickets;
  }

  private async groupItemsByStation(
    items: Array<{ categoryId: string; [key: string]: any }>,
  ): Promise<Map<string, any[]>> {
    const grouped = new Map<string, any[]>();

    for (const item of items) {
      const station = await this.repo.findStationByCategory(item.categoryId);

      if (!station) {
        // Default to first station if no mapping found
        const allStations = await this.repo.findAllStations();
        if (allStations.length > 0) {
          if (!grouped.has(allStations[0].id)) {
            grouped.set(allStations[0].id, []);
          }
          grouped.get(allStations[0].id)!.push(item);
        }
        continue;
      }

      if (!grouped.has(station.id)) {
        grouped.set(station.id, []);
      }
      grouped.get(station.id)!.push(item);
    }

    return grouped;
  }

  private calculatePriority(orderType: string): number {
    // Dine-in orders are higher priority
    if (orderType === 'DINE_IN') {
      return 100;
    }
    // Takeaway/Delivery
    if (orderType === 'DELIVERY') {
      return 80;
    }
    // Default
    return 50;
  }

  // ==================== TICKET STATUS ====================

  async startPreparation(ticketId: string): Promise<KitchenTicket> {
    const ticket = await this.repo.findById(ticketId);
    if (!ticket) {
      throw new NotFoundException(`Ticket ${ticketId} not found`);
    }

    const updatedTicket = await this.repo.update(ticketId, {
      status: 'PREPARING',
      startedAt: new Date(),
    });

    // Emit to KDS screens via WebSocket
    this.websocketGateway.emitToStation(
      ticket.stationId,
      'ticketStarted',
      updatedTicket,
    );

    await this.eventBus.publish(
      'TicketStarted',
      new TicketStartedEvent(ticketId, ticket.orderId),
    );

    return updatedTicket;
  }

  async markTicketReady(ticketId: string): Promise<KitchenTicket> {
    const ticket = await this.repo.findById(ticketId);
    if (!ticket) {
      throw new NotFoundException(`Ticket ${ticketId} not found`);
    }

    return this.repo.update(ticketId, {
      status: 'READY',
    });
  }

  async completeTicket(ticketId: string): Promise<KitchenTicket> {
    const ticket = await this.repo.findById(ticketId);
    if (!ticket) {
      throw new NotFoundException(`Ticket ${ticketId} not found`);
    }

    const updatedTicket = await this.repo.update(ticketId, {
      status: 'COMPLETED',
      completedAt: new Date(),
    });

    // Emit to KDS screens via WebSocket
    this.websocketGateway.emitToStation(
      ticket.stationId,
      'ticketCompleted',
      updatedTicket,
    );

    await this.eventBus.publish(
      'TicketCompleted',
      new TicketCompletedEvent(ticketId, ticket.orderId),
    );

    // Check if all tickets for order are complete
    await this.checkOrderCompletion(ticket.orderId);

    return updatedTicket;
  }

  // ==================== BUMP BAR ====================

  async bumpItem(ticketId: string, itemId: string): Promise<void> {
    const item = await this.repo.updateItem(itemId, {
      status: 'READY',
    });

    await this.eventBus.publish(
      'ItemBumped',
      new ItemBumpedEvent(ticketId, itemId, item.productId),
    );

    // Check if all items are ready
    const ticket = await this.repo.findWithItems(ticketId);
    if (ticket) {
      const allReady = ticket.items.every((i) => i.status === 'READY');
      if (allReady) {
        await this.markTicketReady(ticketId);
      }
    }
  }

  private async checkOrderCompletion(orderId: string): Promise<void> {
    const tickets = await this.repo.findByOrder(orderId);
    const allCompleted = tickets.every((t) => t.status === 'COMPLETED');

    if (allCompleted) {
      await this.eventBus.publish(
        'OrderPrepared',
        new OrderPreparedEvent(orderId),
      );
    }
  }

  // ==================== QUERIES ====================

  async getActiveTickets(stationId: string): Promise<KitchenTicketWithItems[]> {
    return this.repo.findActive(stationId);
  }

  async getTicketsByOrder(orderId: string): Promise<KitchenTicket[]> {
    return this.repo.findByOrder(orderId);
  }

  async getTicketWithItems(ticketId: string): Promise<KitchenTicketWithItems> {
    const ticket = await this.repo.findWithItems(ticketId);
    if (!ticket) {
      throw new NotFoundException(`Ticket ${ticketId} not found`);
    }
    return ticket;
  }

  // ==================== STATIONS ====================

  async getAllStations(): Promise<KitchenStation[]> {
    return this.repo.findAllStations();
  }

  async createStation(dto: CreateKitchenStationDto): Promise<KitchenStation> {
    return this.repo.createStation({
      ...dto,
      isActive: true,
    });
  }

  async updateStation(
    id: string,
    dto: UpdateKitchenStationDto,
  ): Promise<KitchenStation> {
    return this.repo.updateStation(id, dto);
  }

  // ==================== TICKET NUMBER GENERATION ====================

  private async generateTicketNumber(): Promise<string> {
    const date = new Date();
    const prefix = `KT${date.getFullYear()}${(date.getMonth() + 1)
      .toString()
      .padStart(2, '0')}`;
    const count = await this.repo.countByPrefix(prefix);
    return `${prefix}${(count + 1).toString().padStart(4, '0')}`;
  }
}
