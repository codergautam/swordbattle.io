import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountsModule } from './accounts/accounts.module';
import { AuthModule } from './auth/auth.module';
import { config } from './config';
import { GamesModule } from './games/games.module';
import { JwtBodyStrategy } from './auth/strategies/jwt-body.strategy';
import { JwtStrategy } from './auth/strategies/jwt.strategy';
import { StatsModule } from './stats/stats.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: config.databaseURL,
      ssl: config.useSSL,
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
  providers: [JwtStrategy, JwtBodyStrategy],
})
export class AppModule {}
