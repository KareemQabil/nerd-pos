// Delivery Module
import { Module } from '@nestjs/common';
import { DeliveryController } from './delivery.controller';
import { DeliveryService } from './delivery.service';
import { DeliveryRepository } from './delivery.repository';

@Module({
    controllers: [DeliveryController],
    providers: [DeliveryService, DeliveryRepository],
    exports: [DeliveryService],
})
export class DeliveryModule { }
