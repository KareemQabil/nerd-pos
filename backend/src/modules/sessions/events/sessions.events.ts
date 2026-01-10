// Sessions Events
// Source: FINAL/BACKEND/07-MODULE-SESSIONS.md

import { DomainEvent } from '../../../core/event-bus/domain-event';

export class SessionOpenedEvent extends DomainEvent {
    constructor(
        public readonly sessionId: string,
        public readonly userId: string,
        public readonly openingBalance: number,
    ) {
        super();
    }
}

export class SessionClosedEvent extends DomainEvent {
    constructor(
        public readonly sessionId: string,
        public readonly variance: number,
        public readonly closingBalance: number,
    ) {
        super();
    }
}

export class SessionVarianceAlertEvent extends DomainEvent {
    constructor(
        public readonly sessionId: string,
        public readonly variance: number,
        public readonly threshold: number,
    ) {
        super();
    }
}
