// Event Bus Service Implementation
// Source: FINAL/BACKEND/02-CORE-PATTERNS.md
// Handlers execute in PARALLEL (from documented pattern)

import { Injectable } from '@nestjs/common';
import { IEventBus, IEventHandler } from './event-bus.interface';

@Injectable()
export class EventBusService implements IEventBus {
    private handlers = new Map<string, IEventHandler[]>();

    subscribe<T>(eventName: string, handler: IEventHandler<T>): void {
        if (!this.handlers.has(eventName)) {
            this.handlers.set(eventName, []);
        }
        this.handlers.get(eventName)!.push(handler);
    }

    async publish<T>(eventName: string, event: T): Promise<void> {
        const handlers = this.handlers.get(eventName) || [];

        // CRITICAL: Execute handlers in PARALLEL (as documented)
        // Failed handlers don't block other handlers
        await Promise.all(
            handlers.map((handler) =>
                handler.handle(event).catch((error) => {
                    console.error(`Handler failed for ${eventName}:`, error);
                    // Don't throw - let other handlers complete
                })
            )
        );
    }
}
