// Sessions Event Handlers
// Decouples payment processing from session aggregates via Outbox events.

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { SessionsService } from './sessions.service';
import { InboxService } from '../../core/inbox/inbox.service';

interface PaymentCreatedPayload {
  paymentId: string;
  orderId: string;
  sessionId: string;
  method: string;
  amount: number;
  incrementOrders?: boolean;
  isSplit?: boolean;
  _eventId?: string;
}

interface PaymentCompletedPayload {
  orderId: string;
  sessionId: string;
  incrementOrders?: boolean;
  payments?: Array<{
    paymentId: string;
    method: string;
    amount: number;
  }>;
  _eventId?: string;
}

@Injectable()
export class SessionsPaymentsHandler {
  private readonly logger = new Logger(SessionsPaymentsHandler.name);

  constructor(
    private readonly sessionsService: SessionsService,
    private readonly inboxService: InboxService,
  ) {}

  @OnEvent('PaymentCreated')
  async handlePaymentCreated(payload: PaymentCreatedPayload): Promise<void> {
    if (!payload?.sessionId || !payload?.paymentId) return;
    if (payload.isSplit) return; // Split totals handled via PaymentCompleted
    const eventId = payload._eventId ?? `PaymentCreated:${payload.paymentId}`;
    await this.inboxService.executeIdempotently(
      'SessionsPaymentsHandler.handlePaymentCreated',
      eventId,
      'PaymentCreated',
      payload,
      async () => {
        await this.sessionsService.applyPaymentTotalsFromEvent(payload);
      },
    );
  }

  @OnEvent('PaymentCompleted')
  async handlePaymentCompleted(payload: PaymentCompletedPayload): Promise<void> {
    if (!payload?.sessionId || !payload?.payments?.length) return;

    const payments = payload.payments ?? [];
    const eventId = payload._eventId ?? `PaymentCompleted:${payload.orderId}`;
    await this.inboxService.executeIdempotently(
      'SessionsPaymentsHandler.handlePaymentCompleted',
      eventId,
      'PaymentCompleted',
      payload,
      async () => {
        for (let index = 0; index < payments.length; index += 1) {
          const payment = payments[index];
          await this.sessionsService.applyPaymentTotalsFromEvent({
            paymentId: payment.paymentId,
            orderId: payload.orderId,
            sessionId: payload.sessionId,
            method: payment.method,
            amount: payment.amount,
            incrementOrders: payload.incrementOrders === true && index === 0,
          });
        }
      },
    );
  }
}
