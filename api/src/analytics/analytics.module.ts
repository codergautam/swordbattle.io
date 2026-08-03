import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { AnalyticsSession } from './analyticsSession.entity';
import { AnalyticsRun } from './analyticsRun.entity';
import { AnalyticsAdEvent } from './analyticsAd.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AnalyticsSession, AnalyticsRun, AnalyticsAdEvent])],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
