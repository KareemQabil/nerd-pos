// Sessions Module
// Source: FINAL/BACKEND/07-MODULE-SESSIONS.md

import { Module, forwardRef } from '@nestjs/common';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { SessionsRepository } from './sessions.repository';

import { SalesModule } from '../sales/sales.module';
import { OutboxModule } from '../../core/outbox/outbox.module';

@Module({
  imports: [forwardRef(() => SalesModule), OutboxModule],
  controllers: [SessionsController],
  providers: [SessionsService, SessionsRepository],
  exports: [SessionsService],
})
export class SessionsModule {}
