// Main Application Module
// Registers core modules: Prisma, EventBus, DecimalTransformInterceptor, and feature modules

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './core/prisma/prisma.module';
import { EventBusModule } from './core/event-bus/event-bus.module';
import { DecimalTransformInterceptor } from './common/interceptors/decimal-transform.interceptor';

// Feature Modules
import { ProductsModule } from './modules/products/products.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { SalesModule } from './modules/sales/sales.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { SessionsModule } from './modules/sessions/sessions.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    EventBusModule,
    // Feature Modules
    ProductsModule,
    InventoryModule,
    SalesModule,
    PaymentsModule,
    SessionsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: DecimalTransformInterceptor,
    },
  ],
})
export class AppModule { }
