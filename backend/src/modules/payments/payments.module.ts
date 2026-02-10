// Payments Module
// Source: FINAL/BACKEND/06-MODULE-PAYMENTS.md

import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentsRepository } from './payments.repository';
import { OutboxModule } from '../../core/outbox/outbox.module';

@Module({
  imports: [OutboxModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentsRepository],
  exports: [PaymentsService],
})
export class PaymentsModule {}
