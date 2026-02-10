// Compliance Repository
import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../core/repository/base.repository';
import { PrismaService } from '../../core/prisma/prisma.service';
import { ComplianceSettings, ZATCAInvoice } from './entities/compliance.entity';

@Injectable()
export class ComplianceRepository extends BaseRepository<
  ZATCAInvoice,
  'complianceInvoice'
> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }
  protected get model(): 'complianceInvoice' {
    return 'complianceInvoice';
  }

  async findByOrder(orderId: string): Promise<ZATCAInvoice | null> {
    return this.prisma.complianceInvoice.findUnique({
      where: { orderId },
    });
  }

  async findLastInvoice(): Promise<ZATCAInvoice | null> {
    return this.prisma.complianceInvoice.findFirst({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findPending(): Promise<ZATCAInvoice[]> {
    return this.prisma.complianceInvoice.findMany({
      where: { submissionStatus: 'PENDING' },
      orderBy: { createdAt: 'asc' },
    });
  }

  async countInvoices(): Promise<number> {
    return this.prisma.complianceInvoice.count();
  }

  async findAllOrdered(): Promise<ZATCAInvoice[]> {
    return this.prisma.complianceInvoice.findMany({
      orderBy: { createdAt: 'asc' },
    });
  }

  async getSettings(): Promise<ComplianceSettings | null> {
    return this.prisma.complianceSettings.findFirst();
  }
}
