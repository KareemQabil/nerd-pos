import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { createValidationPipe } from './common/pipes/validation.pipe';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security Headers
  app.use(helmet());

  // CORS - Allow frontend to call API
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });

  // Validation - DTOs will now be validated
  app.useGlobalPipes(createValidationPipe());

  // AUDIT FIX: Register global error filter for standardized JSON responses
  app.useGlobalFilters(new HttpExceptionFilter());

  // AUDIT FIX: Swagger API Documentation
  const config = new DocumentBuilder()
    .setTitle('NerdPOS API')
    .setDescription('Point of Sale System for Middle East Restaurants')
    .setVersion('1.0')
    .addTag('Products', 'Product catalog and modifiers')
    .addTag('Sales', 'Orders and transactions')
    .addTag('Payments', 'Payment processing')
    .addTag('Sessions', 'Register sessions')
    .addTag('Kitchen', 'KDS integration')
    .addTag('Customers', 'Customer management')
    .addTag('Compliance', 'ZATCA/ETA invoicing')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // API Prefix - versioned endpoints
  app.setGlobalPrefix('api/v1');

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`🚀 NerdPOS API running on http://localhost:${port}/api/v1`);
  console.log(`📚 API Docs available at http://localhost:${port}/api/docs`);
}
bootstrap();
