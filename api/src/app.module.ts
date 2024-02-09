import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountsModule } from './accounts/accounts.module';
import { AuthModule } from './auth/auth.module';
import { config } from './config';
import { GamesModule } from './games/games.module';
import { StatsModule } from './stats/stats.module';
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
    AuthModule,
    AccountsModule,
    GamesModule,
    StatsModule,
  ],
  providers: [AuthService],
})
export class AppModule {}
