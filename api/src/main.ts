import { NestFactory } from '@nestjs/core';
import { ValidationPipe, HttpStatus } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as cookieParser from 'cookie-parser';

import { AppModule } from './app.module';
import { ExcludeInterceptor } from './exclude.interceptor';
import { config } from './config';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.set('trust proxy', true);

  app.use(cookieParser(config.appSecret));
  app.enableCors({
    origin: (origin, callback) => callback(null, true),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    }),
  );
  app.useGlobalInterceptors(new ExcludeInterceptor());

  await app.listen(config.port);
  console.log(`Server is running on: ${await app.getUrl()}\nProduction mode ${config.isProduction ? 'enabled' : 'disabled'}`);
  console.log('=====================================================');
  console.log('SERVER STARTED - BUILD TIMESTAMP:', new Date().toISOString());
  console.log('CrazyGames auth endpoint available at /auth/crazygames/login');
  console.log('=====================================================');
}
bootstrap();
