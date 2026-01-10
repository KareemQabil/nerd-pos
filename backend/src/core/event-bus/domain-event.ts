// Domain Event Interface
// Source: FINAL/BACKEND/02-CORE-PATTERNS.md

export abstract class DomainEvent {
    public readonly occurredAt: Date;

    constructor() {
        this.occurredAt = new Date();
    }
}
