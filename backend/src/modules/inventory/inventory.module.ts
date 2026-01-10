// Inventory Module
// Source: FINAL/BACKEND/04-MODULE-INVENTORY.md
import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { InventoryRepository } from './inventory.repository';
import { FIFOStrategy } from './strategies/fifo.strategy';

@Module({
    controllers: [InventoryController],
    providers: [
        InventoryService,
        InventoryRepository,
        FIFOStrategy,
    ],
    exports: [InventoryService, FIFOStrategy],
})
export class InventoryModule { }
