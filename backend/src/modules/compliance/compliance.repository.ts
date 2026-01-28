// Compliance Repository
import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../core/repository/base.repository';
import { PrismaService } from '../../core/prisma/prisma.service';
import { ZATCAInvoice } from './entities/compliance.entity';

@Injectable()
export class ComplianceRepository extends BaseRepository<ZATCAInvoice> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }
  protected get model() {
    return 'complianceInvoice';
  }

  async findByOrder(orderId: string): Promise<ZATCAInvoice | null> {
    return (this.prisma as any).complianceInvoice.findUnique({ where: { orderId } });
  }

  async findLastInvoice(): Promise<ZATCAInvoice | null> {
    return (this.prisma as any).complianceInvoice.findFirst({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findPending(): Promise<ZATCAInvoice[]> {
    return (this.prisma as any).complianceInvoice.findMany({
      where: { submissionStatus: 'PENDING' },
      orderBy: { createdAt: 'asc' },
    });
  }

  async countInvoices(): Promise<number> {
    return (this.prisma as any).complianceInvoice.count();
  }

  async findAllOrdered(): Promise<ZATCAInvoice[]> {
    return (this.prisma as any).complianceInvoice.findMany({
      orderBy: { createdAt: 'asc' },
    });
  }
}
