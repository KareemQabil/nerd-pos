// Settings Events
import { DomainEvent } from '../../../core/event-bus/domain-event';

export class StoreSettingsUpdatedEvent extends DomainEvent {
    constructor(public readonly settingsId: string) { super(); }
}

export class TaxSettingCreatedEvent extends DomainEvent {
    constructor(public readonly taxId: string, public readonly rate: number) { super(); }
}

export class TerminalRegisteredEvent extends DomainEvent {
    constructor(public readonly terminalId: string, public readonly code: string) { super(); }
}
