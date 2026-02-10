// Sales Module
// Source: FINAL/BACKEND/05-MODULE-SALES.md, 01-create-module workflow

import { Module } from '@nestjs/common';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';

// Import 7-step calculation pipeline
import {
  ItemSubtotalStep,
  ServiceChargeStep,
  DeliveryChargeStep,
  SubtotalBeforeTaxStep,
  TaxStep,
  DiscountStep,
  GrandTotalStep,
} from './calculation-steps';

import { InventoryModule } from '../inventory/inventory.module';
import { OutboxModule } from '../../core/outbox/outbox.module';
import { SessionsModule } from '../sessions/sessions.module';
import { SalesDataModule } from './sales.data.module';

@Module({
  imports: [SessionsModule, InventoryModule, OutboxModule, SalesDataModule],
  controllers: [SalesController],
  providers: [
    SalesService,
    // 7-Step Calculation Pipeline
    ItemSubtotalStep,
    ServiceChargeStep,
    DeliveryChargeStep,
    SubtotalBeforeTaxStep,
    TaxStep,
    DiscountStep,
    GrandTotalStep,
  ],
  exports: [SalesService, SalesDataModule],
})
export class SalesModule {}
