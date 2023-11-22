import { NestFactory } from '@nestjs/core';
import { ValidationPipe, HttpStatus } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import * as passport from 'passport';

import { AppModule } from './app.module';
import { ExcludeInterceptor } from './exclude.interceptor';
import { config } from './config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
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
  app.use(passport.initialize());

  await app.listen(config.port);
  console.log(`Server is running on: ${await app.getUrl()}`);
}
bootstrap();
