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
  @OnEvent('OrderCreated', { suppressErrors: false })
  async handleOrderCreated(payload: OrderCreatedPayload): Promise<void> {
    this.logger.warn(
      `OrderCreated inventory deduction now handled in transaction. Skipping event handler for order ${payload.orderId}`,
    );
    return;
  }

  /**
   * When an order is cancelled, release the reserved stock
   */
  @OnEvent('OrderCancelled', { suppressErrors: false })
  async handleOrderCancelled(payload: OrderCancelledPayload): Promise<void> {
    this.logger.log(
      `Handling OrderCancelled event for order ${payload.orderId}`,
    );

    try {
      if (!payload.items || payload.items.length === 0) {
        this.logger.warn(
          `OrderCancelled event missing items for order ${payload.orderId}`,
        );
        return;
      }

      const warehouse = await this.inventoryService.getDefaultWarehouse();
      const warehouseId = warehouse.id;

      for (const item of payload.items) {
        // Restore stock for each item
        await this.inventoryService.adjustStock(
          {
            productId: item.productId,
            warehouseId,
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
