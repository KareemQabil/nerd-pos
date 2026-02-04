import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { PrismaService } from '../../core/prisma/prisma.service';
import { Public } from '../auth/decorators/public.decorator';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prismaHealth: PrismaHealthIndicator,
    private prisma: PrismaService,
  ) {}

  @Public() // No authentication required
  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      // Increased timeout to 5s for database check (was 1s default)
      () =>
        this.prismaHealth.pingCheck('database', this.prisma, { timeout: 5000 }),
    ]);
  }
}
