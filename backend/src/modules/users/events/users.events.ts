// Users Events
// Source: FINAL/BACKEND/14-MODULE-USERS-ROLES.md

import { DomainEvent } from '../../../core/event-bus/domain-event';

export class UserCreatedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly username: string,
    public readonly roleId: string,
  ) {
    super();
  }
}

export class UserLoggedInEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly username: string,
  ) {
    super();
  }
}

export class UserLoggedOutEvent extends DomainEvent {
  constructor(public readonly userId: string) {
    super();
  }
}

export class UserPasswordChangedEvent extends DomainEvent {
  constructor(public readonly userId: string) {
    super();
  }
}

export class ManagerAuthUsedEvent extends DomainEvent {
  constructor(
    public readonly managerId: string,
    public readonly action: string,
    public readonly targetId: string,
  ) {
    super();
  }
}
