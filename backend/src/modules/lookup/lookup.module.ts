/**
 * Lookup Module
 * Production Cleanup 2026-01-23
 *
 * Provides generic lookup endpoints for dropdown data.
 * Follows: FINAL/BACKEND/01-MODULE-STRUCTURE.md
 */

import { Module } from '@nestjs/common';
import { LookupController } from './lookup.controller';
import { LookupService } from './lookup.service';
import { PrismaModule } from '../../core/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [LookupController],
  providers: [LookupService],
  exports: [LookupService],
})
export class LookupModule {}
