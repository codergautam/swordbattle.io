import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { CosmeticsService } from './cosmetics.service';
import { SkinBuyCount } from './skinBuyCount.entity';
import { DailySkins } from './dailySkins.entity';
import { Account } from 'src/accounts/account.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([SkinBuyCount, DailySkins, Account]),
    ScheduleModule.forRoot(),
  ],
  providers: [CosmeticsService],
  exports: [CosmeticsService],
})
export class CosmeticsModule {}
