import { asAdmin } from '../auth/auth-headers';
import { getHttp } from '../runtime/test-context';
import { getCoreRefs } from '../seed/core-refs-resolver';
import { faker } from './factory-context';

export type PaymentResult = {
  id: string;
  orderId?: string;
  amount?: string | number;
  paymentMethod?: string;
};

export type RefundResult = {
  id: string;
  paymentId?: string;
  amount?: string | number;
  status?: string;
};

export const createPayment = async (options: {
  orderId: string;
  sessionId: string;
  amount: number;
  method?: 'CASH' | 'CARD' | 'MADA' | 'WALLET';
}): Promise<PaymentResult> => {
  const http = await getHttp();
  const headers = await asAdmin();
  const refs = await getCoreRefs();

  const response = await http
    .post('/api/v1/payments')
    .set(headers)
    .send({
      orderId: options.orderId,
      sessionId: options.sessionId,
      method: options.method ?? 'CASH',
      amount: options.amount,
      receivedAmount: options.amount,
      transactionId: faker.string.alphanumeric(10),
      createdBy: refs.admin.id,
    });

  if (response.status !== 201) {
    throw new Error(
      `createPayment failed: ${response.status} ${JSON.stringify(response.body)}`,
    );
  }

  return response.body.result as PaymentResult;
};

export const splitPayment = async (options: {
  orderId: string;
  sessionId: string;
  amounts: number[];
}): Promise<PaymentResult[]> => {
  const http = await getHttp();
  const headers = await asAdmin();
  const refs = await getCoreRefs();

  const payments = options.amounts.map((amount, index) => ({
    method: index % 2 === 0 ? 'CASH' : 'CARD',
    amount,
    receivedAmount: amount,
  }));

  const response = await http
    .post('/api/v1/payments/split')
    .set(headers)
    .send({
      orderId: options.orderId,
      sessionId: options.sessionId,
      payments,
      userId: refs.admin.id,
    });

  if (response.status !== 201) {
    throw new Error(
      `splitPayment failed: ${response.status} ${JSON.stringify(response.body)}`,
    );
  }

  return response.body.result as PaymentResult[];
};

export const createRefund = async (options: {
  paymentId: string;
  amount: number;
  reason?: string;
}): Promise<RefundResult> => {
  const http = await getHttp();
  const headers = await asAdmin();
  const refs = await getCoreRefs();

  const response = await http
    .post('/api/v1/payments/refunds')
    .set(headers)
    .send({
      paymentId: options.paymentId,
      amount: options.amount,
      reason: options.reason ?? 'Test refund',
      userId: refs.admin.id,
    });

  if (response.status !== 201) {
    throw new Error(
      `createRefund failed: ${response.status} ${JSON.stringify(response.body)}`,
    );
  }

  return response.body.result as RefundResult;
};

export const approveRefund = async (
  refundId: string,
): Promise<RefundResult> => {
  const http = await getHttp();
  const headers = await asAdmin();
  const refs = await getCoreRefs();

  const response = await http
    .put(`/api/v1/payments/refunds/${refundId}/approve`)
    .set(headers)
    .send({ userId: refs.admin.id });

  if (response.status !== 200) {
    throw new Error(
      `approveRefund failed: ${response.status} ${JSON.stringify(response.body)}`,
    );
  }

  return response.body.result as RefundResult;
};
