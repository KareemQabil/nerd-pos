import { resetTransactionalState } from '../../db/sandbox';
import { openSession } from '../../factories/register-session.factory';
import { createOrder } from '../../factories/order.factory';
import { createPayment } from '../../factories/payment.factory';

describe('workflow: quick sale', () => {
  beforeAll(async () => {
    await resetTransactionalState();
  });

  it('creates a takeaway order and takes a cash payment', async () => {
    const session = await openSession();
    const order = await createOrder({
      type: 'TAKEAWAY',
      sessionId: session.id,
      itemsCount: 1,
    });

    const total = Number(order.grandTotal ?? 0);
    const payment = await createPayment({
      orderId: order.id,
      sessionId: session.id,
      amount: total > 0 ? total : 12.5,
      method: 'CASH',
    });

    expect(payment.orderId).toBe(order.id);
  });
});
