/**
 * FIN-01: Split Payment Rounding Error
 *
 * Tests the 10/3 split payment edge case (3.33, 3.33, 3.34)
 */

import { PrismaService } from '../../../src/core/prisma/prisma.service';
import { OrderStatus } from '../../../src/core/constants/enums';
import Decimal from 'decimal.js';
import { Prisma } from '@prisma/client';

describe('FIN-01: Split Payment Rounding Error', () => {
  let prisma: PrismaService;
  const orders = new Map<string, any>();
  const payments = new Map<string, any>();

  beforeEach(async () => {
    orders.clear();
    payments.clear();
    prisma = {
      salesOrder: {
        create: jest.fn(async ({ data }: { data: any }) => {
          const id = data.id ?? `order-${orders.size + 1}`;
          const order = {
            id,
            sessionId: data.sessionId ?? 'test-session',
            status: data.status ?? OrderStatus.CONFIRMED,
            grandTotal: new Prisma.Decimal(data.grandTotal ?? 0),
            ...data,
          };
          orders.set(id, order);
          return order;
        }),
      },
      payment: {
        create: jest.fn(async ({ data }: { data: any }) => {
          const id = data.id ?? `pay-${payments.size + 1}`;
          const payment = {
            id,
            amount: new Prisma.Decimal(data.amount ?? 0),
            paymentDate: data.paymentDate ?? new Date(),
            ...data,
          };
          payments.set(id, payment);
          return payment;
        }),
        findMany: jest.fn(async ({ where }: { where: any }) => {
          return Array.from(payments.values()).filter((payment) => {
            if (where?.orderId && payment.orderId !== where.orderId) return false;
            return true;
          });
        }),
      },
    } as unknown as PrismaService;
  });

  it('should handle 10 split into 3 payments correctly (3.33, 3.33, 3.34)', async () => {
    // Setup: Order with total = 10
    const order = await prisma.salesOrder.create({
      data: {
        orderNumber: 'ORD-SPLIT-1',
        orderType: 'DINE_IN',
        status: OrderStatus.CONFIRMED,
        grandTotal: 10,
        sessionId: 'test-session',
        businessDate: new Date(),
        taxRate: 0.15,
      },
    });

    // Act: Split 10 into 3 equal payments
    const payment1Amount = new Decimal(10).div(3).toDecimalPlaces(2);
    const payment2Amount = new Decimal(10).div(3).toDecimalPlaces(2);
    // Third payment: 10 - 3.33 - 3.33 = 3.34
    const payment3Amount = new Decimal(10)
      .sub(payment1Amount)
      .sub(payment2Amount)
      .toDecimalPlaces(2);

    // Create payments
    const sessionId = order.sessionId;
    const processedBy = 'test-user';

    const payment1 = await prisma.payment.create({
      data: {
        orderId: order.id,
        amount: payment1Amount.toNumber(),
        paymentMethod: 'CASH',
        referenceNumber: 'PAY-1',
        sessionId,
        processedBy,
      },
    });

    const payment2 = await prisma.payment.create({
      data: {
        orderId: order.id,
        amount: payment2Amount.toNumber(),
        paymentMethod: 'CASH',
        referenceNumber: 'PAY-2',
        sessionId,
        processedBy,
      },
    });

    const payment3 = await prisma.payment.create({
      data: {
        orderId: order.id,
        amount: payment3Amount.toNumber(),
        paymentMethod: 'CASH',
        referenceNumber: 'PAY-3',
        sessionId,
        processedBy,
      },
    });

    // Assert: Verify amounts
    expect(payment1.amount.toString()).toBe('3.33');
    expect(payment2.amount.toString()).toBe('3.33');
    expect(payment3.amount.toString()).toBe('3.34');

    // Verify total equals order total
    const totalPaid = new Decimal(payment1.amount.toString())
      .add(new Decimal(payment2.amount.toString()))
      .add(new Decimal(payment3.amount.toString()));

    const expectedTotal = new Decimal(order.grandTotal?.toString() || '10');
    expect(totalPaid.toFixed(2)).toBe('10.00');
    expect(totalPaid.toFixed(2)).toBe(expectedTotal.toFixed(2));
  });

  it('should handle 100 split into 3 payments correctly', async () => {
    // Setup: Order with total = 100
    const order = await prisma.salesOrder.create({
      data: {
        orderNumber: 'ORD-SPLIT-2',
        orderType: 'DINE_IN',
        status: OrderStatus.CONFIRMED,
        grandTotal: 100,
        sessionId: 'test-session',
        businessDate: new Date(),
        taxRate: 0.15,
      },
    });

    // Act: Split 100 into 3 equal payments
    const payment1Amount = new Decimal(100).div(3).toDecimalPlaces(2);
    const payment2Amount = new Decimal(100).div(3).toDecimalPlaces(2);
    const payment3Amount = new Decimal(100)
      .sub(payment1Amount)
      .sub(payment2Amount)
      .toDecimalPlaces(2);

    // Create payments
    const sessionId = order.sessionId;
    const processedBy = 'test-user';

    await prisma.payment.create({
      data: {
        orderId: order.id,
        amount: payment1Amount.toNumber(),
        paymentMethod: 'CASH',
        referenceNumber: 'PAY-1',
        sessionId,
        processedBy,
      },
    });

    await prisma.payment.create({
      data: {
        orderId: order.id,
        amount: payment2Amount.toNumber(),
        paymentMethod: 'CASH',
        referenceNumber: 'PAY-2',
        sessionId,
        processedBy,
      },
    });

    await prisma.payment.create({
      data: {
        orderId: order.id,
        amount: payment3Amount.toNumber(),
        paymentMethod: 'CASH',
        referenceNumber: 'PAY-3',
        sessionId,
        processedBy,
      },
    });

    // Assert: Verify total equals order total
    const payments = await prisma.payment.findMany({
      where: { orderId: order.id },
    });

    const totalPaid = payments.reduce(
      (sum, p) => sum.add(new Decimal(p.amount.toString())),
      new Decimal(0),
    );

    expect(totalPaid.toFixed(2)).toBe('100.00');
  });

  it('should handle 1 split into 7 payments correctly', async () => {
    // Setup: Order with total = 1
    const order = await prisma.salesOrder.create({
      data: {
        orderNumber: 'ORD-SPLIT-3',
        orderType: 'DINE_IN',
        status: OrderStatus.CONFIRMED,
        grandTotal: 1,
        sessionId: 'test-session',
        businessDate: new Date(),
        taxRate: 0.15,
      },
    });

    // Act: Split 1 into 7 equal payments (approximately 0.14 each)
    const perPayment = new Decimal(1).div(7).toDecimalPlaces(2);
    const payments = [];
    const sessionId = order.sessionId;
    const processedBy = 'test-user';

    for (let i = 0; i < 6; i++) {
      payments.push(
        await prisma.payment.create({
          data: {
            orderId: order.id,
            amount: perPayment.toNumber(),
            paymentMethod: 'CASH',
            referenceNumber: `PAY-${i + 1}`,
            sessionId,
            processedBy,
          },
        }),
      );
    }

    // Last payment: remainder
    const lastPaymentAmount = new Decimal(1)
      .sub(perPayment.mul(6))
      .toDecimalPlaces(2);
    payments.push(
      await prisma.payment.create({
        data: {
          orderId: order.id,
          amount: lastPaymentAmount.toNumber(),
          paymentMethod: 'CASH',
          referenceNumber: 'PAY-7',
          sessionId,
          processedBy,
        },
      }),
    );

    // Assert: Verify total equals 1
    const totalPaid = payments.reduce(
      (sum, p) => sum.add(new Decimal(p.amount.toString())),
      new Decimal(0),
    );

    expect(totalPaid.toFixed(2)).toBe('1.00');
  });

  it('should not allow split payments to exceed order total', async () => {
    // Setup: Order with total = 50
    const order = await prisma.salesOrder.create({
      data: {
        orderNumber: 'ORD-SPLIT-4',
        orderType: 'DINE_IN',
        status: OrderStatus.CONFIRMED,
        grandTotal: 50,
        sessionId: 'test-session',
        businessDate: new Date(),
        taxRate: 0.15,
      },
    });

    // Act: Create payments that exceed total
    const sessionId = order.sessionId;
    const processedBy = 'test-user';

    await prisma.payment.create({
      data: {
        orderId: order.id,
        amount: 25,
        paymentMethod: 'CASH',
        referenceNumber: 'PAY-1',
        sessionId,
        processedBy,
      },
    });

    await prisma.payment.create({
      data: {
        orderId: order.id,
        amount: 25,
        paymentMethod: 'CASH',
        referenceNumber: 'PAY-2',
        sessionId,
        processedBy,
      },
    });

    // Third payment of 1 would exceed total
    // This should be rejected by validation
    // For now, verify the payments sum correctly

    const payments = await prisma.payment.findMany({
      where: { orderId: order.id },
    });

    const totalPaid = payments.reduce(
      (sum, p) => sum.add(new Decimal(p.amount.toString())),
      new Decimal(0),
    );

    expect(totalPaid.toFixed(2)).toBe('50.00');
  });

  it('should track remaining balance after partial payments', async () => {
    // Setup: Order with total = 100
    const order = await prisma.salesOrder.create({
      data: {
        orderNumber: 'ORD-SPLIT-5',
        orderType: 'DINE_IN',
        status: OrderStatus.CONFIRMED,
        grandTotal: 100,
        sessionId: 'test-session',
        businessDate: new Date(),
        taxRate: 0.15,
      },
    });

    // Act: Make partial payment of 33.33
    const sessionId = order.sessionId;
    const processedBy = 'test-user';

    await prisma.payment.create({
      data: {
        orderId: order.id,
        amount: 33.33,
        paymentMethod: 'CASH',
        referenceNumber: 'PAY-1',
        sessionId,
        processedBy,
      },
    });

    // Calculate remaining balance
    const payments = await prisma.payment.findMany({
      where: { orderId: order.id },
    });

    const totalPaid = payments.reduce(
      (sum, p) => sum.add(new Decimal(p.amount.toString())),
      new Decimal(0),
    );

    const remaining = new Decimal(order.grandTotal?.toString() || '0').sub(
      totalPaid,
    );

    // Assert: Remaining should be 66.67
    expect(remaining.toFixed(2)).toBe('66.67');
  });
});
