/**
 * Inventory Event Handlers
 *
 * Listens for events from other modules and reacts accordingly.
 * This is the LEGO pattern - modules communicate via events.
 */

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InventoryService } from './inventory.service';

interface OrderItem {
  productId: string;
  quantity: number;
}

interface OrderCreatedPayload {
  orderId: string;
  items: OrderItem[];
}

interface OrderCancelledPayload {
  orderId: string;
  items: OrderItem[];
}

@Injectable()
export class InventoryEventHandlers {
  private readonly logger = new Logger(InventoryEventHandlers.name);

  constructor(private readonly inventoryService: InventoryService) {}

  /**
   * When an order is created, reserve stock for the items
   */
  @OnEvent('OrderCreated')
  async handleOrderCreated(payload: OrderCreatedPayload): Promise<void> {
    this.logger.log(`Handling OrderCreated event for order ${payload.orderId}`);

    try {
      for (const item of payload.items) {
        // Deduct stock for each item
        await this.inventoryService.adjustStock(
          {
            productId: item.productId,
            warehouseId: 'default', // TODO: Get from order context
            quantity: -item.quantity,
            reason: `Sale: Order ${payload.orderId}`,
          },
          'system',
        );
      }
      this.logger.log(`Stock reserved for order ${payload.orderId}`);
    } catch (error) {
      this.logger.error(
        `Failed to reserve stock for order ${payload.orderId}`,
        error,
      );
      // In production, this would trigger a compensation event
    }
  }

  /**
   * When an order is cancelled, release the reserved stock
   */
  @OnEvent('OrderCancelled')
  async handleOrderCancelled(payload: OrderCancelledPayload): Promise<void> {
    this.logger.log(
      `Handling OrderCancelled event for order ${payload.orderId}`,
    );

    try {
      for (const item of payload.items) {
        // Restore stock for each item
        await this.inventoryService.adjustStock(
          {
            productId: item.productId,
            warehouseId: 'default',
            quantity: item.quantity, // Positive to add back
            reason: `Cancelled: Order ${payload.orderId}`,
          },
          'system',
        );
      }
      this.logger.log(`Stock released for cancelled order ${payload.orderId}`);
    } catch (error) {
      this.logger.error(
        `Failed to release stock for order ${payload.orderId}`,
        error,
      );
    }
  }
}
