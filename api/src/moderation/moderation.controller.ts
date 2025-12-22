import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ModerationService } from './moderation.service';
import { LogSwearingDTO } from './moderation.dto';
import { ServerGuard } from 'src/auth/guards/server.guard';

@Controller('moderation')
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  @Post('log-swearing')
  @UseGuards(ServerGuard)
  logSwearing(@Body() data: LogSwearingDTO) {
    return this.moderationService.logSwearing(data);
  }
}
