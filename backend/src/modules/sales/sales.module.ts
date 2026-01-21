// Sales Module
// Source: FINAL/BACKEND/05-MODULE-SALES.md, 01-create-module workflow

import { Module } from '@nestjs/common';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { SalesRepository } from './sales.repository';

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

@Module({
  controllers: [SalesController],
  providers: [
    SalesService,
    SalesRepository,
    // 7-Step Calculation Pipeline
    ItemSubtotalStep,
    ServiceChargeStep,
    DeliveryChargeStep,
    SubtotalBeforeTaxStep,
    TaxStep,
    DiscountStep,
    GrandTotalStep,
  ],
  exports: [SalesService, SalesRepository],
})
export class SalesModule { }
