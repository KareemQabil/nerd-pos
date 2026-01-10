// Settings Service
import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { IEventBus } from '../../core/event-bus/event-bus.interface';
import { UpdateStoreSettingsDto, CreateTaxSettingDto, UpdateTaxSettingDto, CreatePOSTerminalDto, UpdateModuleSettingDto } from './dto';
import { StoreSettingsUpdatedEvent, TaxSettingCreatedEvent, TerminalRegisteredEvent } from './events/settings.events';
import { StoreSetting, TaxSetting, POSTerminal, ModuleSetting } from './entities/settings.entity';

@Injectable()
export class SettingsService {
    constructor(
        private readonly prisma: PrismaService,
        @Inject('IEventBus') private readonly eventBus: IEventBus,
    ) { }

    // Store Settings
    async getStoreSettings(): Promise<StoreSetting> {
        const settings = await (this.prisma as any).storeSetting.findFirst();
        if (!settings) throw new NotFoundException('Store settings not found');
        return settings;
    }

    async updateStoreSettings(dto: UpdateStoreSettingsDto): Promise<StoreSetting> {
        const current = await (this.prisma as any).storeSetting.findFirst();
        if (!current) throw new NotFoundException('Store settings not found');
        const updated = await (this.prisma as any).storeSetting.update({ where: { id: current.id }, data: dto });
        await this.eventBus.publish('StoreSettingsUpdated', new StoreSettingsUpdatedEvent(updated.id));
        return updated;
    }

    // Tax Settings
    async getTaxSettings(): Promise<TaxSetting[]> {
        return (this.prisma as any).taxSetting.findMany({ where: { isActive: true }, orderBy: { displayOrder: 'asc' } });
    }

    async getDefaultTax(): Promise<TaxSetting> {
        const tax = await (this.prisma as any).taxSetting.findFirst({ where: { isDefault: true, isActive: true } });
        if (!tax) throw new NotFoundException('Default tax not configured');
        return tax;
    }

    async createTaxSetting(dto: CreateTaxSettingDto): Promise<TaxSetting> {
        const tax = await (this.prisma as any).taxSetting.create({ data: { ...dto, isActive: true } });
        await this.eventBus.publish('TaxSettingCreated', new TaxSettingCreatedEvent(tax.id, tax.rate));
        return tax;
    }

    async updateTaxSetting(id: string, dto: UpdateTaxSettingDto): Promise<TaxSetting> {
        return (this.prisma as any).taxSetting.update({ where: { id }, data: dto });
    }

    // POS Terminals
    async getAllTerminals(): Promise<POSTerminal[]> {
        return (this.prisma as any).posTerminal.findMany({ where: { isActive: true } });
    }

    async getTerminalByCode(code: string): Promise<POSTerminal | null> {
        return (this.prisma as any).posTerminal.findUnique({ where: { code } });
    }

    async createTerminal(dto: CreatePOSTerminalDto): Promise<POSTerminal> {
        const terminal = await (this.prisma as any).posTerminal.create({
            data: { ...dto, autoOpenDrawer: dto.autoOpenDrawer ?? true, printReceipt: dto.printReceipt ?? true, printKitchen: dto.printKitchen ?? true, isActive: true },
        });
        await this.eventBus.publish('TerminalRegistered', new TerminalRegisteredEvent(terminal.id, terminal.code));
        return terminal;
    }

    async updateTerminalStatus(id: string, sessionId: string | null): Promise<POSTerminal> {
        return (this.prisma as any).posTerminal.update({ where: { id }, data: { currentSessionId: sessionId, lastSeenAt: new Date() } });
    }

    // Module Settings
    async getModuleSetting(module: string): Promise<ModuleSetting | null> {
        return (this.prisma as any).moduleSetting.findUnique({ where: { module } });
    }

    async updateModuleSetting(dto: UpdateModuleSettingDto): Promise<ModuleSetting> {
        return (this.prisma as any).moduleSetting.upsert({
            where: { module: dto.module },
            update: { config: dto.config },
            create: { module: dto.module, config: dto.config },
        });
    }
}
