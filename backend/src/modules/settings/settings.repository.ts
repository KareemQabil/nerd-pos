// Settings Repository
// Source: FINAL/BACKEND/11-MODULE-SETTINGS.md
// Refactored to follow Repository pattern

import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BaseRepository } from '../../core/repository/base.repository';
import { PrismaService } from '../../core/prisma/prisma.service';
import {
  StoreSetting,
  TaxSetting,
  POSTerminal,
  ModuleSetting,
} from './entities/settings.entity';

@Injectable()
export class SettingsRepository extends BaseRepository<
  StoreSetting,
  'storeSettings'
> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected get model(): 'storeSettings' {
    return 'storeSettings';
  }

  private toJsonInput(
    value?: unknown,
  ): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
    if (value === undefined) return undefined;
    if (value === null) return Prisma.JsonNull;
    return value as Prisma.InputJsonValue;
  }

  // ==================== STORE SETTINGS ====================

  async getStoreSetting(): Promise<StoreSetting | null> {
    return this.prisma.storeSettings.findFirst();
  }

  async updateStoreSetting(
    id: string,
    data: Partial<StoreSetting>,
  ): Promise<StoreSetting> {
    return this.prisma.storeSettings.update({
      where: { id },
      data,
    });
  }

  // ==================== TAX SETTINGS ====================

  async findAllTaxes(): Promise<TaxSetting[]> {
    return this.prisma.taxSetting.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
    });
  }

  async findDefaultTax(): Promise<TaxSetting | null> {
    return this.prisma.taxSetting.findFirst({
      where: { isDefault: true, isActive: true },
    });
  }

  async findTaxById(id: string): Promise<TaxSetting | null> {
    return this.prisma.taxSetting.findUnique({
      where: { id },
    });
  }

  async createTax(
    data: Prisma.TaxSettingCreateInput,
  ): Promise<TaxSetting> {
    return this.prisma.taxSetting.create({
      data: { ...data, isActive: true },
    });
  }

  async updateTax(
    id: string,
    data: Prisma.TaxSettingUpdateInput,
  ): Promise<TaxSetting> {
    return this.prisma.taxSetting.update({
      where: { id },
      data,
    });
  }

  async clearOtherDefaultTaxes(exceptId: string): Promise<void> {
    await this.prisma.taxSetting.updateMany({
      where: { isDefault: true, id: { not: exceptId } },
      data: { isDefault: false },
    });
  }

  // ==================== POS TERMINALS ====================

  async findAllTerminals(): Promise<POSTerminal[]> {
    return this.prisma.pOSTerminal.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async findTerminalByCode(code: string): Promise<POSTerminal | null> {
    return this.prisma.pOSTerminal.findUnique({
      where: { code },
    });
  }

  async findTerminalById(id: string): Promise<POSTerminal | null> {
    return this.prisma.pOSTerminal.findUnique({
      where: { id },
    });
  }

  async createTerminal(
    data: Partial<POSTerminal> & { name: string; nameAr: string; code: string },
  ): Promise<POSTerminal> {
    const createData: Prisma.POSTerminalCreateInput = {
      name: data.name,
      nameAr: data.nameAr,
      code: data.code,
      ipAddress: data.ipAddress ?? null,
      macAddress: data.macAddress ?? null,
      receiptPrinter: this.toJsonInput(data.receiptPrinter ?? null),
      kitchenPrinter: this.toJsonInput(data.kitchenPrinter ?? null),
      labelPrinter: this.toJsonInput(data.labelPrinter ?? null),
      cashDrawerPort: data.cashDrawerPort ?? null,
      customerDisplay: this.toJsonInput(data.customerDisplay ?? null),
      autoOpenDrawer: data.autoOpenDrawer ?? true,
      printReceipt: data.printReceipt ?? true,
      printKitchen: data.printKitchen ?? true,
      currentSessionId: data.currentSessionId ?? null,
      isActive: data.isActive ?? true,
      lastSeenAt: data.lastSeenAt ?? null,
    };

    return this.prisma.pOSTerminal.create({ data: createData });
  }

  async updateTerminal(
    id: string,
    data: Partial<POSTerminal>,
  ): Promise<POSTerminal> {
    const updateData: Prisma.POSTerminalUpdateInput = {
      name: data.name,
      nameAr: data.nameAr,
      code: data.code,
      ipAddress: data.ipAddress ?? undefined,
      macAddress: data.macAddress ?? undefined,
      receiptPrinter: this.toJsonInput(data.receiptPrinter ?? undefined),
      kitchenPrinter: this.toJsonInput(data.kitchenPrinter ?? undefined),
      labelPrinter: this.toJsonInput(data.labelPrinter ?? undefined),
      cashDrawerPort: data.cashDrawerPort ?? undefined,
      customerDisplay: this.toJsonInput(data.customerDisplay ?? undefined),
      autoOpenDrawer: data.autoOpenDrawer ?? undefined,
      printReceipt: data.printReceipt ?? undefined,
      printKitchen: data.printKitchen ?? undefined,
      currentSessionId: data.currentSessionId ?? undefined,
      isActive: data.isActive ?? undefined,
      lastSeenAt: data.lastSeenAt ?? undefined,
    };

    return this.prisma.pOSTerminal.update({
      where: { id },
      data: updateData,
    });
  }

  async countTerminals(): Promise<number> {
    return this.prisma.pOSTerminal.count();
  }

  async updateTerminalHeartbeat(code: string): Promise<void> {
    await this.prisma.pOSTerminal.update({
      where: { code },
      data: { lastSeenAt: new Date() },
    });
  }

  // ==================== MODULE SETTINGS ====================

  async findModuleSetting(module: string): Promise<ModuleSetting | null> {
    return this.prisma.moduleSetting.findUnique({
      where: { module },
    });
  }

  async upsertModuleSetting(
    module: string,
    config: Prisma.InputJsonValue,
  ): Promise<ModuleSetting> {
    return this.prisma.moduleSetting.upsert({
      where: { module },
      update: { config },
      create: { module, config },
    });
  }
}
