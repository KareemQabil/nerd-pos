// Settings Repository
// Source: FINAL/BACKEND/11-MODULE-SETTINGS.md
// Refactored to follow Repository pattern

import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../core/repository/base.repository';
import { PrismaService } from '../../core/prisma/prisma.service';
import { StoreSetting, TaxSetting, POSTerminal, ModuleSetting } from './entities/settings.entity';

@Injectable()
export class SettingsRepository extends BaseRepository<StoreSetting> {
    constructor(prisma: PrismaService) {
        super(prisma);
    }

    protected get model() {
        return 'storeSetting';
    }

    // ==================== STORE SETTINGS ====================

    async getStoreSetting(): Promise<StoreSetting | null> {
        return (this.prisma as any).storeSetting.findFirst();
    }

    async updateStoreSetting(id: string, data: Partial<StoreSetting>): Promise<StoreSetting> {
        return (this.prisma as any).storeSetting.update({
            where: { id },
            data,
        });
    }

    // ==================== TAX SETTINGS ====================

    async findAllTaxes(): Promise<TaxSetting[]> {
        return (this.prisma as any).taxSetting.findMany({
            where: { isActive: true },
            orderBy: { displayOrder: 'asc' },
        });
    }

    async findDefaultTax(): Promise<TaxSetting | null> {
        return (this.prisma as any).taxSetting.findFirst({
            where: { isDefault: true, isActive: true },
        });
    }

    async findTaxById(id: string): Promise<TaxSetting | null> {
        return (this.prisma as any).taxSetting.findUnique({
            where: { id },
        });
    }

    async createTax(data: Omit<TaxSetting, 'id'>): Promise<TaxSetting> {
        return (this.prisma as any).taxSetting.create({
            data: { ...data, isActive: true },
        });
    }

    async updateTax(id: string, data: Partial<TaxSetting>): Promise<TaxSetting> {
        return (this.prisma as any).taxSetting.update({
            where: { id },
            data,
        });
    }

    async clearOtherDefaultTaxes(exceptId: string): Promise<void> {
        await (this.prisma as any).taxSetting.updateMany({
            where: { isDefault: true, id: { not: exceptId } },
            data: { isDefault: false },
        });
    }

    // ==================== POS TERMINALS ====================

    async findAllTerminals(): Promise<POSTerminal[]> {
        return (this.prisma as any).posTerminal.findMany({
            where: { isActive: true },
            orderBy: { name: 'asc' },
        });
    }

    async findTerminalByCode(code: string): Promise<POSTerminal | null> {
        return (this.prisma as any).posTerminal.findUnique({
            where: { code },
        });
    }

    async findTerminalById(id: string): Promise<POSTerminal | null> {
        return (this.prisma as any).posTerminal.findUnique({
            where: { id },
        });
    }

    async createTerminal(data: Omit<POSTerminal, 'id' | 'createdAt' | 'updatedAt'>): Promise<POSTerminal> {
        return (this.prisma as any).posTerminal.create({
            data: { ...data, isActive: true },
        });
    }

    async updateTerminal(id: string, data: Partial<POSTerminal>): Promise<POSTerminal> {
        return (this.prisma as any).posTerminal.update({
            where: { id },
            data,
        });
    }

    async countTerminals(): Promise<number> {
        return (this.prisma as any).posTerminal.count();
    }

    async updateTerminalHeartbeat(code: string): Promise<void> {
        await (this.prisma as any).posTerminal.update({
            where: { code },
            data: { lastSeenAt: new Date() },
        });
    }

    // ==================== MODULE SETTINGS ====================

    async findModuleSetting(module: string): Promise<ModuleSetting | null> {
        return (this.prisma as any).moduleSetting.findUnique({
            where: { module },
        });
    }

    async upsertModuleSetting(module: string, config: Record<string, unknown>): Promise<ModuleSetting> {
        return (this.prisma as any).moduleSetting.upsert({
            where: { module },
            update: { config },
            create: { module, config },
        });
    }
}
