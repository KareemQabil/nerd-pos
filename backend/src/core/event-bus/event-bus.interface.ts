// Event Bus Interface
// Source: FINAL/BACKEND/02-CORE-PATTERNS.md

export interface IEventBus {
    publish<T>(eventName: string, event: T): Promise<void>;
    subscribe<T>(eventName: string, handler: IEventHandler<T>): void;
}

export interface IEventHandler<T = any> {
    handle(event: T): Promise<void>;
}
