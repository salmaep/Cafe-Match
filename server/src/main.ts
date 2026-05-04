import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { json } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(json({ limit: '10mb' }));

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.enableCors({
    origin: [
      'http://localhost:3083',
      'http://localhost:5173',
      'https://salma.imola.ai',
      /.*\.expo\.dev$/,
      /^http:\/\/192\.168\./,
    ],
    credentials: true,
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  const url = await app.getUrl();
  console.log(`\n🚀  Server running at ${url}/api/v1\n`);
}
bootstrap();