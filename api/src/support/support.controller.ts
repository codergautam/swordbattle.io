import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { SupportService } from './support.service';
import { ModerationGuard } from '../auth/guards/moderation.guard';
import {
  SubmitTicketDTO, MyTicketsDTO, UserReplyDTO, SeenTicketDTO, AdminReplyDTO, AdminStatusDTO,
} from './support.dto';

@Controller('support')
export class SupportController {
  constructor(private readonly support: SupportService) {}

  private ip(req: any): string | undefined {
    return req?.headers?.['cf-connecting-ip'] || req?.ip || undefined;
  }

  @Post('submit')
  @Throttle({ short: { limit: 3, ttl: 5000 }, medium: { limit: 15, ttl: 60000 } })
  submit(@Body() dto: SubmitTicketDTO, @Req() req) {
    return this.support.submit(dto, this.ip(req));
  }

  @Post('mine')
  @Throttle({ short: { limit: 10, ttl: 1000 }, medium: { limit: 120, ttl: 60000 } })
  mine(@Body() dto: MyTicketsDTO) {
    return this.support.mine(dto);
  }

  @Post('unread')
  @Throttle({ short: { limit: 10, ttl: 1000 }, medium: { limit: 120, ttl: 60000 } })
  unread(@Body() dto: MyTicketsDTO) {
    return this.support.unread(dto);
  }

  @Post('reply')
  @Throttle({ short: { limit: 3, ttl: 5000 }, medium: { limit: 30, ttl: 60000 } })
  reply(@Body() dto: UserReplyDTO, @Req() req) {
    return this.support.reply(dto, this.ip(req));
  }

  @Post('seen')
  @Throttle({ short: { limit: 10, ttl: 1000 }, medium: { limit: 120, ttl: 60000 } })
  seen(@Body() dto: SeenTicketDTO) {
    return this.support.markSeen(dto);
  }

  @Get('admin/list')
  @UseGuards(ModerationGuard)
  adminList(@Query('status') status: string, @Query('category') category: string, @Query('limit') limit: string) {
    return this.support.adminList(status, category, parseInt(limit, 10) || 200);
  }

  @Get('admin/updates')
  @UseGuards(ModerationGuard)
  adminUpdates(@Query('since') since: string) {
    return this.support.adminUpdates(parseInt(since, 10) || 0);
  }

  @Post('admin/reply')
  @UseGuards(ModerationGuard)
  adminReply(@Body() dto: AdminReplyDTO) {
    return this.support.adminReply(dto);
  }

  @Post('admin/status')
  @UseGuards(ModerationGuard)
  adminStatus(@Body() dto: AdminStatusDTO) {
    return this.support.adminSetStatus(dto);
  }

  @Post('admin/read')
  @UseGuards(ModerationGuard)
  adminRead(@Body() body: { ticketId: number }) {
    return this.support.adminMarkRead(body.ticketId);
  }

  @Post('admin/unban-screenshots')
  @UseGuards(ModerationGuard)
  adminUnbanScreenshots(@Body() body: { ticketId: number }) {
    return this.support.adminUnbanScreenshots(body.ticketId);
  }
}
