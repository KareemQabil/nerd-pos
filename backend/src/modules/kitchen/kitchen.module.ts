// Kitchen Module
// Source: FINAL/BACKEND/08-MODULE-KITCHEN.md

import { Module } from '@nestjs/common';
import { KitchenController } from './kitchen.controller';
import { KitchenService } from './kitchen.service';
import { KitchenRepository } from './kitchen.repository';
import { KitchenGateway } from './kitchen.gateway';
import { KitchenEventHandlers } from './kitchen.handlers';

@Module({
  controllers: [KitchenController],
  providers: [
    KitchenService,
    KitchenRepository,
    KitchenGateway,
    KitchenEventHandlers,
  ],
  exports: [KitchenService],
})
export class KitchenModule {}
