/**
 * Event Recorder for Integration Tests
 * 
 * Purpose: Capture events published via EventBus for test assertions
 * Usage: Attach to EventBusService to record all published events
 * 
 * Based on: FINAL/BACKEND/02-CORE-PATTERNS.md EventBus pattern
 */

export interface RecordedEvent {
    name: string;
    event: any;
    timestamp: Date;
}

export class EventRecorder {
    private events: RecordedEvent[] = [];

    /**
     * Record an event (called when EventBus.publish is invoked)
     */
    record(eventName: string, event: any): void {
        this.events.push({
            name: eventName,
            event,
            timestamp: new Date(),
        });
    }

    /**
     * Get all events with a specific name
     */
    getByName(eventName: string): any[] {
        return this.events
            .filter(e => e.name === eventName)
            .map(e => e.event);
    }

    /**
     * Get the most recent event of a specific type
     */
    getLatest(eventName: string): any | undefined {
        const events = this.getByName(eventName);
        return events.length > 0 ? events[events.length - 1] : undefined;
    }

    /**
     * Check if any event of a specific type was recorded
     */
    hasEvent(eventName: string): boolean {
        return this.events.some(e => e.name === eventName);
    }

    /**
     * Get count of events for a specific name
     */
    countEvents(eventName: string): number {
        return this.getByName(eventName).length;
    }

    /**
     * Get all recorded events
     */
    getAll(): RecordedEvent[] {
        return [...this.events];
    }

    /**
     * Clear all recorded events
     */
    clear(): void {
        this.events = [];
    }

    /**
     * Wait for an event to be recorded (with timeout)
     */
    async waitForEvent(
        eventName: string,
        timeoutMs: number = 5000,
    ): Promise<any> {
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            const events = this.getByName(eventName);
            if (events.length > 0) {
                return events[events.length - 1];
            }
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        throw new Error(`Timeout waiting for event: ${eventName}`);
    }

    /**
     * Wait for multiple events to be recorded
     */
    async waitForEvents(
        eventNames: string[],
        timeoutMs: number = 5000,
    ): Promise<Map<string, any>> {
        const results = new Map<string, any>();
        for (const name of eventNames) {
            results.set(name, await this.waitForEvent(name, timeoutMs));
        }
        return results;
    }
}

/**
 * Create a mock EventBus that records events
 */
export function createMockEventBusWithRecorder(): {
    eventBus: { publish: jest.Mock; subscribe: jest.Mock };
    recorder: EventRecorder;
} {
    const recorder = new EventRecorder();

    const eventBus = {
        publish: jest.fn().mockImplementation((name: string, event: any) => {
            recorder.record(name, event);
            return Promise.resolve();
        }),
        subscribe: jest.fn(),
    };

    return { eventBus, recorder };
}
