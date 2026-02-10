// Outbox Module
// Source: Phase 2 - Transactional outbox pattern

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EventBusModule } from '../event-bus/event-bus.module';
import { OutboxService } from './outbox.service';

@Module({
  imports: [PrismaModule, EventBusModule],
  providers: [OutboxService],
  exports: [OutboxService],
})
export class OutboxModule {}
