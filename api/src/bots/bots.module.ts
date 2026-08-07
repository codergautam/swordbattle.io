import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BotSetting } from './botSetting.entity';
import { BotMessage } from './botMessage.entity';
import { BotsService } from './bots.service';
import { BotsController } from './bots.controller';

@Module({
  imports: [TypeOrmModule.forFeature([BotSetting, BotMessage])],
  controllers: [BotsController],
  providers: [BotsService],
  exports: [BotsService],
})
export class BotsModule {}
