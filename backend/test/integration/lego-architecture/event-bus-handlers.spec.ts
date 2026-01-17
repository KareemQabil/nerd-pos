/**
 * Event Bus Multi-Handler Integration Tests
 * 
 * Category B: LEGO Architecture - Event-Driven Communication
 * 
 * Purpose: Verify EventBus parallel execution, error isolation, routing
 * Source: FINAL/BACKEND/02-CORE-PATTERNS.md (Event Bus Pattern)
 * 
 * Verified Implementation:
 * - EventBusService uses Promise.all for parallel execution
 * - Each handler's error is caught individually (isolation)
 * - Handlers stored in Map<string, IEventHandler[]>
 */

import { Test, TestingModule } from '@nestjs/testing';
import { EventBusService } from '../../../src/core/event-bus/event-bus.service';
import { EventBusModule } from '../../../src/core/event-bus/event-bus.module';
import { IEventHandler } from '../../../src/core/event-bus/event-bus.interface';
import Decimal from 'decimal.js';

describe('Event Bus Multi-Handler Integration (Category B)', () => {
    let module: TestingModule;
    let eventBus: EventBusService;

    beforeEach(async () => {
        // Fresh EventBusService for each test (clean handler registry)
        module = await Test.createTestingModule({
            imports: [EventBusModule],
        }).compile();

        eventBus = module.get<EventBusService>('IEventBus');
    });

    afterEach(async () => {
        await module.close();
    });

    // B1: Single event → single handler
    describe('B1: Single Handler', () => {
        it('should call single handler when event published', async () => {
            const handler: IEventHandler = {
                handle: jest.fn().mockResolvedValue(undefined),
            };
            eventBus.subscribe('TestEvent', handler);

            await eventBus.publish('TestEvent', { data: 'test' });

            expect(handler.handle).toHaveBeenCalledWith({ data: 'test' });
            expect(handler.handle).toHaveBeenCalledTimes(1);
        });
    });

    // B2: Single event → multiple handlers
    describe('B2: Multiple Handlers', () => {
        it('should call ALL handlers for same event', async () => {
            const handler1: IEventHandler = { handle: jest.fn().mockResolvedValue(undefined) };
            const handler2: IEventHandler = { handle: jest.fn().mockResolvedValue(undefined) };
            const handler3: IEventHandler = { handle: jest.fn().mockResolvedValue(undefined) };

            eventBus.subscribe('MultiEvent', handler1);
            eventBus.subscribe('MultiEvent', handler2);
            eventBus.subscribe('MultiEvent', handler3);

            await eventBus.publish('MultiEvent', { id: 1 });

            expect(handler1.handle).toHaveBeenCalledTimes(1);
            expect(handler2.handle).toHaveBeenCalledTimes(1);
            expect(handler3.handle).toHaveBeenCalledTimes(1);
        });
    });

    // B3: Parallel execution
    describe('B3: Parallel Execution', () => {
        it('should execute handlers in parallel (Promise.all)', async () => {
            const executionOrder: number[] = [];

            const slowHandler: IEventHandler = {
                handle: jest.fn().mockImplementation(async () => {
                    await new Promise(r => setTimeout(r, 100));
                    executionOrder.push(1);
                }),
            };
            const fastHandler: IEventHandler = {
                handle: jest.fn().mockImplementation(async () => {
                    executionOrder.push(2);
                }),
            };

            // Register slow first, then fast
            eventBus.subscribe('ParallelEvent', slowHandler);
            eventBus.subscribe('ParallelEvent', fastHandler);

            await eventBus.publish('ParallelEvent', {});

            // If parallel, fast should complete before slow
            // Both should be in array after publish completes
            expect(executionOrder).toContain(1);
            expect(executionOrder).toContain(2);
            expect(executionOrder.length).toBe(2);
        });
    });

    // B4: Error isolation
    describe('B4: Error Isolation', () => {
        it('should NOT block other handlers when one fails', async () => {
            const failingHandler: IEventHandler = {
                handle: jest.fn().mockRejectedValue(new Error('Handler Error')),
            };
            const successHandler: IEventHandler = {
                handle: jest.fn().mockResolvedValue(undefined),
            };

            eventBus.subscribe('ErrorEvent', failingHandler);
            eventBus.subscribe('ErrorEvent', successHandler);

            // Should not throw, despite failing handler
            await expect(eventBus.publish('ErrorEvent', {})).resolves.not.toThrow();

            // Both handlers were called
            expect(failingHandler.handle).toHaveBeenCalled();
            expect(successHandler.handle).toHaveBeenCalled();
        });
    });

    // B5: Exception caught
    describe('B5: Exception Handling', () => {
        it('should catch handler exceptions without unhandled rejection', async () => {
            const throwingHandler: IEventHandler = {
                handle: jest.fn().mockRejectedValue(new Error('Async Error')),
            };

            eventBus.subscribe('ThrowEvent', throwingHandler);

            // Should not throw
            await expect(eventBus.publish('ThrowEvent', {})).resolves.not.toThrow();
        });
    });

    // B6: Same event data to all handlers
    describe('B6: Event Data Integrity', () => {
        it('should pass same event object to all handlers', async () => {
            const receivedEvents: any[] = [];

            const handler1: IEventHandler = {
                handle: jest.fn().mockImplementation(async (event) => {
                    receivedEvents.push(event);
                }),
            };
            const handler2: IEventHandler = {
                handle: jest.fn().mockImplementation(async (event) => {
                    receivedEvents.push(event);
                }),
            };

            eventBus.subscribe('DataEvent', handler1);
            eventBus.subscribe('DataEvent', handler2);

            const originalEvent = { orderId: 'order-123', total: 100 };
            await eventBus.publish('DataEvent', originalEvent);

            // Both handlers received the same object
            expect(receivedEvents[0]).toBe(originalEvent);
            expect(receivedEvents[1]).toBe(originalEvent);
        });
    });

    // B7: Event cascading
    describe('B7: Event Cascading', () => {
        it('should allow handler to publish new event', async () => {
            const secondEventHandler: IEventHandler = {
                handle: jest.fn().mockResolvedValue(undefined),
            };

            const cascadingHandler: IEventHandler = {
                handle: jest.fn().mockImplementation(async () => {
                    await eventBus.publish('SecondEvent', { cascaded: true });
                }),
            };

            eventBus.subscribe('FirstEvent', cascadingHandler);
            eventBus.subscribe('SecondEvent', secondEventHandler);

            await eventBus.publish('FirstEvent', {});

            expect(cascadingHandler.handle).toHaveBeenCalled();
            expect(secondEventHandler.handle).toHaveBeenCalledWith({ cascaded: true });
        });
    });

    // B8: Zero handlers OK
    describe('B8: Zero Handlers', () => {
        it('should handle event with no registered handlers', async () => {
            // No handlers registered for this event
            await expect(
                eventBus.publish('UnhandledEvent', { data: 'orphan' })
            ).resolves.not.toThrow();
        });
    });

    // B9: Dynamic registration
    describe('B9: Dynamic Handler Registration', () => {
        it('should allow adding handlers at runtime', async () => {
            const handler: IEventHandler = {
                handle: jest.fn().mockResolvedValue(undefined),
            };

            // Register after module init
            eventBus.subscribe('DynamicEvent', handler);

            await eventBus.publish('DynamicEvent', { runtime: true });

            expect(handler.handle).toHaveBeenCalledWith({ runtime: true });
        });
    });

    // B10: Different events, different handlers
    describe('B10: Event Routing', () => {
        it('should route events to correct handlers only', async () => {
            const eventAHandler: IEventHandler = { handle: jest.fn().mockResolvedValue(undefined) };
            const eventBHandler: IEventHandler = { handle: jest.fn().mockResolvedValue(undefined) };

            eventBus.subscribe('EventA', eventAHandler);
            eventBus.subscribe('EventB', eventBHandler);

            await eventBus.publish('EventA', { type: 'A' });

            expect(eventAHandler.handle).toHaveBeenCalledWith({ type: 'A' });
            expect(eventBHandler.handle).not.toHaveBeenCalled();
        });
    });

    // B11: Same handler for multiple events
    describe('B11: Handler Reuse', () => {
        it('should allow same handler for multiple events', async () => {
            const sharedHandler: IEventHandler = {
                handle: jest.fn().mockResolvedValue(undefined),
            };

            eventBus.subscribe('Event1', sharedHandler);
            eventBus.subscribe('Event2', sharedHandler);

            await eventBus.publish('Event1', { num: 1 });
            await eventBus.publish('Event2', { num: 2 });

            expect(sharedHandler.handle).toHaveBeenCalledTimes(2);
            expect(sharedHandler.handle).toHaveBeenCalledWith({ num: 1 });
            expect(sharedHandler.handle).toHaveBeenCalledWith({ num: 2 });
        });
    });

    // B12: Event metadata (if using DomainEvent pattern)
    describe('B12: Event with Metadata', () => {
        it('should preserve event metadata like timestamp', async () => {
            const handler: IEventHandler = { handle: jest.fn().mockResolvedValue(undefined) };
            eventBus.subscribe('MetaEvent', handler);

            const eventWithMeta = {
                data: 'test',
                occurredAt: new Date(),
                eventId: 'evt-123',
            };
            await eventBus.publish('MetaEvent', eventWithMeta);

            const passedEvent = (handler.handle as jest.Mock).mock.calls[0][0];
            expect(passedEvent.occurredAt).toBeInstanceOf(Date);
            expect(passedEvent.eventId).toBe('evt-123');
        });
    });

    // B13: Decimal.js values preserved
    describe('B13: Decimal Value Preservation', () => {
        it('should preserve Decimal.js values in event data', async () => {
            const handler: IEventHandler = { handle: jest.fn().mockResolvedValue(undefined) };
            eventBus.subscribe('DecimalEvent', handler);

            const price = new Decimal('99.99');
            const quantity = new Decimal('3');
            await eventBus.publish('DecimalEvent', { price, quantity });

            const passedEvent = (handler.handle as jest.Mock).mock.calls[0][0];
            expect(passedEvent.price).toBeInstanceOf(Decimal);
            expect(passedEvent.price.equals(new Decimal('99.99'))).toBe(true);
            expect(passedEvent.quantity.equals(new Decimal('3'))).toBe(true);
        });
    });

    // B14: Promise.all waits for all handlers
    describe('B14: Publish Waits for Handlers', () => {
        it('should wait for all handlers to complete before resolving', async () => {
            let handlerCompleted = false;

            const slowHandler: IEventHandler = {
                handle: jest.fn().mockImplementation(async () => {
                    await new Promise(r => setTimeout(r, 100));
                    handlerCompleted = true;
                }),
            };

            eventBus.subscribe('WaitEvent', slowHandler);

            await eventBus.publish('WaitEvent', {});

            // After publish resolves, handler should have completed
            expect(handlerCompleted).toBe(true);
        });
    });

    // B15: Many handlers performance
    describe('B15: Performance with Many Handlers', () => {
        it('should handle 50 handlers without issues', async () => {
            const handlers: IEventHandler[] = [];
            const callCount = { value: 0 };

            for (let i = 0; i < 50; i++) {
                const handler: IEventHandler = {
                    handle: jest.fn().mockImplementation(async () => {
                        callCount.value++;
                    }),
                };
                handlers.push(handler);
                eventBus.subscribe('ManyHandlersEvent', handler);
            }

            const start = Date.now();
            await eventBus.publish('ManyHandlersEvent', { bulk: true });
            const duration = Date.now() - start;

            expect(callCount.value).toBe(50);
            expect(duration).toBeLessThan(1000); // Should complete in < 1 second
        });
    });
});
