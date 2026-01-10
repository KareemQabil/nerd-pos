// Delivery Events
import { DomainEvent } from '../../../core/event-bus/domain-event';

export class DeliveryCreatedEvent extends DomainEvent {
    constructor(public readonly deliveryId: string, public readonly orderId: string) { super(); }
}

export class DriverAssignedEvent extends DomainEvent {
    constructor(public readonly deliveryId: string, public readonly driverId: string) { super(); }
}

export class DeliveryStatusUpdatedEvent extends DomainEvent {
    constructor(public readonly deliveryId: string, public readonly status: string) { super(); }
}

export class DeliveryCompletedEvent extends DomainEvent {
    constructor(public readonly deliveryId: string, public readonly orderId: string) { super(); }
}
