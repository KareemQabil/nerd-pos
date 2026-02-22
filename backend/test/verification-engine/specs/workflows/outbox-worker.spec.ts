import { resetTransactionalState } from '../../db/sandbox';
import { getApp, getPrisma } from '../../runtime/test-context';
import { OutboxService } from '../../../../src/core/outbox/outbox.service';
import { IEventBus } from '../../../../src/core/event-bus/event-bus.interface';

describe('workflow: outbox worker', () => {
  beforeAll(async () => {
    await resetTransactionalState();
  });

  it('processes a pending outbox event via flushPending()', async () => {
    const app = await getApp();
    const prisma = await getPrisma();
    const outbox = app.get(OutboxService);
    const eventBus = (outbox as unknown as { eventBus?: IEventBus }).eventBus;
    if (!eventBus) {
      throw new Error('OutboxService event bus not available for test.');
    }
    const publishSpy = jest
      .spyOn(eventBus, 'publish')
      .mockResolvedValue(undefined);

    const event = await prisma.outboxEvent.create({
      data: {
        eventName: 'VerificationTestEvent',
        payload: { ok: true },
        status: 'PENDING',
      },
    });

    await outbox.flushPending();

    const updated = await prisma.outboxEvent.findUnique({
      where: { id: event.id },
    });

    expect(publishSpy).toHaveBeenCalledWith('VerificationTestEvent', {
      ok: true,
    });
    expect(updated?.status).toBe('PROCESSED');
  });

  it('increments attempts when a critical event handler fails', async () => {
    const app = await getApp();
    const prisma = await getPrisma();
    const outbox = app.get(OutboxService);
    const eventBus = (outbox as unknown as { eventBus?: IEventBus }).eventBus;
    if (!eventBus) {
      throw new Error('OutboxService event bus not available for test.');
    }
    jest
      .spyOn(eventBus, 'publish')
      .mockRejectedValue(new Error('boom'));

    const event = await prisma.outboxEvent.create({
      data: {
        eventName: 'OrderCreated',
        payload: { orderId: 'ord-test' },
        status: 'PENDING',
      },
    });

    await outbox.flushPending();

    const updated = await prisma.outboxEvent.findUnique({
      where: { id: event.id },
    });

    expect(updated?.attempts).toBeGreaterThanOrEqual(1);
    expect(updated?.lastError).toBeTruthy();
  });
});
