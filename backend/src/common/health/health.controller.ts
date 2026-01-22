import { Controller, Get } from '@nestjs/common';
import {
    HealthCheck,
    HealthCheckService,
    PrismaHealthIndicator,
} from '@nestjs/terminus';
import { PrismaService } from '../../core/prisma/prisma.service';
import { Public } from '../../modules/auth/decorators/public.decorator';

@Controller('health')
export class HealthController {
    constructor(
        private health: HealthCheckService,
        private prismaHealth: PrismaHealthIndicator,
        private prisma: PrismaService,
    ) { }

    @Public() // No authentication required
    @Get()
    @HealthCheck()
    check() {
        return this.health.check([
            () => this.prismaHealth.pingCheck('database', this.prisma),
        ]);
    }
}
