// Payments Events
// Source: FINAL/BACKEND/06-MODULE-PAYMENTS.md

import { DomainEvent } from '../../../core/event-bus/domain-event';

export class PaymentCreatedEvent extends DomainEvent {
    constructor(
        public readonly paymentId: string,
        public readonly orderId: string,
        public readonly method: string,
        public readonly amount: number,
    ) {
        super();
    }
}

export class PaymentCompletedEvent extends DomainEvent {
    constructor(
        public readonly orderId: string,
        public readonly totalPaid: number,
        public readonly paymentCount: number,
    ) {
        super();
    }
}

export class PaymentFailedEvent extends DomainEvent {
    constructor(
        public readonly paymentId: string,
        public readonly orderId: string,
        public readonly reason: string,
    ) {
        super();
    }
}

export class RefundCreatedEvent extends DomainEvent {
    constructor(
        public readonly refundId: string,
        public readonly paymentId: string,
        public readonly amount: number,
    ) {
        super();
    }
}

export class RefundProcessedEvent extends DomainEvent {
    constructor(
        public readonly refundId: string,
        public readonly paymentId: string,
        public readonly amount: number,
    ) {
        super();
    }
}

export class RefundRejectedEvent extends DomainEvent {
    constructor(
        public readonly refundId: string,
        public readonly paymentId: string,
        public readonly reason: string,
    ) {
        super();
    }
}
