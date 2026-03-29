import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UpgradeSelect } from './upgradeSelect.entity';
import { UpgradeTracking } from './upgradeTracking.entity';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';

@Module({
  imports: [TypeOrmModule.forFeature([UpgradeSelect, UpgradeTracking])],
  controllers: [AnalyticsController],
  exports: [AnalyticsService],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
