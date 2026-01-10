// Main Application Module
// Registers core modules: Prisma, EventBus, and DecimalTransformInterceptor

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './core/prisma/prisma.module';
import { EventBusModule } from './core/event-bus/event-bus.module';
import { DecimalTransformInterceptor } from './common/interceptors/decimal-transform.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,    // Global Prisma service
    EventBusModule,  // Global Event Bus
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: DecimalTransformInterceptor,  // CRITICAL: Transforms Decimals to strings
    },
  ],
})
export class AppModule { }
