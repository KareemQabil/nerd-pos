// Prisma Service with Prisma 7 Driver Adapter
// Prisma 7 requires explicit adapter or accelerateUrl

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly pool?: Pool;

  constructor() {
    const accelerateUrl = process.env.PRISMA_DATABASE_URL;
    if (
      process.env.PRISMA_USE_ACCELERATE === 'true' &&
      accelerateUrl &&
      accelerateUrl.startsWith('prisma+postgres://')
    ) {
      super({ accelerateUrl });
      return;
    }

    const connectionString = process.env.DATABASE_URL;
    const requiresSsl =
      !!connectionString &&
      (connectionString.includes('sslmode=require') ||
        connectionString.includes('db.prisma.io'));

    const pool = new Pool({
      connectionString,
      ssl: requiresSsl ? { rejectUnauthorized: false } : undefined,
    });
    const adapter = new PrismaPg(pool);

    super({ adapter });
    this.pool = pool;
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
    if (this.pool) {
      await this.pool.end();
    }
  }
}
