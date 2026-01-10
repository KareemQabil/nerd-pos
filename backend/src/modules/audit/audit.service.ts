// Audit Service
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuditLog } from './entities/audit.entity';
import { CreateAuditLogDto } from './dto';

@Injectable()
export class AuditService {
    constructor(private readonly prisma: PrismaService) { }

    async log(dto: CreateAuditLogDto): Promise<void> {
        let changes = null;
        if (dto.before && dto.after) {
            changes = this.calculateDiff(dto.before, dto.after);
        }
        await (this.prisma as any).auditLog.create({
            data: { ...dto, changes, businessDate: new Date() },
        });
    }

    private calculateDiff(before: any, after: any): any {
        const changes: any = {};
        for (const key of Object.keys(after)) {
            if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
                changes[key] = { from: before[key], to: after[key] };
            }
        }
        return changes;
    }

    async findByEntity(entity: string, entityId: string): Promise<AuditLog[]> {
        return (this.prisma as any).auditLog.findMany({
            where: { entity, entityId }, orderBy: { createdAt: 'desc' },
        });
    }

    async findByUser(userId: string, startDate: Date, endDate: Date): Promise<AuditLog[]> {
        return (this.prisma as any).auditLog.findMany({
            where: { userId, createdAt: { gte: startDate, lte: endDate } }, orderBy: { createdAt: 'desc' },
        });
    }

    async findByModule(module: string, startDate: Date, endDate: Date): Promise<AuditLog[]> {
        return (this.prisma as any).auditLog.findMany({
            where: { module, createdAt: { gte: startDate, lte: endDate } }, orderBy: { createdAt: 'desc' },
        });
    }
}
