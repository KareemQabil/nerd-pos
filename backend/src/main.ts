import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { createValidationPipe } from './common/pipes/validation.pipe';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Cookie Parser - MUST be before routes for cookie-based auth
  app.use(cookieParser());

  // Security Headers
  app.use(helmet());

  // CORS - Allow frontend to call API
  const corsOrigins =
    process.env.CORS_ORIGIN?.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean) || [];

  app.enableCors({
    origin: corsOrigins.length ? corsOrigins : 'http://localhost:3000',
    credentials: true,
  });

  // Validation - DTOs will now be validated
  app.useGlobalPipes(createValidationPipe());

  // AUDIT FIX: Register global error filter for standardized JSON responses
  app.useGlobalFilters(new HttpExceptionFilter());

  // MVP FIX: Register global transform interceptor for standard success response envelope
  app.useGlobalInterceptors(new TransformInterceptor());

  // API Prefix - MUST be set BEFORE Swagger for correct path documentation
  // Exclude health (for K8s probes) and swagger paths
  app.setGlobalPrefix('api/v1', {
    exclude: ['health', 'api/docs', 'api/docs-json'],
  });

  // AUDIT FIX: Swagger API Documentation
  // Production Cleanup 2026-01-23: Enhanced with full description and servers
  const config = new DocumentBuilder()
    .setTitle('NerdPOS API')
    .setDescription(
      `
# NerdPOS API Documentation

Point of Sale & ERP System for MENA Region (Saudi Arabia & Egypt)

## Features
- 🍽️ Dine-In, Takeout, Delivery orders
- 💰 Multi-payment methods (Cash, Card, Digital Wallet)
- 🧾 ZATCA-compliant invoicing (Saudi Arabia)
- 👨‍🍳 Kitchen management with ticket routing
- 📊 Real-time reporting and analytics
- 🌐 Arabic-first design (RTL support)

## Response Format
All successful responses follow this structure:
\`\`\`json
{
  "success": true,
  "message": "Request successful",
  "data": { ... },
  "timestamp": "2026-01-23T10:00:00.000Z",
  "path": "/api/v1/...",
  "requestId": "uuid"
}
\`\`\`

All errors follow RFC 9457 Problem Details format.

## Authentication
Most endpoints require a Bearer token obtained from \`POST /auth/login\`
    `,
    )
    .setVersion('1.0.0')
    .setContact('NerdPOS Support', 'https://nerdpos.com', 'support@nerdpos.com')
    .addServer('http://localhost:3001', 'Local Development')
    .addServer('https://api-staging.nerdpos.com', 'Staging')
    .addServer('https://api.nerdpos.com', 'Production')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter JWT token obtained from POST /auth/login',
      },
      'JWT',
    )
    .addTag('Lookup - Reference Data', 'Dropdown data for frontend forms')
    .addTag('Products', 'Product catalog and modifiers')
    .addTag('Sales', 'Orders and transactions')
    .addTag('Payments', 'Payment processing')
    .addTag('Sessions', 'Register sessions')
    .addTag('Kitchen', 'KDS integration')
    .addTag('Customers', 'Customer management')
    .addTag('Compliance', 'ZATCA/ETA invoicing')
    .addTag('Tables', 'Table and floor management')
    .addTag('Inventory', 'Stock management')
    .addTag('Users', 'User management and RBAC')
    .addTag('Settings', 'Store configuration')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`🚀 NerdPOS API running on http://localhost:${port}/api/v1`);
  console.log(`📚 API Docs available at http://localhost:${port}/api/docs`);
  console.log(`❤️  Health Check at http://localhost:${port}/health`);
}
bootstrap();
// reload prisma client
