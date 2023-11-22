import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';
import { AccountsModule } from '../accounts/accounts.module';
import { DailyStats } from './dailyStats.entity';
import { TotalStats } from './totalStats.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([DailyStats, TotalStats]),
    forwardRef(() => AccountsModule),
  ],
  controllers: [StatsController],
  exports: [StatsService],
  providers: [StatsService],
})
export class StatsModule {}
