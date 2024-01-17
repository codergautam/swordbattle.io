import { NestFactory } from '@nestjs/core';
import { ValidationPipe, HttpStatus } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import * as passport from 'passport';

import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ExcludeInterceptor } from './exclude.interceptor';
import { config } from './config';
import * as fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Swagger Config
  const config = new DocumentBuilder()
    .setTitle('Swordbattle.io Api Documentation')
    .setDescription('Api Documentation for Swordbattle.io')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  // set swagger Path to /api
  // also sets raw schema path to /api-json
  SwaggerModule.setup(config.swaggerRoute, app, document);

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
  console.log(`Server is running on: ${await app.getUrl()}\nProduction mode ${config.isProduction ? 'enabled' : 'disabled'}`);
}
bootstrap();
