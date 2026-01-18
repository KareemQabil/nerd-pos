import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { createValidationPipe } from './common/pipes/validation.pipe';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Validation - DTOs will now be validated
  app.useGlobalPipes(createValidationPipe());

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();

