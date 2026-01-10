// Customers Events
// Source: FINAL/BACKEND/09-MODULE-CUSTOMERS.md

import { DomainEvent } from '../../../core/event-bus/domain-event';

export class CustomerCreatedEvent extends DomainEvent {
    constructor(
        public readonly customerId: string,
        public readonly name: string,
    ) {
        super();
    }
}

export class CustomerUpdatedEvent extends DomainEvent {
    constructor(
        public readonly customerId: string,
        public readonly name: string,
    ) {
        super();
    }
}

export class LoyaltyPointsAddedEvent extends DomainEvent {
    constructor(
        public readonly customerId: string,
        public readonly points: number,
        public readonly orderId: string,
    ) {
        super();
    }
}

export class LoyaltyPointsRedeemedEvent extends DomainEvent {
    constructor(
        public readonly customerId: string,
        public readonly points: number,
        public readonly discountAmount: number,
    ) {
        super();
    }
}

export class TierUpgradedEvent extends DomainEvent {
    constructor(
        public readonly customerId: string,
        public readonly tierId: string,
        public readonly tierName: string,
    ) {
        super();
    }
}
