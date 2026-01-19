/**
 * Settings-Driven Behavior Integration Tests
 *
 * Category E: LEGO Architecture - Settings-Driven Behavior
 *
 * Purpose: Verify system behavior is configured by settings (not hardcoded)
 * Source: FINAL/BACKEND/11-MODULE-SETTINGS.md
 *
 * Verified Implementation:
 * - SettingsService provides getModuleSettings(module)
 * - Default settings per module: inventory, kitchen, loyalty, sales, etc.
 * - Tax settings configurable (15% default, can change)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../../src/core/prisma/prisma.module';
import { EventBusModule } from '../../../src/core/event-bus/event-bus.module';
import { SettingsModule } from '../../../src/modules/settings/settings.module';
import { SettingsService } from '../../../src/modules/settings/settings.service';

describe('Settings-Driven Behavior Integration (Category E)', () => {
  let module: TestingModule;
  let settingsService: SettingsService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PrismaModule,
        EventBusModule,
        SettingsModule,
      ],
    }).compile();

    settingsService = module.get<SettingsService>(SettingsService);
  });

  afterAll(async () => {
    await module.close();
  });

  // E1: Module settings are retrievable
  describe('E1: Module Settings Retrieval', () => {
    it('should retrieve settings for any module', async () => {
      const salesSettings = await settingsService.getModuleSettings('sales');
      expect(salesSettings).toBeDefined();
    });
  });

  // E2: Inventory module settings
  describe('E2: Inventory Settings', () => {
    it('should have configurable lowStockThreshold', async () => {
      const settings = await settingsService.getModuleSettings('inventory');
      expect(settings.lowStockThreshold).toBeDefined();
      expect(typeof settings.lowStockThreshold).toBe('number');
    });

    it('should have FIFO setting', async () => {
      const settings = await settingsService.getModuleSettings('inventory');
      expect(settings.enableFIFO).toBeDefined();
      expect(typeof settings.enableFIFO).toBe('boolean');
    });
  });

  // E3: Kitchen module settings
  describe('E3: Kitchen Settings', () => {
    it('should have auto-routing setting', async () => {
      const settings = await settingsService.getModuleSettings('kitchen');
      expect(settings.autoRoutingEnabled).toBeDefined();
    });

    it('should have default prep time setting', async () => {
      const settings = await settingsService.getModuleSettings('kitchen');
      expect(settings.defaultPrepTime).toBeDefined();
      expect(typeof settings.defaultPrepTime).toBe('number');
    });
  });

  // E4: Loyalty module settings
  describe('E4: Loyalty Settings', () => {
    it('should have points-per-SAR setting', async () => {
      const settings = await settingsService.getModuleSettings('loyalty');
      expect(settings.pointsPerSAR).toBeDefined();
      expect(settings.pointsPerSAR).toBeGreaterThan(0);
    });

    it('should have minimum redemption setting', async () => {
      const settings = await settingsService.getModuleSettings('loyalty');
      expect(settings.minRedemption).toBeDefined();
    });
  });

  // E5: Sales module settings
  describe('E5: Sales Settings', () => {
    it('should have allowNegativeInventory setting', async () => {
      const settings = await settingsService.getModuleSettings('sales');
      expect(settings.allowNegativeInventory).toBeDefined();
      expect(typeof settings.allowNegativeInventory).toBe('boolean');
    });
  });

  // E6: Payments module settings
  describe('E6: Payments Settings', () => {
    it('should have rounding settings', async () => {
      const settings = await settingsService.getModuleSettings('payments');
      expect(settings.enableRounding).toBeDefined();
      expect(settings.roundingPrecision).toBeDefined();
    });
  });

  // E7: Sessions module settings
  describe('E7: Sessions Settings', () => {
    it('should have variance threshold setting', async () => {
      const settings = await settingsService.getModuleSettings('sessions');
      expect(settings.varianceThreshold).toBeDefined();
      expect(typeof settings.varianceThreshold).toBe('number');
    });
  });

  // E8: Compliance module settings
  describe('E8: Compliance Settings', () => {
    it('should have ZATCA enable/disable setting', async () => {
      const settings = await settingsService.getModuleSettings('compliance');
      expect(settings.zatcaEnabled).toBeDefined();
      expect(typeof settings.zatcaEnabled).toBe('boolean');
    });

    it('should have ETA enable/disable setting', async () => {
      const settings = await settingsService.getModuleSettings('compliance');
      expect(settings.etaEnabled).toBeDefined();
    });
  });

  // E9: Discounts module settings
  describe('E9: Discounts Settings', () => {
    it('should have max discount without approval setting', async () => {
      const settings = await settingsService.getModuleSettings('discounts');
      expect(settings.maxDiscountWithoutApproval).toBeDefined();
      expect(typeof settings.maxDiscountWithoutApproval).toBe('number');
    });
  });

  // E10: Unknown module returns empty settings
  describe('E10: Unknown Module Handling', () => {
    it('should return empty object for unknown module', async () => {
      const settings = await settingsService.getModuleSettings('unknownmodule');
      expect(settings).toEqual({});
    });
  });

  // E11: All documented modules have settings
  describe('E11: All Modules Have Settings', () => {
    const documentedModules = [
      'inventory',
      'kitchen',
      'loyalty',
      'sales',
      'products',
      'payments',
      'sessions',
      'customers',
      'tables',
      'discounts',
      'delivery',
      'compliance',
      'reports',
      'audit',
    ];

    it.each(documentedModules)(
      'should have settings for %s module',
      async (moduleName) => {
        const settings = await settingsService.getModuleSettings(moduleName);
        expect(settings).toBeDefined();
        expect(Object.keys(settings).length).toBeGreaterThan(0);
      },
    );
  });
});
