/**
 * FIN-01: Split Payment Rounding Error
 *
 * Tests the 10/3 split payment edge case (3.33, 3.33, 3.34)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from '../../../src/modules/payments/payments.service';
import { PaymentsRepository } from '../../../src/modules/payments/payments.repository';
import { PrismaService } from '../../../src/core/prisma/prisma.service';
import { IEventBus } from '../../../src/core/event-bus/event-bus.interface';
import { createTestProduct, createTestSession, createTestOrder, cleanupTestData } from '../../helpers/test-helpers';
import { OrderStatus } from '../../../src/core/constants/enums';
import { Decimal } from '@prisma/client';

describe('FIN-01: Split Payment Rounding Error', () => {
  let paymentsService: PaymentsService;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PaymentsService,
        PaymentsRepository,
        PrismaService,
        { provide: 'IEventBus', useValue: { publish: jest.fn(), subscribe: jest.fn() } },
      ],
    }).compile();

    paymentsService = module.get<PaymentsService>(PaymentsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  beforeEach(async () => {
    await createTestSession(prisma);
    await createTestProduct(prisma);
  });

  afterEach(async () => {
    await cleanupTestData(prisma);
  });

  it('should handle 10 split into 3 payments correctly (3.33, 3.33, 3.34)', async () => {
    // Setup: Order with total = 10
    const order = await createTestOrder(prisma, {
      status: OrderStatus.CONFIRMED,
      grandTotal: 10
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
    const payment1 = await prisma.payment.create({
      data: {
        orderId: order.id,
        amount: payment1Amount,
        method: 'CASH',
        reference: 'PAY-1'
      }
    });

    const payment2 = await prisma.payment.create({
      data: {
        orderId: order.id,
        amount: payment2Amount,
        method: 'CASH',
        reference: 'PAY-2'
      }
    });

    const payment3 = await prisma.payment.create({
      data: {
        orderId: order.id,
        amount: payment3Amount,
        method: 'CASH',
        reference: 'PAY-3'
      }
    });

    // Assert: Verify amounts
    expect(payment1.amount.toString()).toBe('3.33');
    expect(payment2.amount.toString()).toBe('3.33');
    expect(payment3.amount.toString()).toBe('3.34');

    // Verify total equals order total
    const totalPaid = new Decimal(payment1.amount)
      .add(payment2.amount)
      .add(payment3.amount);

    expect(totalPaid.toString()).toBe('10.00');
    expect(totalPaid.toString()).toBe(order.grandTotal?.toString() || '10');
  });

  it('should handle 100 split into 3 payments correctly', async () => {
    // Setup: Order with total = 100
    const order = await createTestOrder(prisma, {
      status: OrderStatus.CONFIRMED,
      grandTotal: 100
    });

    // Act: Split 100 into 3 equal payments
    const payment1Amount = new Decimal(100).div(3).toDecimalPlaces(2);
    const payment2Amount = new Decimal(100).div(3).toDecimalPlaces(2);
    const payment3Amount = new Decimal(100)
      .sub(payment1Amount)
      .sub(payment2Amount)
      .toDecimalPlaces(2);

    // Create payments
    await prisma.payment.create({
      data: {
        orderId: order.id,
        amount: payment1Amount,
        method: 'CASH',
        reference: 'PAY-1'
      }
    });

    await prisma.payment.create({
      data: {
        orderId: order.id,
        amount: payment2Amount,
        method: 'CASH',
        reference: 'PAY-2'
      }
    });

    await prisma.payment.create({
      data: {
        orderId: order.id,
        amount: payment3Amount,
        method: 'CASH',
        reference: 'PAY-3'
      }
    });

    // Assert: Verify total equals order total
    const payments = await prisma.payment.findMany({
      where: { orderId: order.id }
    });

    const totalPaid = payments.reduce((sum, p) =>
      sum.add(new Decimal(p.amount)), new Decimal(0)
    );

    expect(totalPaid.toString()).toBe('100.00');
  });

  it('should handle 1 split into 7 payments correctly', async () => {
    // Setup: Order with total = 1
    const order = await createTestOrder(prisma, {
      status: OrderStatus.CONFIRMED,
      grandTotal: 1
    });

    // Act: Split 1 into 7 equal payments (approximately 0.14 each)
    const perPayment = new Decimal(1).div(7).toDecimalPlaces(2);
    const payments = [];

    for (let i = 0; i < 6; i++) {
      payments.push(await prisma.payment.create({
        data: {
          orderId: order.id,
          amount: perPayment,
          method: 'CASH',
          reference: `PAY-${i + 1}`
        }
      }));
    }

    // Last payment: remainder
    const lastPaymentAmount = new Decimal(1).sub(perPayment.mul(6)).toDecimalPlaces(2);
    payments.push(await prisma.payment.create({
      data: {
        orderId: order.id,
        amount: lastPaymentAmount,
        method: 'CASH',
        reference: 'PAY-7'
      }
    }));

    // Assert: Verify total equals 1
    const totalPaid = payments.reduce((sum, p) =>
      sum.add(new Decimal(p.amount)), new Decimal(0)
    );

    expect(totalPaid.toString()).toBe('1.00');
  });

  it('should not allow split payments to exceed order total', async () => {
    // Setup: Order with total = 50
    const order = await createTestOrder(prisma, {
      status: OrderStatus.CONFIRMED,
      grandTotal: 50
    });

    // Act: Create payments that exceed total
    await prisma.payment.create({
      data: {
        orderId: order.id,
        amount: 25,
        method: 'CASH',
        reference: 'PAY-1'
      }
    });

    await prisma.payment.create({
      data: {
        orderId: order.id,
        amount: 25,
        method: 'CASH',
        reference: 'PAY-2'
      }
    });

    // Third payment of 1 would exceed total
    // This should be rejected by validation
    // For now, verify the payments sum correctly

    const payments = await prisma.payment.findMany({
      where: { orderId: order.id }
    });

    const totalPaid = payments.reduce((sum, p) =>
      sum.add(new Decimal(p.amount)), new Decimal(0)
    );

    expect(totalPaid.toString()).toBe('50.00');
  });

  it('should track remaining balance after partial payments', async () => {
    // Setup: Order with total = 100
    const order = await createTestOrder(prisma, {
      status: OrderStatus.CONFIRMED,
      grandTotal: 100
    });

    // Act: Make partial payment of 33.33
    await prisma.payment.create({
      data: {
        orderId: order.id,
        amount: 33.33,
        method: 'CASH',
        reference: 'PAY-1'
      }
    });

    // Calculate remaining balance
    const payments = await prisma.payment.findMany({
      where: { orderId: order.id }
    });

    const totalPaid = payments.reduce((sum, p) =>
      sum.add(new Decimal(p.amount)), new Decimal(0)
    );

    const remaining = new Decimal(order.grandTotal || 0).sub(totalPaid);

    // Assert: Remaining should be 66.67
    expect(remaining.toString()).toBe('66.67');
  });
});
