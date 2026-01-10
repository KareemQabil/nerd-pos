// Inventory Events
// Source: FINAL/BACKEND/04-MODULE-INVENTORY.md
import { DomainEvent } from '../../../core/event-bus/domain-event';

export class StockReceivedEvent extends DomainEvent {
    constructor(
        public readonly productId: string,
        public readonly warehouseId: string,
        public readonly quantity: number,
        public readonly batchId?: string,
    ) {
        super();
    }
}

export class StockDeductedEvent extends DomainEvent {
    constructor(
        public readonly productId: string,
        public readonly warehouseId: string,
        public readonly quantity: number,
        public readonly orderId?: string,
    ) {
        super();
    }
}

export class StockAdjustedEvent extends DomainEvent {
    constructor(
        public readonly productId: string,
        public readonly warehouseId: string,
        public readonly quantity: number,
        public readonly reason: string,
    ) {
        super();
    }
}

export class StockTransferredEvent extends DomainEvent {
    constructor(
        public readonly productId: string,
        public readonly fromWarehouseId: string,
        public readonly toWarehouseId: string,
        public readonly quantity: number,
    ) {
        super();
    }
}

export class LowStockAlertEvent extends DomainEvent {
    constructor(
        public readonly productId: string,
        public readonly warehouseId: string,
        public readonly currentQuantity: number,
        public readonly reorderPoint: number,
    ) {
        super();
    }
}

export class ExpiringBatchAlertEvent extends DomainEvent {
    constructor(
        public readonly batchId: string,
        public readonly productId: string,
        public readonly expiryDate: Date,
        public readonly remainingQuantity: number,
    ) {
        super();
    }
}
