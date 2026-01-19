// Tables Events
// Source: FINAL/BACKEND/12-MODULE-TABLES.md

import { DomainEvent } from '../../../core/event-bus/domain-event';

export class TableOccupiedEvent extends DomainEvent {
  constructor(
    public readonly tableId: string,
    public readonly orderId: string,
    public readonly tableNumber: string,
  ) {
    super();
  }
}

export class TableReleasedEvent extends DomainEvent {
  constructor(
    public readonly tableId: string,
    public readonly tableNumber: string,
  ) {
    super();
  }
}

export class TableTransferredEvent extends DomainEvent {
  constructor(
    public readonly fromTableId: string,
    public readonly toTableId: string,
    public readonly orderId: string,
  ) {
    super();
  }
}

export class ReservationCreatedEvent extends DomainEvent {
  constructor(
    public readonly reservationId: string,
    public readonly tableId: string,
    public readonly reservedFor: Date,
  ) {
    super();
  }
}

export class ReservationStatusChangedEvent extends DomainEvent {
  constructor(
    public readonly reservationId: string,
    public readonly status: string,
  ) {
    super();
  }
}
