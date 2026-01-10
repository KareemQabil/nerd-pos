// Products Events
// Source: FINAL/BACKEND/03-MODULE-PRODUCTS.md
import { DomainEvent } from '../../../core/event-bus/domain-event';

export class ProductCreatedEvent extends DomainEvent {
    constructor(
        public readonly productId: string,
        public readonly name: string,
        public readonly sku: string,
    ) {
        super();
    }
}

export class ProductUpdatedEvent extends DomainEvent {
    constructor(
        public readonly productId: string,
        public readonly name: string,
    ) {
        super();
    }
}

export class ProductDeletedEvent extends DomainEvent {
    constructor(
        public readonly productId: string,
        public readonly sku: string,
    ) {
        super();
    }
}

export class CategoryCreatedEvent extends DomainEvent {
    constructor(
        public readonly categoryId: string,
        public readonly name: string,
    ) {
        super();
    }
}

export class CategoryUpdatedEvent extends DomainEvent {
    constructor(
        public readonly categoryId: string,
        public readonly name: string,
    ) {
        super();
    }
}

export class ProductStockChangedEvent extends DomainEvent {
    constructor(
        public readonly productId: string,
        public readonly previousStock: number,
        public readonly newStock: number,
    ) {
        super();
    }
}

export class ProductAvailabilityChangedEvent extends DomainEvent {
    constructor(
        public readonly productId: string,
        public readonly isAvailable: boolean,
    ) {
        super();
    }
}
