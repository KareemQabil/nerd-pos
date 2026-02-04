// Settings Service
// Source: FINAL/BACKEND/11-MODULE-SETTINGS.md
// Refactored to use Repository pattern (like all other modules)

import { Injectable, Inject } from '@nestjs/common';
import { SettingsRepository } from './settings.repository';
import { IEventBus } from '../../core/event-bus/event-bus.interface';
import { ErrorMessages } from '../../common/constants';
import { NotFoundAppException } from '../../common/exceptions';
import {
  UpdateStoreSettingsDto,
  CreateTaxSettingDto,
  UpdateTaxSettingDto,
  CreatePOSTerminalDto,
  UpdateModuleSettingDto,
} from './dto';
import {
  StoreSettingsUpdatedEvent,
  TaxSettingCreatedEvent,
  TerminalRegisteredEvent,
} from './events/settings.events';
import {
  StoreSetting,
  TaxSetting,
  POSTerminal,
  ModuleSetting,
} from './entities/settings.entity';
import Decimal from 'decimal.js';

@Injectable()
export class SettingsService {
  constructor(
    private readonly repo: SettingsRepository,
    @Inject('IEventBus') private readonly eventBus: IEventBus,
  ) { }

  // ==================== STORE SETTINGS ====================

  async getStoreSettings(): Promise<StoreSetting> {
    const settings = await this.repo.getStoreSetting();
    if (!settings) {
      throw new NotFoundAppException(ErrorMessages.StoreSettingsNotFound);
    }
    return settings;
  }

  async updateStoreSettings(
    dto: UpdateStoreSettingsDto,
  ): Promise<StoreSetting> {
    const current = await this.repo.getStoreSetting();
    if (!current) {
      throw new NotFoundAppException(ErrorMessages.StoreSettingsNotFound);
    }

    const updated = await this.repo.updateStoreSetting(current.id, dto);

    await this.eventBus.publish(
      'StoreSettingsUpdated',
      new StoreSettingsUpdatedEvent(updated.id),
    );

    return updated;
  }

  // ==================== TAX SETTINGS ====================

  async getTaxSettings(): Promise<TaxSetting[]> {
    return this.repo.findAllTaxes();
  }

  async getDefaultTax(): Promise<TaxSetting> {
    const tax = await this.repo.findDefaultTax();
    if (!tax) {
      throw new NotFoundAppException(ErrorMessages.DefaultTaxNotConfigured);
    }
    return tax;
  }

  async createTaxSetting(dto: CreateTaxSettingDto): Promise<TaxSetting> {
    const tax = await this.repo.createTax({
      name: dto.name,
      nameAr: dto.nameAr,
      rate: new Decimal(dto.rate).toNumber(),
      isDefault: dto.isDefault || false,
      applyToProducts: dto.applyToProducts !== false,
      applyToServices: dto.applyToServices !== false,
      exemptCategories: dto.exemptCategories || [],
      displayOrder: dto.displayOrder || 0,
    });

    // If set as default, remove default from others
    if (dto.isDefault) {
      await this.repo.clearOtherDefaultTaxes(tax.id);
    }

    await this.eventBus.publish(
      'TaxSettingCreated',
      new TaxSettingCreatedEvent(tax.id, tax.rate),
    );

    return tax;
  }

  async updateTaxSetting(
    id: string,
    dto: UpdateTaxSettingDto,
  ): Promise<TaxSetting> {
    const updateData: Partial<UpdateTaxSettingDto> & { rate?: number } = { ...dto };
    if (dto.rate !== undefined) {
      updateData.rate = new Decimal(dto.rate).toNumber();
    }

    const tax = await this.repo.updateTax(id, updateData);

    // If set as default, remove default from others
    if (dto.isDefault) {
      await this.repo.clearOtherDefaultTaxes(id);
    }

    return tax;
  }

  // ==================== POS TERMINALS ====================

  async getAllTerminals(): Promise<POSTerminal[]> {
    return this.repo.findAllTerminals();
  }

  async getTerminalByCode(code: string): Promise<POSTerminal> {
    const terminal = await this.repo.findTerminalByCode(code);
    if (!terminal) {
      throw new NotFoundAppException(ErrorMessages.TerminalNotFound, {
        terminalCode: code,
      });
    }
    return terminal;
  }

  async registerTerminal(dto: CreatePOSTerminalDto): Promise<POSTerminal> {
    // Auto-generate code if not provided
    let code = dto.code;
    if (!code) {
      code = await this.generateTerminalCode();
    }

    const terminal = await this.repo.createTerminal({
      name: dto.name,
      nameAr: dto.nameAr,
      code,
      ipAddress: dto.ipAddress,
      receiptPrinter: dto.receiptPrinter,
      kitchenPrinter: dto.kitchenPrinter,
      autoOpenDrawer: dto.autoOpenDrawer !== false,
      printReceipt: dto.printReceipt !== false,
      printKitchen: dto.printKitchen !== false,
    });

    await this.eventBus.publish(
      'TerminalRegistered',
      new TerminalRegisteredEvent(terminal.id, terminal.code),
    );

    return terminal;
  }

  async updateTerminal(
    id: string,
    dto: Partial<CreatePOSTerminalDto>,
  ): Promise<POSTerminal> {
    return this.repo.updateTerminal(id, dto);
  }

  async updateTerminalSession(
    id: string,
    sessionId: string | null,
  ): Promise<POSTerminal> {
    return this.repo.updateTerminal(id, {
      currentSessionId: sessionId,
      lastSeenAt: new Date(),
    });
  }

  async heartbeat(terminalCode: string): Promise<void> {
    await this.repo.updateTerminalHeartbeat(terminalCode);
  }

  private async generateTerminalCode(): Promise<string> {
    const count = await this.repo.countTerminals();
    return `TERM${(count + 1).toString().padStart(3, '0')}`;
  }

  // ==================== MODULE SETTINGS ====================

  async getModuleSettings(module: string): Promise<Record<string, unknown>> {
    const settings = await this.repo.findModuleSetting(module);
    if (!settings) {
      return this.getDefaultModuleSettings(module);
    }
    return settings.config as Record<string, unknown>;
  }

  async updateModuleSettings(module: string, config: Record<string, unknown>): Promise<Record<string, unknown>> {
    await this.repo.upsertModuleSetting(module, config);
    return config;
  }

  private getDefaultModuleSettings(module: string): Record<string, unknown> {
    const defaults: Record<string, Record<string, unknown>> = {
      // Existing documented defaults
      inventory: {
        lowStockThreshold: 10,
        enableFIFO: true,
        autoReorder: false,
      },
      kitchen: {
        autoRoutingEnabled: true,
        defaultPrepTime: 15,
        notificationSound: true,
      },
      loyalty: {
        pointsPerSAR: 1,
        pointsToSAR: 0.01,
        minRedemption: 100,
      },
      sales: {
        allowNegativeInventory: false,
        requireCustomer: false,
        autoApplyDiscounts: true,
      },
      // Additional module defaults
      products: {
        defaultSKUPrefix: 'PRD',
        autoGenerateSKU: true,
        allowDuplicateNames: false,
      },
      payments: {
        defaultMethod: 'CASH',
        enableTips: true,
        enableRounding: true,
        roundingPrecision: 0.05,
      },
      sessions: {
        autoCloseTime: null,
        varianceThreshold: 10,
        requireBlindCount: false,
      },
      customers: {
        requirePhone: true,
        enableLoyalty: true,
        defaultTier: 'REGULAR',
      },
      tables: {
        defaultReservationDuration: 120,
        autoReleaseAfterPayment: true,
        enableWaiterAssignment: true,
      },
      discounts: {
        maxDiscountWithoutApproval: 20,
        autoApplyPromotions: true,
        stackDiscounts: false,
      },
      delivery: {
        defaultPrepTime: 30,
        enableZonePricing: true,
        trackDriverLocation: true,
      },
      compliance: {
        zatcaEnabled: false,
        etaEnabled: false,
        autoSubmit: false,
      },
      reports: {
        defaultDateRange: 7,
        enableExport: true,
        scheduledReports: false,
      },
      audit: {
        retentionDays: 365,
        logAllActions: true,
        sensitiveFieldsMask: true,
      },
    };

    return defaults[module] || {};
  }
}
