// Sales Data Module
// Provides repository-only access to Sales data without service coupling.

import { Module } from '@nestjs/common';
import { SalesRepository } from './sales.repository';

@Module({
  providers: [SalesRepository],
  exports: [SalesRepository],
})
export class SalesDataModule {}
