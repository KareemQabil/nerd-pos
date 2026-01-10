// Compliance Events
import { DomainEvent } from '../../../core/event-bus/domain-event';

export class InvoiceGeneratedEvent extends DomainEvent {
    constructor(public readonly invoiceId: string, public readonly orderId: string) { super(); }
}

export class InvoiceSubmittedEvent extends DomainEvent {
    constructor(public readonly invoiceId: string, public readonly status: string) { super(); }
}

export class HashChainBrokenEvent extends DomainEvent {
    constructor(public readonly invoiceId: string, public readonly expectedHash: string, public readonly actualHash: string) { super(); }
}
