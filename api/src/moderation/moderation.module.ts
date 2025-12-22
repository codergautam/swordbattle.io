import { Module } from '@nestjs/common';
import { ModerationController } from './moderation.controller';
import { ModerationService } from './moderation.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SwearingIncident } from './swearingIncident.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SwearingIncident])],
  controllers: [ModerationController],
  exports: [ModerationService],
  providers: [ModerationService],
})
export class ModerationModule {}
