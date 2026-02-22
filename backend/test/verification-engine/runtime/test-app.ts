import { INestApplication } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../../src/app.module';
import { createValidationPipe } from '../../../src/common/pipes/validation.pipe';
import { HttpExceptionFilter } from '../../../src/common/filters/http-exception.filter';
import { DecimalTransformInterceptor } from '../../../src/common/interceptors/decimal-transform.interceptor';
import { PrismaService } from '../../../src/core/prisma/prisma.service';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import { config as loadEnv } from 'dotenv';
let appPromise: Promise<INestApplication> | null = null;

const assertVerificationEnv = (): void => {
  loadEnv({ path: '.env.local' });
  loadEnv({ path: '.env' });

  if (process.env.NODE_ENV !== 'test') {
    throw new Error(
      'Verification engine requires NODE_ENV=test. Refusing to run.',
    );
  }

  if (process.env.E2E_ALLOW_TRUNCATE !== 'true') {
    throw new Error(
      'Verification engine requires E2E_ALLOW_TRUNCATE=true. Refusing to run.',
    );
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for verification engine.');
  }

  const allowlist = (process.env.E2E_DB_ALLOWLIST || '').toLowerCase();
  if (!allowlist) {
    throw new Error('E2E_DB_ALLOWLIST is required for verification engine.');
  }

  const urlLower = databaseUrl.toLowerCase();
  const allowlisted = urlLower.includes(allowlist);

  if (!allowlisted) {
    throw new Error(
      'DATABASE_URL failed verification. E2E_DB_ALLOWLIST must be present in the connection string.',
    );
  }

  try {
    const parsed = new URL(databaseUrl);
    if (!parsed.password) {
      throw new Error(
        'DATABASE_URL is missing a password. Ensure env vars are loaded for the verification engine.',
      );
    }
  } catch (error) {
    throw new Error(
      `DATABASE_URL is invalid or incomplete for verification engine. ${error instanceof Error ? error.message : ''}`,
    );
  }
};

export const getTestApp = async (): Promise<INestApplication> => {
  if (!appPromise) {
    assertVerificationEnv();
    // eslint-disable-next-line no-console
    console.log('[verification-engine] Bootstrapping test app');

    appPromise = (async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      const app = moduleRef.createNestApplication();

      // Mirror main.ts bootstrapping
      app.use(cookieParser());
      app.use(helmet());

      const corsOrigins =
        process.env.CORS_ORIGIN?.split(',')
          .map((origin) => origin.trim())
          .filter(Boolean) || [];

      app.enableCors({
        origin: corsOrigins.length ? corsOrigins : 'http://localhost:3000',
        credentials: true,
      });

      app.useGlobalPipes(createValidationPipe());
      app.useGlobalFilters(new HttpExceptionFilter());
      app.useGlobalInterceptors(new DecimalTransformInterceptor());

      app.setGlobalPrefix('api/v1', {
        exclude: ['health', 'api/docs', 'api/docs-json'],
      });

      await app.init();

      return app;
    })();
  }

  return appPromise;
};

export const closeTestApp = async (): Promise<void> => {
  if (!appPromise) return;
  const app = await appPromise;
  try {
    const scheduler = app.get(SchedulerRegistry, { strict: false });
    if (scheduler) {
      for (const job of scheduler.getCronJobs().values()) {
        job.stop();
      }
      for (const name of scheduler.getIntervals()) {
        scheduler.deleteInterval(name);
      }
      for (const name of scheduler.getTimeouts()) {
        scheduler.deleteTimeout(name);
      }
    }
  } catch {
    // Ignore scheduler cleanup errors during shutdown.
  }
  try {
    const server = app.getHttpServer?.();
    if (server && typeof server.close === 'function') {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  } catch {
    // Ignore http server cleanup errors during shutdown.
  }
  try {
    const prisma = app.get(PrismaService, { strict: false });
    if (prisma) {
      await prisma.$disconnect();
    }
  } catch {
    // Ignore prisma cleanup errors during shutdown.
  }
  await app.close();
  appPromise = null;
};
