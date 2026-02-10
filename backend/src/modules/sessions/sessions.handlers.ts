// Sessions Event Handlers
// Decouples payment processing from session aggregates via Outbox events.

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { SessionsService } from './sessions.service';

interface PaymentCreatedPayload {
  paymentId: string;
  orderId: string;
  sessionId: string;
  method: string;
  amount: number;
  incrementOrders?: boolean;
  isSplit?: boolean;
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
}

@Injectable()
export class SessionsPaymentsHandler {
  private readonly logger = new Logger(SessionsPaymentsHandler.name);

  constructor(private readonly sessionsService: SessionsService) {}

  @OnEvent('PaymentCreated')
  async handlePaymentCreated(payload: PaymentCreatedPayload): Promise<void> {
    if (!payload?.sessionId || !payload?.paymentId) return;
    if (payload.isSplit) return; // Split totals handled via PaymentCompleted
    await this.sessionsService.applyPaymentTotalsFromEvent(payload);
  }

  @OnEvent('PaymentCompleted')
  async handlePaymentCompleted(payload: PaymentCompletedPayload): Promise<void> {
    if (!payload?.sessionId || !payload?.payments?.length) return;

    for (let index = 0; index < payload.payments.length; index += 1) {
      const payment = payload.payments[index];
      await this.sessionsService.applyPaymentTotalsFromEvent({
        paymentId: payment.paymentId,
        orderId: payload.orderId,
        sessionId: payload.sessionId,
        method: payment.method,
        amount: payment.amount,
        incrementOrders: payload.incrementOrders === true && index === 0,
      });
    }
  }
}
