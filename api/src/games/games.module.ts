import { Module } from '@nestjs/common';
import { GamesController } from './games.controller';
import { GamesService } from './games.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Game } from './games.entity';
import { AccountsModule } from 'src/accounts/accounts.module';

@Module({
  imports: [TypeOrmModule.forFeature([Game]), AccountsModule],
  controllers: [GamesController],
  exports: [GamesService],
  providers: [GamesService],
})
export class GamesModule {}
