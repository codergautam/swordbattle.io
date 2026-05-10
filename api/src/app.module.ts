import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AccountsModule } from './accounts/accounts.module';
import { AuthModule } from './auth/auth.module';
import { config } from './config';
import { GamesModule } from './games/games.module';
import { StatsModule } from './stats/stats.module';
import { CosmeticsModule } from './cosmetics/cosmetics.module';
import { ModerationModule } from './moderation/moderation.module';
import { ClansModule } from './clans/clans.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { AuthService } from './auth/auth.service';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: config.databaseURL,
      ssl: config.useSSL ? { rejectUnauthorized: false } : false,
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true,
      logging: true,
      autoLoadEntities: true,
    }),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 30,
      },
      {
        name: 'medium',
        ttl: 60000,
        limit: 600,
      },
      {
        name: 'long',
        ttl: 3600000,
        limit: 10000,
      },
    ]),
    AuthModule,
    AccountsModule,
    GamesModule,
    StatsModule,
    CosmeticsModule,
    ModerationModule,
    ClansModule,
    MaintenanceModule,
  ],
  providers: [
    AuthService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
