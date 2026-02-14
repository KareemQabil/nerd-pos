// Inbox Module
// Provides idempotent processing for event handlers

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { InboxService } from './inbox.service';

@Module({
  imports: [PrismaModule],
  providers: [InboxService],
  exports: [InboxService],
})
export class InboxModule {}
