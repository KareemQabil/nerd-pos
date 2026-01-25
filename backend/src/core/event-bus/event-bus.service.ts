// Event Bus Service Implementation
// Source: FINAL/BACKEND/02-CORE-PATTERNS.md
// Handlers execute in PARALLEL (from documented pattern)
// FIX: Track failures instead of silent catching

import { Injectable, Logger } from '@nestjs/common';
import { IEventBus, IEventHandler } from './event-bus.interface';

interface HandlerFailure {
  handlerName: string;
  error: Error;
  timestamp: Date;
}

@Injectable()
export class EventBusService implements IEventBus {
  private handlers = new Map<string, IEventHandler[]>();
  private readonly logger = new Logger(EventBusService.name);
  private failures: HandlerFailure[] = [];

  subscribe<T>(eventName: string, handler: IEventHandler<T>): void {
    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, []);
    }
    this.handlers.get(eventName)!.push(handler);
  }

  async publish<T>(eventName: string, event: T): Promise<void> {
    const handlers = this.handlers.get(eventName) || [];
    this.failures = [];

    // CRITICAL: Execute handlers in PARALLEL with failure tracking
    // Failed handlers don't block other handlers BUT failures are tracked
    const results = await Promise.allSettled(
      handlers.map(async (handler) => {
        try {
          await handler.handle(event);
          return { success: true, handler: handler.constructor.name };
        } catch (error) {
          const failure: HandlerFailure = {
            handlerName: handler.constructor.name,
            error: error as Error,
            timestamp: new Date()
          };
          this.failures.push(failure);

          this.logger.error(
            `Handler failed for ${eventName}: ${failure.handlerName}`,
            error.stack
          );

          return { success: false, handler: handler.constructor.name, error };
        }
      })
    );

    // Log summary
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failCount = this.failures.length;

    if (handlers.length > 0) {
      this.logger.log(
        `Event ${eventName}: ${successCount}/${handlers.length} handlers succeeded`
      );
    }

    // CRITICAL: Alert on critical event failures
    const criticalEvents = ['OrderCreated', 'PaymentReceived', 'StockDeducted'];
    if (criticalEvents.includes(eventName) && failCount > 0) {
      this.logger.warn(
        `⚠️  CRITICAL: ${failCount} handlers failed for ${eventName}`
      );
    }

    // Return failures for inspection
    if (failCount > 0) {
      // Could throw here if we want to fail fast on critical events
      // For now, just track failures
    }
  }

  /**
   * Get failures from last publish call
   */
  getFailures(): HandlerFailure[] {
    return this.failures;
  }

  /**
   * Check if last publish had any failures
   */
  hasFailures(): boolean {
    return this.failures.length > 0;
  }
}
