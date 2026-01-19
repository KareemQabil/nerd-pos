// Discounts Events
// Source: FINAL/BACKEND/13-MODULE-DISCOUNTS.md

import { DomainEvent } from '../../../core/event-bus/domain-event';

export class DiscountCreatedEvent extends DomainEvent {
  constructor(
    public readonly discountId: string,
    public readonly code: string,
  ) {
    super();
  }
}

export class DiscountAppliedEvent extends DomainEvent {
  constructor(
    public readonly discountId: string,
    public readonly orderId: string,
    public readonly amount: number,
  ) {
    super();
  }
}

export class DiscountValidationFailedEvent extends DomainEvent {
  constructor(
    public readonly code: string,
    public readonly reason: string,
  ) {
    super();
  }
}

export class DiscountUsageLimitReachedEvent extends DomainEvent {
  constructor(
    public readonly discountId: string,
    public readonly code: string,
  ) {
    super();
  }
}
