import { NestFactory } from '@nestjs/core';
import { ValidationPipe, HttpStatus } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import * as session from 'express-session';
import * as connectPgSimple from 'connect-pg-simple';
import * as passport from 'passport';

import { AppModule } from './app.module';
import { ExcludeInterceptor } from './exclude.interceptor';
import { config } from './config';

console.log("config.databaseURL: ", config.databaseURL)

const sessionStore = new (connectPgSimple(session))({
  conString: config.databaseURL,
  tableName: 'sessions',
});

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    }),
  );
  app.useGlobalInterceptors(new ExcludeInterceptor());

  app.use(cookieParser(config.appSecret));
  app.use(session({
    secret: config.appSecret,
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      httpOnly: true,
      signed: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
    },
  }));

  app.use(passport.initialize());
  app.use(passport.session());

  app.enableCors({
    origin: (origin, callback) => callback(null, true),
    credentials: true,
    exposedHeaders: ['Authorization'],
  });

  await app.listen(config.port);
  console.log(`Server is running on: ${await app.getUrl()}`);
}
bootstrap();
