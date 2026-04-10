import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { HealthLogger } from './health/health-logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });
  app.useLogger(new HealthLogger());
  // Add api prefix to all routes
  app.setGlobalPrefix('api', {
    exclude: ['', 'health', 'health/(.*)'],
  });

  // Global Validation Pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }));

  // Enable CORS
  app.enableCors();
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
