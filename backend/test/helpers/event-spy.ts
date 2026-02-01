/**
 * Event Spy - Capture and verify events during tests
 *
 * Usage:
 *   const eventSpy = new EventSpy(eventBus);
 *   await someAction();
 *   eventSpy.assertEventFired('OrderCreated');
 *   eventSpy.assertEventNotFired('StockDeducted');
 *   eventSpy.reset();
 */

import { DomainEvent } from '../../src/core/event-bus/domain-event';
import { IEventBus } from '../../src/core/event-bus/event-bus.interface';

export class EventSpy {
  private capturedEvents: Map<string, DomainEvent[]> = new Map();
  private originalPublish: any;
  private eventBus: any;

  constructor(eventBus: IEventBus) {
    this.eventBus = eventBus;
    this.setupInterception();
  }

  private setupInterception() {
    // Store original publish method
    this.originalPublish = this.eventBus.publish.bind(this.eventBus);

    // Wrap publish to capture all events
    this.eventBus.publish = async <T>(eventName: string, event: T) => {
      if (!this.capturedEvents.has(eventName)) {
        this.capturedEvents.set(eventName, []);
      }
      this.capturedEvents.get(eventName)!.push(event as DomainEvent);

      // Call original publish
      return this.originalPublish(eventName, event);
    };
  }

  /**
   * Check if an event was fired exactly N times
   */
  assertEventFired(eventName: string, count: number = 1): boolean {
    const events = this.capturedEvents.get(eventName) || [];
    return events.length === count;
  }

  /**
   * Check if an event was NOT fired
   */
  assertEventNotFired(eventName: string): boolean {
    return (
      !this.capturedEvents.has(eventName) ||
      this.capturedEvents.get(eventName)!.length === 0
    );
  }

  /**
   * Get all captured events for a specific event name
   */
  getEvents(eventName: string): DomainEvent[] {
    return this.capturedEvents.get(eventName) || [];
  }

  /**
   * Get count of events fired
   */
  getEventCount(eventName: string): number {
    return this.capturedEvents.get(eventName)?.length || 0;
  }

  /**
   * Reset all captured events
   */
  reset() {
    this.capturedEvents.clear();
  }

  /**
   * Get statistics about all captured events
   */
  getStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    for (const [eventName, events] of this.capturedEvents) {
      stats[eventName] = events.length;
    }
    return stats;
  }

  /**
   * Verify events were fired in specific order
   */
  verifyEventOrder(eventNames: string[]): boolean {
    const allEvents: Array<{ name: string; timestamp: Date }> = [];

    for (const [name, events] of this.capturedEvents) {
      for (const event of events) {
        allEvents.push({ name, timestamp: event.occurredAt });
      }
    }

    allEvents.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    const actualOrder = allEvents.map((e) => e.name);
    return JSON.stringify(actualOrder) === JSON.stringify(eventNames);
  }

  /**
   * Clean up - restore original publish method
   */
  destroy() {
    this.eventBus.publish = this.originalPublish;
  }
}
