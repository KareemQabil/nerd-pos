/**
 * Plugin System Integration Tests
 *
 * Category A: LEGO Architecture - Module Isolation
 *
 * Purpose: Verify modules can be loaded independently (LEGO bricks)
 * Source: FINAL/01-ARCHITECTURE-OVERVIEW.md (LEGO Pattern)
 *
 * Tests verify:
 * - Core modules always available
 * - Feature modules can be excluded without crashing
 * - Module isolation (A doesn't require B)
 * - EventBus handles missing handlers gracefully
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../../src/core/prisma/prisma.module';
import { EventBusModule } from '../../../src/core/event-bus/event-bus.module';
import { EventBusService } from '../../../src/core/event-bus/event-bus.service';
import { PrismaService } from '../../../src/core/prisma/prisma.service';

// Feature Modules
import { ProductsModule } from '../../../src/modules/products/products.module';
import { SalesModule } from '../../../src/modules/sales/sales.module';
import { InventoryModule } from '../../../src/modules/inventory/inventory.module';
import { SessionsModule } from '../../../src/modules/sessions/sessions.module';

// Services for verification
import { ProductsService } from '../../../src/modules/products/products.service';
import { SalesService } from '../../../src/modules/sales/sales.service';

describe('Plugin System Integration (Category A)', () => {
  // A1: Core modules always available
  describe('A1: Core Modules', () => {
    let module: TestingModule;

    beforeAll(async () => {
      module = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({ isGlobal: true }),
          PrismaModule,
          EventBusModule,
        ],
      }).compile();
    });

    afterAll(async () => {
      await module.close();
    });

    it('should always have PrismaService available', () => {
      const prisma = module.get<PrismaService>(PrismaService);
      expect(prisma).toBeDefined();
    });

    it('should always have EventBusService available', () => {
      const eventBus = module.get<EventBusService>('IEventBus');
      expect(eventBus).toBeDefined();
      expect(typeof eventBus.publish).toBe('function');
      expect(typeof eventBus.subscribe).toBe('function');
    });
  });

  // A2-A4: Sales works without optional modules
  describe('A2-A4: Module Independence', () => {
    let module: TestingModule;

    beforeAll(async () => {
      // Create module with Sales but WITHOUT Kitchen, Compliance, Delivery
      module = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({ isGlobal: true }),
          PrismaModule,
          EventBusModule,
          ProductsModule,
          InventoryModule,
          SessionsModule,
          SalesModule,
          // NO KitchenModule
          // NO ComplianceModule
          // NO DeliveryModule
        ],
      }).compile();
    });

    afterAll(async () => {
      await module.close();
    });

    it('A2: SalesService should be available without KitchenModule', () => {
      const sales = module.get<SalesService>(SalesService);
      expect(sales).toBeDefined();
    });

    it('A3: SalesService should be available without ComplianceModule', () => {
      const sales = module.get<SalesService>(SalesService);
      expect(sales).toBeDefined();
      // Compliance generates invoices, but Sales shouldn't require it
    });

    it('A4: SalesService should be available without DeliveryModule', () => {
      const sales = module.get<SalesService>(SalesService);
      expect(sales).toBeDefined();
      // Delivery handles drivers, but Sales shouldn't require it
    });
  });

  // A5-A6: Graceful exclusion
  describe('A5-A6: Graceful Module Exclusion', () => {
    it('A5: ProductsModule loads without KitchenModule', async () => {
      const module = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({ isGlobal: true }),
          PrismaModule,
          EventBusModule,
          ProductsModule,
          // NO Kitchen - Products shouldn't need it
        ],
      }).compile();

      const products = module.get<ProductsService>(ProductsService);
      expect(products).toBeDefined();

      await module.close();
    });

    it('A6: Core + Products + Inventory loads without Compliance', async () => {
      const module = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({ isGlobal: true }),
          PrismaModule,
          EventBusModule,
          ProductsModule,
          InventoryModule,
          // NO Compliance - basic inventory doesn't need ZATCA
        ],
      }).compile();

      const products = module.get<ProductsService>(ProductsService);
      expect(products).toBeDefined();

      await module.close();
    });
  });

  // A7: EventBus handles missing handlers
  describe('A7: EventBus No-Handler Graceful', () => {
    let module: TestingModule;
    let eventBus: EventBusService;

    beforeAll(async () => {
      module = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({ isGlobal: true }),
          PrismaModule,
          EventBusModule,
        ],
      }).compile();

      eventBus = module.get<EventBusService>('IEventBus');
    });

    afterAll(async () => {
      await module.close();
    });

    it('should handle event with zero handlers gracefully', async () => {
      // Publish event that no module listens to
      await expect(
        eventBus.publish('NonExistentEvent', { test: true }),
      ).resolves.not.toThrow();
    });
  });

  // A8: Module isolation verification
  describe('A8: Module Isolation', () => {
    it('ProductsModule is self-contained (only needs core)', async () => {
      // Minimal module - just core + products
      const module = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({ isGlobal: true }),
          PrismaModule,
          EventBusModule,
          ProductsModule,
        ],
      }).compile();

      const products = module.get<ProductsService>(ProductsService);
      expect(products).toBeDefined();

      // Verify it can perform basic operations
      expect(typeof products.findAllProducts).toBe('function');
      expect(typeof products.findProductById).toBe('function');

      await module.close();
    });
  });
});
