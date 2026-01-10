// Sales Events
// Source: FINAL/BACKEND/05-MODULE-SALES.md

import { DomainEvent } from '../../../core/event-bus/domain-event';

export class OrderCreatedEvent extends DomainEvent {
    constructor(
        public readonly orderId: string,
        public readonly orderNumber: string,
        public readonly type: string,
        public readonly grandTotal: number,
    ) {
        super();
    }
}

export class OrderConfirmedEvent extends DomainEvent {
    constructor(
        public readonly orderId: string,
        public readonly orderNumber: string,
    ) {
        super();
    }
}

export class OrderCompletedEvent extends DomainEvent {
    constructor(
        public readonly orderId: string,
        public readonly orderNumber: string,
        public readonly grandTotal: number,
    ) {
        super();
    }
}

export class OrderCancelledEvent extends DomainEvent {
    constructor(
        public readonly orderId: string,
        public readonly orderNumber: string,
        public readonly reason?: string,
    ) {
        super();
    }
}

export class OrderItemAddedEvent extends DomainEvent {
    constructor(
        public readonly orderId: string,
        public readonly itemId: string,
        public readonly productId: string,
        public readonly quantity: number,
    ) {
        super();
    }
}

export class OrderStatusChangedEvent extends DomainEvent {
    constructor(
        public readonly orderId: string,
        public readonly previousStatus: string,
        public readonly newStatus: string,
    ) {
        super();
    }
}

export class OrderCalculatedEvent extends DomainEvent {
    constructor(
        public readonly orderId: string,
        public readonly itemSubtotal: number,
        public readonly grandTotal: number,
    ) {
        super();
    }
}
