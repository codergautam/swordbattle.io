import { NestFactory } from '@nestjs/core';
import { ValidationPipe, HttpStatus } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyFormbody from '@fastify/formbody';

import { AppModule } from './app.module';
import { ExcludeInterceptor } from './exclude.interceptor';
import { config } from './config';

async function bootstrap() {
  const adapter = new FastifyAdapter({
    trustProxy: true,
    bodyLimit: 12 * 1024 * 1024,
  });
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, adapter);

  // Nest's adapter and standalone Fastify plugins can resolve separate, structurally
  // compatible Fastify type instances under pnpm's strict dependency graph.
  await app.register(fastifyCookie as any, { secret: config.appSecret });
  await app.register(fastifyFormbody as any);
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

  await app.listen(config.port, '0.0.0.0');
  console.log(`Server is running on: ${await app.getUrl()}\nProduction mode ${config.isProduction ? 'enabled' : 'disabled'}`);
  console.log('=====================================================');
  console.log('SERVER STARTED - BUILD TIMESTAMP:', new Date().toISOString());
  console.log('CrazyGames auth endpoint available at /auth/crazygames/login');
  console.log('=====================================================');
}
bootstrap();
