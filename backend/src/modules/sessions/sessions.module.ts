// Sessions Module
// Source: FINAL/BACKEND/07-MODULE-SESSIONS.md

import { Module } from '@nestjs/common';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { SessionsRepository } from './sessions.repository';
import { SessionsPaymentsHandler } from './sessions.handlers';

import { SalesDataModule } from '../sales/sales.data.module';
import { OutboxModule } from '../../core/outbox/outbox.module';

@Module({
  imports: [SalesDataModule, OutboxModule],
  controllers: [SessionsController],
  providers: [SessionsService, SessionsRepository, SessionsPaymentsHandler],
  exports: [SessionsService],
})
export class SessionsModule {}
