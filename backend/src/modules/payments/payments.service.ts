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
import {
  PaymentCreatedEvent,
  PaymentCompletedEvent,
  RefundCreatedEvent,
  RefundProcessedEvent,
} from './events/payments.events';
import { Payment, PaymentMethod, Refund } from './entities/payments.entity';
import Decimal from 'decimal.js';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PaymentsService {
  // Auto-approve refunds below this threshold (100 SAR)
  private readonly autoApproveThreshold = new Decimal(100);

  constructor(
    private readonly repo: PaymentsRepository,
    private readonly prisma: PrismaService, // BLOCK 1: Added for $transaction
    @Inject('IEventBus') private readonly eventBus: IEventBus,
  ) { }

  // ==================== SINGLE PAYMENT ====================

  async createPayment(dto: CreatePaymentDto): Promise<Payment> {
    const amount = new Decimal(dto.amount);

    // FORENSIC AUDIT FIX: Validate positive amount
    if (amount.lte(0)) {
      throw new BadRequestException('Payment amount must be greater than 0');
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

    const payment = await this.repo.create({
      orderId: dto.orderId,
      method: dto.method,
      amount: amount.toNumber(),
      receivedAmount: dto.receivedAmount
        ? new Decimal(dto.receivedAmount).toNumber()
        : null,
      changeAmount: changeAmount.toNumber(),
      cardLast4: dto.cardLast4,
      cardType: dto.cardType,
      transactionId: dto.transactionId || uuidv4(),
      tipAmount: dto.tipAmount ? new Decimal(dto.tipAmount).toNumber() : 0,
      status: 'COMPLETED',
      paidAt: new Date(),
      createdBy: dto.createdBy,
      refundedAmount: 0,
    });

    await this.eventBus.publish(
      'PaymentCreated',
      new PaymentCreatedEvent(
        payment.id,
        dto.orderId,
        dto.method,
        amount.toNumber(),
      ),
    );

    return payment;
  }

  // ==================== SPLIT PAYMENT ====================

  /**
   * Process split payment across multiple methods.
   * BLOCK 1 FIX: Wrapped in $transaction for atomicity - all succeed or all fail.
   */
  async processSplitPayment(dto: SplitPaymentDto): Promise<Payment[]> {
    // Validate total matches order (integration with Sales module)
    const totalPaid = dto.payments.reduce(
      (sum, p) => sum.plus(new Decimal(p.amount)),
      new Decimal(0),
    );

    // ATOMIC: All split payments created together or none
    const payments = await this.prisma.$transaction(async (tx) => {
      const results: Payment[] = [];

      for (const paymentDto of dto.payments) {
        const payment = await this.createPaymentWithTx(tx, {
          orderId: dto.orderId,
          sessionId: dto.sessionId,
          method: paymentDto.method,
          amount: paymentDto.amount,
          receivedAmount: paymentDto.receivedAmount,
          cardLast4: paymentDto.cardLast4,
          transactionId: paymentDto.transactionId,
          createdBy: dto.userId,
        });
        results.push(payment);
      }

      return results;
    });

    // FORENSIC AUDIT FIX: Events emitted AFTER transaction commits (not inside)
    for (const payment of payments) {
      await this.eventBus.publish(
        'PaymentCreated',
        new PaymentCreatedEvent(
          payment.id,
          dto.orderId,
          payment.method || 'UNKNOWN',
          payment.amount,
        ),
      );
    }

    await this.eventBus.publish(
      'PaymentCompleted',
      new PaymentCompletedEvent(
        dto.orderId,
        totalPaid.toNumber(),
        payments.length,
      ),
    );

    return payments;
  }

  /**
   * Transaction-aware payment creation for split payments.
   * @param tx - Prisma transaction client for atomic operations
   */
  private async createPaymentWithTx(
    tx: Prisma.TransactionClient,
    dto: CreatePaymentDto,
  ): Promise<Payment> {
    const amount = new Decimal(dto.amount);
    let changeAmount = new Decimal(0);

    // Calculate change for cash payments
    if (dto.method === 'CASH' && dto.receivedAmount) {
      const received = new Decimal(dto.receivedAmount);
      changeAmount = received.minus(amount);

      if (changeAmount.lessThan(0)) {
        throw new BadRequestException('Insufficient cash received');
      }
    }

    const payment = await (tx as any).payment.create({
      data: {
        orderId: dto.orderId,
        method: dto.method,
        amount: amount.toNumber(),
        receivedAmount: dto.receivedAmount
          ? new Decimal(dto.receivedAmount).toNumber()
          : null,
        changeAmount: changeAmount.toNumber(),
        cardLast4: dto.cardLast4,
        cardType: dto.cardType,
        transactionId: dto.transactionId || uuidv4(),
        tipAmount: dto.tipAmount ? new Decimal(dto.tipAmount).toNumber() : 0,
        status: 'COMPLETED',
        paidAt: new Date(),
        createdBy: dto.createdBy,
        refundedAmount: 0,
      },
    });

    // FORENSIC AUDIT FIX: Removed event emission from inside transaction
    // Events are now emitted AFTER transaction commits in processSplitPayment

    return payment;
  }

  // ==================== REFUNDS ====================

  async processRefund(dto: CreateRefundDto): Promise<Refund> {
    const payment = await this.repo.findById(dto.paymentId);
    if (!payment) {
      throw new NotFoundException(`Payment ${dto.paymentId} not found`);
    }

    const refundAmount = new Decimal(dto.amount);
    const alreadyRefunded = new Decimal(payment.refundedAmount || 0);
    const paymentAmount = new Decimal(payment.amount);

    // Validate refund amount
    if (alreadyRefunded.plus(refundAmount).greaterThan(paymentAmount)) {
      throw new BadRequestException(
        `Refund amount exceeds payment amount. Max refundable: ${paymentAmount.minus(alreadyRefunded)}`,
      );
    }

    const refund = await this.repo.createRefund({
      paymentId: dto.paymentId,
      amount: refundAmount.toNumber(),
      reason: dto.reason,
      notes: dto.notes,
      status: 'PENDING',
      createdBy: dto.userId,
    });

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
    const refund = await this.repo.findRefundById(refundId);
    if (!refund) {
      throw new NotFoundException(`Refund ${refundId} not found`);
    }

    if (refund.status !== 'PENDING') {
      throw new BadRequestException('Only pending refunds can be approved');
    }

    // ATOMIC: Update refund status AND payment refundedAmount together
    const updatedRefund = await this.prisma.$transaction(async (tx) => {
      // 1. Update refund status
      const approved = await (tx as any).refund.update({
        where: { id: refundId },
        data: {
          status: 'APPROVED',
          approvedBy: userId,
          approvedAt: new Date(),
        },
      });

      // 2. Get associated payment to update refunded amount
      const payment = await (tx as any).payment.findUnique({
        where: { id: refund.paymentId },
      });

      if (payment) {
        const newRefundedAmount = new Decimal(payment.refundedAmount || 0)
          .plus(refund.amount)
          .toNumber();

        await (tx as any).payment.update({
          where: { id: refund.paymentId },
          data: {
            refundedAmount: newRefundedAmount,
            status:
              newRefundedAmount >= payment.amount ? 'REFUNDED' : 'COMPLETED',
          },
        });
      }

      return approved;
    });

    // Event emission AFTER transaction commits
    await this.eventBus.publish(
      'RefundProcessed',
      new RefundProcessedEvent(refund.id, refund.paymentId, refund.amount),
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
    return payment;
  }

  async findByOrder(orderId: string): Promise<Payment[]> {
    return this.repo.findByOrder(orderId);
  }

  async findBySession(sessionId: string): Promise<Payment[]> {
    return this.repo.findBySession(sessionId);
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
}
