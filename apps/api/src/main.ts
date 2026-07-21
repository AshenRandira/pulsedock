import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configuredPort = Number(
    process.env.API_PORT ?? process.env.PORT ?? 4000,
  );
  const port =
    Number.isInteger(configuredPort) && configuredPort > 0
      ? configuredPort
      : 4000;
  const allowedOrigins = (
    process.env.WEB_ORIGIN ?? 'http://localhost:3000,http://localhost:3100'
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: allowedOrigins,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  await app.listen(port);
}
void bootstrap();
