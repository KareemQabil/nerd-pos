// Product Updated Event
import { DomainEvent } from '../../../core/event-bus/domain-event';

export class ProductUpdatedEvent extends DomainEvent {
    constructor(
        public readonly productId: string,
        public readonly sku: string,
    ) {
        super();
    }
}
