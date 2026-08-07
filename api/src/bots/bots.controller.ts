import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { BotsService } from './bots.service';
import { ModerationGuard } from '../auth/guards/moderation.guard';

@Controller('bots')
@UseGuards(ModerationGuard)
export class BotsController {
  constructor(private readonly bots: BotsService) {}

  @Get('config')
  getConfig() {
    return this.bots.getConfig();
  }

  @Post('config')
  saveConfig(@Body() body: any) {
    return this.bots.saveConfig(body);
  }

  @Get('emojis')
  getEmojis() {
    return this.bots.getEmojis();
  }

  @Post('emojis')
  saveEmojis(@Body() body: { emojis: any[] }) {
    return this.bots.saveEmojis(body?.emojis);
  }

  @Post('messages')
  queueMessage(@Body() body: any) {
    return this.bots.queueMessage(body);
  }

  @Get('messages')
  listMessages(@Query('limit') limit: string) {
    return this.bots.listMessages(parseInt(limit, 10) || 20);
  }

  @Get('messages/pending')
  pendingMessages(@Query('bot') bot: string) {
    return this.bots.pendingMessages(bot);
  }

  @Post('messages/status')
  setMessageStatus(@Body() body: { id: number; status: string; error?: string }) {
    return this.bots.setMessageStatus(body?.id, body?.status, body?.error);
  }

  @Post('messages/delete')
  deleteMessage(@Body() body: { id: number }) {
    return this.bots.deleteMessage(body?.id);
  }
}
