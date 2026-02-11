// Payments Service
// Source: FINAL/BACKEND/06-MODULE-PAYMENTS.md
// Handles: Single/Split payments, Cash change, Refunds with approval

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaymentsRepository } from './payments.repository';
import { PrismaService } from '../../core/prisma/prisma.service';
import { IEventBus } from '../../core/event-bus/event-bus.interface';
import {
  CreatePaymentDto,
  SplitPaymentDto,
  CreateRefundDto,
  CreatePaymentMethodDto,
  UpdatePaymentMethodDto,
} from './dto';
import { RefundCreatedEvent, RefundProcessedEvent } from './events/payments.events';
import { Payment, PaymentMethod, Refund } from './entities/payments.entity';
import { OrderStatus } from '../../core/constants/enums';
import Decimal from 'decimal.js';
import { v4 as uuidv4 } from 'uuid';
import { OutboxService } from '../../core/outbox/outbox.service';

@Injectable()
export class PaymentsService {
  // Auto-approve refunds below this threshold (100 SAR)
  private readonly autoApproveThreshold = new Decimal(100);
  private readonly maxPaymentAmount = new Decimal(999999);

  constructor(
    private readonly repo: PaymentsRepository,
    private readonly prisma: PrismaService, // BLOCK 1: Added for $transaction
    @Inject('IEventBus') private readonly eventBus: IEventBus,
    private readonly outboxService: OutboxService,
  ) {}

  private toNumber(value: unknown): number {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    if (typeof (value as { toNumber?: () => number }).toNumber === 'function') {
      return (value as { toNumber: () => number }).toNumber();
    }
    return Number(value) || 0;
  }

  private async lockOrderAndGetTotals(
    tx: Prisma.TransactionClient,
    orderId: string,
  ): Promise<{
    order: { id: string; grandTotal: Decimal; status: string; sessionId: string };
    totalPaid: Decimal;
  }> {
    const order = await tx.salesOrder.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        grandTotal: true,
        status: true,
        sessionId: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    await (tx as any)
      .$queryRaw`SELECT id FROM sales_orders WHERE id = ${orderId} FOR UPDATE`;
    await (tx as any)
      .$queryRaw`SELECT id FROM payments WHERE order_id = ${orderId} FOR UPDATE`;

    const totals = await tx.payment.aggregate({
      where: { orderId },
      _sum: { amount: true },
    });

    return {
      order,
      totalPaid: new Decimal(totals._sum.amount || 0),
    };
  }

  private async ensureActivePaymentMethod(
    tx: Prisma.TransactionClient,
    method: string,
    transactionId?: string,
  ): Promise<void> {
    const code = (method || '').toUpperCase();
    const paymentMethod = await tx.paymentMethod.findFirst({
      where: { code, isActive: true },
      select: { requiresReference: true, requiresTerminal: true },
    });

    if (!paymentMethod) {
      throw new BadRequestException(`Payment method ${code} is not available`);
    }

    if (paymentMethod.requiresReference && !transactionId) {
      throw new BadRequestException(
        `Payment method ${code} requires a transaction reference`,
      );
    }
  }

  // ==================== SINGLE PAYMENT ====================

  async createPayment(dto: CreatePaymentDto): Promise<Payment> {
    const amount = new Decimal(dto.amount);

    if (!Number.isFinite(dto.amount)) {
      throw new BadRequestException('Payment amount must be a valid number');
    }

    // FORENSIC AUDIT FIX: Validate positive amount
    if (amount.lte(0)) {
      throw new BadRequestException('Payment amount must be greater than 0');
    }
    if (amount.gt(this.maxPaymentAmount)) {
      throw new BadRequestException('Payment amount exceeds maximum limit');
    }

    let changeAmount = new Decimal(0);

    // Calculate change for cash payments
    if (dto.method === 'CASH' && dto.receivedAmount) {
      const received = new Decimal(dto.receivedAmount);
      changeAmount = received.minus(amount);

      if (changeAmount.lessThan(0)) {
        throw new BadRequestException('Insufficient cash received');
      }
    }

    const metadata: Prisma.JsonObject = {};
    if (dto.cardLast4) metadata.cardLast4 = dto.cardLast4;
    if (dto.cardType) metadata.cardType = dto.cardType;
    if (dto.transactionId) metadata.transactionId = dto.transactionId;
    if (dto.tipAmount !== undefined) metadata.tipAmount = dto.tipAmount;

    const { payment, prePaymentCount } = await this.prisma.$transaction(
      async (tx) => {
        await this.ensureActivePaymentMethod(
          tx,
          dto.method,
          dto.transactionId,
        );
        const { order, totalPaid } = await this.lockOrderAndGetTotals(
          tx,
          dto.orderId,
        );

        if (order.status === OrderStatus.CANCELLED) {
          throw new BadRequestException('Cannot pay a cancelled order');
        }

        if (dto.sessionId && order.sessionId !== dto.sessionId) {
          throw new BadRequestException(
            'Payment session does not match order session',
          );
        }

        const orderTotal = new Decimal(order.grandTotal || 0);
        const outstanding = orderTotal.minus(totalPaid);
        if (outstanding.lte(0)) {
          throw new BadRequestException('Order is already fully paid');
        }
        if (amount.greaterThan(outstanding.plus(0.01))) {
          throw new BadRequestException('Payment exceeds outstanding amount');
        }

        const prePaymentCount = await tx.payment.count({
          where: { orderId: dto.orderId },
        });

          const created = await tx.payment.create({
            data: {
              orderId: dto.orderId,
              paymentMethod: dto.method,
              amount: amount.toNumber(),
            amountReceived: dto.receivedAmount
              ? new Decimal(dto.receivedAmount).toNumber()
              : null,
            changeGiven: changeAmount.toNumber(),
            referenceNumber: dto.transactionId || uuidv4(),
            status: 'COMPLETED',
            paymentDate: new Date(),
            sessionId: dto.sessionId,
            processedBy: dto.createdBy,
            ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
          },
        });

          await this.outboxService.enqueue(tx, 'PaymentCreated', {
            paymentId: created.id,
            orderId: dto.orderId,
            sessionId: dto.sessionId,
            method: created.paymentMethod || dto.method,
            amount: amount.toNumber(),
            incrementOrders: prePaymentCount === 0,
            isSplit: false,
          });

          return { payment: created, prePaymentCount };
        },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

      await this.outboxService.flushPending();

      return this.normalizePayment(payment);
    }

  // ==================== SPLIT PAYMENT ====================

  /**
   * Process split payment across multiple methods.
   * BLOCK 1 FIX: Wrapped in $transaction for atomicity - all succeed or all fail.
   */
  async processSplitPayment(dto: SplitPaymentDto): Promise<Payment[]> {
    // Validate total matches order (integration with Sales module)
    const splitTotal = dto.payments.reduce(
      (sum, p) => sum.plus(new Decimal(p.amount)),
      new Decimal(0),
    );

    // ATOMIC: All split payments created together or none
    const { payments, prePaymentCount } = await this.prisma.$transaction(
      async (tx) => {
        const { order, totalPaid } = await this.lockOrderAndGetTotals(
          tx,
          dto.orderId,
        );

        if (order.status === OrderStatus.CANCELLED) {
          throw new BadRequestException('Cannot pay a cancelled order');
        }

        if (dto.sessionId && order.sessionId !== dto.sessionId) {
          throw new BadRequestException(
            'Payment session does not match order session',
          );
        }

        const orderTotal = new Decimal(order.grandTotal || 0);
        const outstanding = orderTotal.minus(totalPaid);
        if (outstanding.lte(0)) {
          throw new BadRequestException('Order is already fully paid');
        }

        const diff = outstanding.minus(splitTotal).abs();
        if (diff.greaterThan(0.01)) {
          throw new BadRequestException(
            `Split payment total (${splitTotal.toFixed(2)}) does not match outstanding amount (${outstanding.toFixed(2)})`,
          );
        }

        const prePaymentCount = await tx.payment.count({
          where: { orderId: dto.orderId },
        });

        const results: Payment[] = [];
        for (const paymentDto of dto.payments) {
          const payment = await this.createPaymentWithTx(
            tx,
            {
              orderId: dto.orderId,
              sessionId: dto.sessionId,
              method: paymentDto.method,
              amount: paymentDto.amount,
              receivedAmount: paymentDto.receivedAmount,
              cardLast4: paymentDto.cardLast4,
              transactionId: paymentDto.transactionId,
              createdBy: dto.userId,
            },
            true,
          );
          results.push(payment);
        }

          await this.outboxService.enqueue(tx, 'PaymentCompleted', {
            orderId: dto.orderId,
            sessionId: dto.sessionId,
            totalAmount: splitTotal.toNumber(),
            paymentCount: results.length,
            incrementOrders: prePaymentCount === 0,
            payments: results.map((payment) => ({
              paymentId: payment.id,
              method: payment.paymentMethod,
              amount: this.toNumber(payment.amount),
            })),
          });

          return { payments: results, prePaymentCount };
        },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    // FORENSIC AUDIT FIX: Events emitted AFTER transaction commits (not inside)
    const normalizedPayments = this.normalizePayments(payments);

    await this.outboxService.flushPending();

      return normalizedPayments;
    }

  /**
   * Transaction-aware payment creation for split payments.
   * @param tx - Prisma transaction client for atomic operations
   */
  private async createPaymentWithTx(
    tx: Prisma.TransactionClient,
    dto: CreatePaymentDto,
    isSplit: boolean = false,
  ): Promise<Payment> {
    if (!Number.isFinite(dto.amount)) {
      throw new BadRequestException('Payment amount must be a valid number');
    }

    const amount = new Decimal(dto.amount);
    if (amount.lte(0)) {
      throw new BadRequestException('Payment amount must be greater than 0');
    }
    if (amount.gt(this.maxPaymentAmount)) {
      throw new BadRequestException('Payment amount exceeds maximum limit');
    }
    let changeAmount = new Decimal(0);

    // Calculate change for cash payments
    if (dto.method === 'CASH' && dto.receivedAmount) {
      const received = new Decimal(dto.receivedAmount);
      changeAmount = received.minus(amount);

      if (changeAmount.lessThan(0)) {
        throw new BadRequestException('Insufficient cash received');
      }
    }

    const metadata: Prisma.JsonObject = {};
    if (dto.cardLast4) metadata.cardLast4 = dto.cardLast4;
    if (dto.cardType) metadata.cardType = dto.cardType;
    if (dto.transactionId) metadata.transactionId = dto.transactionId;
    if (dto.tipAmount !== undefined) metadata.tipAmount = dto.tipAmount;

    await this.ensureActivePaymentMethod(tx, dto.method, dto.transactionId);

      const payment = await (tx as any).payment.create({
        data: {
          orderId: dto.orderId,
          paymentMethod: dto.method,
          amount: amount.toNumber(),
        amountReceived: dto.receivedAmount
          ? new Decimal(dto.receivedAmount).toNumber()
          : null,
        changeGiven: changeAmount.toNumber(),
        referenceNumber: dto.transactionId || uuidv4(),
        status: 'COMPLETED',
        paymentDate: new Date(),
        sessionId: dto.sessionId,
        processedBy: dto.createdBy,
        ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
      },
      });

      await this.outboxService.enqueue(tx, 'PaymentCreated', {
        paymentId: payment.id,
        orderId: dto.orderId,
        sessionId: dto.sessionId,
        method: payment.paymentMethod || dto.method,
        amount: amount.toNumber(),
        incrementOrders: false,
        isSplit,
      });

      return this.normalizePayment(payment);
    }

  // ==================== REFUNDS ====================

  async processRefund(dto: CreateRefundDto): Promise<Refund> {
    const { refund, refundAmount } = await this.prisma.$transaction(
      async (tx) => {
        // Lock payment + refunds to prevent race conditions
        await (tx as any)
          .$queryRaw`SELECT id FROM payments WHERE id = ${dto.paymentId} FOR UPDATE`;
        await (tx as any)
          .$queryRaw`SELECT id FROM refunds WHERE payment_id = ${dto.paymentId} FOR UPDATE`;

        const payment = await (tx as any).payment.findUnique({
          where: { id: dto.paymentId },
        });
        if (!payment) {
          throw new NotFoundException(`Payment ${dto.paymentId} not found`);
        }

        const amount = new Decimal(dto.amount);
        if (amount.lte(0)) {
          throw new BadRequestException('Refund amount must be greater than 0');
        }

        const totals = await (tx as any).refund.aggregate({
          where: {
            paymentId: dto.paymentId,
            status: { in: ['PENDING', 'APPROVED'] },
          },
          _sum: { amount: true },
        });

        const alreadyRefunded = new Decimal(totals._sum.amount || 0);
        const paymentAmount = new Decimal(payment.amount);

        if (alreadyRefunded.plus(amount).greaterThan(paymentAmount)) {
          throw new BadRequestException(
            `Refund amount exceeds payment amount. Max refundable: ${paymentAmount.minus(
              alreadyRefunded,
            )}`,
          );
        }

        const created = await (tx as any).refund.create({
          data: {
            paymentId: dto.paymentId,
            amount: amount.toNumber(),
            reason: dto.reason,
            notes: dto.notes,
            status: 'PENDING',
            createdBy: dto.userId,
          },
        });

        return { refund: created, refundAmount: amount };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    await this.eventBus.publish(
      'RefundCreated',
      new RefundCreatedEvent(refund.id, dto.paymentId, refundAmount.toNumber()),
    );

    // Auto-approve small refunds
    if (refundAmount.lessThanOrEqualTo(this.autoApproveThreshold)) {
      return this.approveRefund(refund.id, dto.userId);
    }

    return refund;
  }

  // BLOCK 1 FIX: Atomic transaction for refund approval + payment update
  async approveRefund(refundId: string, userId: string): Promise<Refund> {
    // ATOMIC: Update refund status AND payment refundedAmount together
    const updatedRefund = await this.prisma.$transaction(
      async (tx) => {
        // Lock refund + payment rows
        await (tx as any)
          .$queryRaw`SELECT id FROM refunds WHERE id = ${refundId} FOR UPDATE`;
        const refund = await (tx as any).refund.findUnique({
          where: { id: refundId },
        });
        if (!refund) {
          throw new NotFoundException(`Refund ${refundId} not found`);
        }
        if (refund.status !== 'PENDING') {
          throw new BadRequestException('Only pending refunds can be approved');
        }

        await (tx as any)
          .$queryRaw`SELECT id FROM payments WHERE id = ${refund.paymentId} FOR UPDATE`;
        const payment = await (tx as any).payment.findUnique({
          where: { id: refund.paymentId },
        });
        if (!payment) {
          throw new NotFoundException(
            `Payment ${refund.paymentId} not found`,
          );
        }

        const approvedTotals = await (tx as any).refund.aggregate({
          where: { paymentId: refund.paymentId, status: 'APPROVED' },
          _sum: { amount: true },
        });

        const alreadyApproved = new Decimal(approvedTotals._sum.amount || 0);
        const newRefundedAmount = alreadyApproved
          .plus(refund.amount)
          .toNumber();

        const paymentAmount = this.toNumber(payment.amount);
        if (newRefundedAmount > paymentAmount) {
          throw new BadRequestException(
            'Refund approval exceeds original payment amount',
          );
        }

        const approved = await (tx as any).refund.update({
          where: { id: refundId },
          data: {
            status: 'APPROVED',
            approvedBy: userId,
            approvedAt: new Date(),
          },
        });

        await (tx as any).payment.update({
          where: { id: refund.paymentId },
          data: {
            refundedAmount: newRefundedAmount,
            status: newRefundedAmount >= paymentAmount ? 'REFUNDED' : 'COMPLETED',
          },
        });

        return approved;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    // Event emission AFTER transaction commits
    await this.eventBus.publish(
      'RefundProcessed',
      new RefundProcessedEvent(
        updatedRefund.id,
        updatedRefund.paymentId,
        this.toNumber(updatedRefund.amount),
      ),
    );

    return updatedRefund;
  }

  async rejectRefund(
    refundId: string,
    userId: string,
    reason: string,
  ): Promise<Refund> {
    const refund = await this.repo.findRefundById(refundId);
    if (!refund) {
      throw new NotFoundException(`Refund ${refundId} not found`);
    }

    return this.repo.updateRefund(refundId, {
      status: 'REJECTED',
      notes: reason,
    });
  }

  async getPendingRefunds(): Promise<Refund[]> {
    return this.repo.findPendingRefunds();
  }

  // ==================== QUERIES ====================

  async findPaymentById(id: string): Promise<Payment> {
    const payment = await this.repo.findById(id);
    if (!payment) {
      throw new NotFoundException(`Payment ${id} not found`);
    }
    return this.normalizePayment(payment);
  }

  async findByOrder(orderId: string): Promise<Payment[]> {
    const payments = await this.repo.findByOrder(orderId);
    return this.normalizePayments(payments);
  }

  async findBySession(sessionId: string): Promise<Payment[]> {
    const payments = await this.repo.findBySession(sessionId);
    return this.normalizePayments(payments);
  }

  // ==================== PAYMENT METHODS ====================

  async getAllPaymentMethods(): Promise<PaymentMethod[]> {
    return this.repo.findAllMethods();
  }

  async createPaymentMethod(
    dto: CreatePaymentMethodDto,
  ): Promise<PaymentMethod> {
    return this.repo.createMethod(dto);
  }

  async updatePaymentMethod(
    id: string,
    dto: UpdatePaymentMethodDto,
  ): Promise<PaymentMethod> {
    return this.repo.updateMethod(id, dto);
  }

  private normalizePayment(payment: Payment): Payment {
    if (!payment) {
      return payment;
    }

    const metadata = (payment as any).metadata || {};

    return {
      ...payment,
      method: (payment as any).method ?? payment.paymentMethod,
      receivedAmount:
        (payment as any).receivedAmount ?? payment.amountReceived ?? null,
      changeAmount:
        (payment as any).changeAmount ?? payment.changeGiven ?? null,
      paidAt: (payment as any).paidAt ?? payment.paymentDate ?? null,
      createdBy: (payment as any).createdBy ?? payment.processedBy,
      cardLast4: metadata.cardLast4 ?? (payment as any).cardLast4,
      cardType: metadata.cardType ?? (payment as any).cardType,
      transactionId: metadata.transactionId ?? (payment as any).transactionId,
      tipAmount: metadata.tipAmount ?? (payment as any).tipAmount,
    };
  }

  private normalizePayments(payments: Payment[]): Payment[] {
    return payments.map((payment) => this.normalizePayment(payment));
  }
}
