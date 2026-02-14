/**
 * Kitchen Event Handlers
 *
 * Listens for events from other modules and reacts accordingly.
 * This is the LEGO pattern - modules communicate via events.
 */

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { KitchenService } from './kitchen.service';
import { InboxService } from '../../core/inbox/inbox.service';

interface OrderItem {
  productId: string;
  productName: string;
  productNameAr: string;
  categoryId?: string;
  quantity: number;
  notes?: string;
  modifiers?: string[];
}

interface OrderConfirmedPayload {
  orderId: string;
  items: OrderItem[];
  orderType: string;
  _eventId?: string;
}

interface OrderCancelledPayload {
  orderId: string;
  _eventId?: string;
}

@Injectable()
export class KitchenEventHandlers {
  private readonly logger = new Logger(KitchenEventHandlers.name);

  constructor(
    private readonly kitchenService: KitchenService,
    private readonly inboxService: InboxService,
  ) {}

  /**
   * When an order is confirmed, route items to kitchen stations
   */
  @OnEvent('OrderConfirmed')
  async handleOrderConfirmed(payload: OrderConfirmedPayload): Promise<void> {
    this.logger.log(
      `Handling OrderConfirmed event for order ${payload.orderId}`,
    );

    try {
      if (!payload.items || payload.items.length === 0) {
        this.logger.warn(
          `OrderConfirmed event missing items for order ${payload.orderId}`,
        );
        return;
      }

      const eventId = payload._eventId ?? `OrderConfirmed:${payload.orderId}`;
      await this.inboxService.executeIdempotently(
        'KitchenEventHandlers.handleOrderConfirmed',
        eventId,
        'OrderConfirmed',
        payload,
        async () => {
          // Only route to kitchen for dine-in and take-away orders
          if (['DINE_IN', 'TAKE_AWAY'].includes(payload.orderType)) {
            const items = payload.items.map((item) => ({
              ...item,
              categoryId: item.categoryId ?? '',
            }));
            await this.kitchenService.routeOrderToKitchen(
              payload.orderId,
              items,
              payload.orderType,
            );
            this.logger.log(`Order ${payload.orderId} routed to kitchen`);
          }
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to route order ${payload.orderId} to kitchen`,
        error,
      );
    }
  }

  /**
   * When an order is cancelled, mark kitchen tickets as cancelled
   */
  @OnEvent('OrderCancelled')
  async handleOrderCancelled(payload: OrderCancelledPayload): Promise<void> {
    this.logger.log(
      `Handling OrderCancelled event for order ${payload.orderId}`,
    );

    try {
      const eventId = payload._eventId ?? `OrderCancelled:${payload.orderId}`;
      await this.inboxService.executeIdempotently(
        'KitchenEventHandlers.handleOrderCancelled',
        eventId,
        'OrderCancelled',
        payload,
        async () => {
          // Get all tickets for this order and complete them (cancelled)
          const tickets = await this.kitchenService.getTicketsByOrder(
            payload.orderId,
          );
          for (const ticket of tickets) {
            if (ticket.status !== 'COMPLETED') {
              // Complete the ticket to remove from queue
              await this.kitchenService.completeTicket(ticket.id);
            }
          }
          this.logger.log(
            `Kitchen tickets cancelled for order ${payload.orderId}`,
          );
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to cancel kitchen tickets for order ${payload.orderId}`,
        error,
      );
    }
  }
}
