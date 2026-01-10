// Kitchen Events
// Source: FINAL/BACKEND/08-MODULE-KITCHEN.md

import { DomainEvent } from '../../../core/event-bus/domain-event';

export class TicketCreatedEvent extends DomainEvent {
    constructor(
        public readonly ticketId: string,
        public readonly stationId: string,
        public readonly orderId: string,
    ) {
        super();
    }
}

export class TicketStartedEvent extends DomainEvent {
    constructor(
        public readonly ticketId: string,
        public readonly orderId: string,
    ) {
        super();
    }
}

export class TicketCompletedEvent extends DomainEvent {
    constructor(
        public readonly ticketId: string,
        public readonly orderId: string,
    ) {
        super();
    }
}

export class ItemBumpedEvent extends DomainEvent {
    constructor(
        public readonly ticketId: string,
        public readonly itemId: string,
        public readonly productId: string,
    ) {
        super();
    }
}

export class OrderPreparedEvent extends DomainEvent {
    constructor(
        public readonly orderId: string,
    ) {
        super();
    }
}
