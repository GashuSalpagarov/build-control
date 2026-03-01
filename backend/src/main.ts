import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as express from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Включаем CORS для фронтенда
  app.enableCors({
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',')
      : ['http://localhost:3000'],
    credentials: true,
  });

  // Раздача загруженных файлов (через Express middleware напрямую, чтобы обойти globalPrefix)
  app.use('/uploads', express.static(join(__dirname, '..', '..', '..', 'uploads')));

  // Глобальный префикс API
  app.setGlobalPrefix('api');

  // Валидация DTO
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`Backend запущен на порту ${port}`);
}
bootstrap();
