// Compliance Repository
import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../core/repository/base.repository';
import { PrismaService } from '../../core/prisma/prisma.service';
import { ZATCAInvoice } from './entities/compliance.entity';

@Injectable()
export class ComplianceRepository extends BaseRepository<ZATCAInvoice> {
    constructor(prisma: PrismaService) { super(prisma); }
    protected get model() { return 'zatcaInvoice'; }

    async findByOrder(orderId: string): Promise<ZATCAInvoice | null> {
        return (this.prisma as any).zatcaInvoice.findUnique({ where: { orderId } });
    }

    async findLastInvoice(): Promise<ZATCAInvoice | null> {
        return (this.prisma as any).zatcaInvoice.findFirst({ orderBy: { createdAt: 'desc' } });
    }

    async findPending(): Promise<ZATCAInvoice[]> {
        return (this.prisma as any).zatcaInvoice.findMany({ where: { submissionStatus: 'PENDING' }, orderBy: { createdAt: 'asc' } });
    }

    async countInvoices(): Promise<number> {
        return (this.prisma as any).zatcaInvoice.count();
    }
}
