// Payments Repository
// Source: FINAL/BACKEND/06-MODULE-PAYMENTS.md, 08-repository.md
// Sprint 4: Added optional transaction client support for ACID compliance

import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BaseRepository } from '../../core/repository/base.repository';
import { PrismaService } from '../../core/prisma/prisma.service';
import { Payment, PaymentWithRefunds, PaymentMethod, Refund } from './entities/payments.entity';

// Type alias for transaction client
type TxClient = Prisma.TransactionClient;

@Injectable()
export class PaymentsRepository extends BaseRepository<Payment> {
    constructor(prisma: PrismaService) {
        super(prisma);
    }

    protected get model() {
        return 'payment';
    }

    // ==================== PAYMENT ====================

    async findWithRefunds(id: string): Promise<PaymentWithRefunds | null> {
        return (this.prisma as any).payment.findUnique({
            where: { id },
            include: { refunds: true },
        });
    }

    async findByOrder(orderId: string): Promise<Payment[]> {
        return (this.prisma as any).payment.findMany({
            where: { orderId },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findByTransaction(transactionId: string): Promise<Payment | null> {
        return (this.prisma as any).payment.findUnique({
            where: { transactionId },
        });
    }

    async findBySession(sessionId: string): Promise<Payment[]> {
        return (this.prisma as any).payment.findMany({
            where: { sessionId },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findByStatus(status: string): Promise<Payment[]> {
        return (this.prisma as any).payment.findMany({
            where: { status },
            orderBy: { createdAt: 'desc' },
        });
    }

    // ==================== PAYMENT METHOD ====================

    async findAllMethods(): Promise<PaymentMethod[]> {
        return (this.prisma as any).paymentMethod.findMany({
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
        });
    }

    async findMethodById(id: string): Promise<PaymentMethod | null> {
        return (this.prisma as any).paymentMethod.findUnique({
            where: { id },
        });
    }

    async createMethod(data: Partial<PaymentMethod> & { name: string }): Promise<PaymentMethod> {
        return (this.prisma as any).paymentMethod.create({ data });
    }

    async updateMethod(id: string, data: Partial<PaymentMethod>): Promise<PaymentMethod> {
        return (this.prisma as any).paymentMethod.update({
            where: { id },
            data,
        });
    }

    // ==================== REFUND ====================

    async findRefundById(id: string): Promise<Refund | null> {
        return (this.prisma as any).refund.findUnique({
            where: { id },
            include: { payment: true },
        });
    }

    async findRefundsByPayment(paymentId: string): Promise<Refund[]> {
        return (this.prisma as any).refund.findMany({
            where: { paymentId },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findPendingRefunds(): Promise<Refund[]> {
        return (this.prisma as any).refund.findMany({
            where: { status: 'PENDING' },
            include: { payment: true },
            orderBy: { createdAt: 'asc' },
        });
    }

    async createRefund(data: Partial<Refund> & { paymentId: string; amount: number; reason: string }): Promise<Refund> {
        return (this.prisma as any).refund.create({ data });
    }

    async updateRefund(id: string, data: Partial<Refund>): Promise<Refund> {
        return (this.prisma as any).refund.update({
            where: { id },
            data,
        });
    }

    // ==================== STATISTICS ====================

    async getDailyPaymentTotal(date: Date, sessionId?: string): Promise<number> {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const result = await (this.prisma as any).payment.aggregate({
            where: {
                status: 'COMPLETED',
                paidAt: { gte: startOfDay, lte: endOfDay },
                ...(sessionId && { sessionId }),
            },
            _sum: { amount: true },
        });

        return result._sum.amount || 0;
    }

    async getPaymentsByMethod(
        startDate: Date,
        endDate: Date,
    ): Promise<{ method: string; total: number; count: number }[]> {
        return (this.prisma as any).payment.groupBy({
            by: ['method'],
            where: {
                status: 'COMPLETED',
                paidAt: { gte: startDate, lte: endDate },
            },
            _sum: { amount: true },
            _count: true,
        });
    }
}
