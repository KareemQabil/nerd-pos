// Product Created Event
// Source: WORKFLOWS-BACKEND/01-create-module.md

import { DomainEvent } from '../../../core/event-bus/domain-event';

export class ProductCreatedEvent extends DomainEvent {
    constructor(
        public readonly productId: string,
        public readonly sku: string,
        public readonly nameEn: string,
    ) {
        super();
    }
}
