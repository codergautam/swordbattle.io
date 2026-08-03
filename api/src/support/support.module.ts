import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';
import { SupportTicket } from './supportTicket.entity';
import { ScreenshotBan } from './screenshotBan.entity';
import { ImageModerationService } from './imageModeration.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([SupportTicket, ScreenshotBan]), AuthModule],
  controllers: [SupportController],
  providers: [SupportService, ImageModerationService],
  exports: [SupportService],
})
export class SupportModule {}
