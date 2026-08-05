import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ModerationGuard } from 'src/auth/guards/moderation.guard';
import { AnalyticsService } from './analytics.service';
import { SessionDTO, RunDTO, AdEventDTO } from './analytics.dto';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  private country(req: any): string | null {
    const c = req?.headers?.['cf-ipcountry'];
    if (!c || c === 'XX' || c === 'T1') return null;
    return String(c).toUpperCase().slice(0, 2);
  }

  private userAgent(req: any): string | null {
    const ua = req?.headers?.['user-agent'];
    return ua ? String(ua).slice(0, 500) : null;
  }

  @Post('session')
  @Throttle({ short: { limit: 30, ttl: 1000 }, medium: { limit: 400, ttl: 60000 } })
  async session(@Body() dto: SessionDTO, @Req() req) {
    await this.analyticsService.upsertSession(dto, this.country(req), this.userAgent(req));
    return { ok: true };
  }

  @Post('run')
  @Throttle({ short: { limit: 30, ttl: 1000 }, medium: { limit: 400, ttl: 60000 } })
  async run(@Body() dto: RunDTO) {
    await this.analyticsService.insertRun(dto);
    return { ok: true };
  }

  @Post('ad')
  @Throttle({ short: { limit: 30, ttl: 1000 }, medium: { limit: 600, ttl: 60000 } })
  async ad(@Body() dto: AdEventDTO, @Req() req) {
    await this.analyticsService.insertAd(dto, this.country(req));
    return { ok: true };
  }

  @Get('metrics')
  @UseGuards(ModerationGuard)
  async metrics(@Query('days') days: string) {
    return this.analyticsService.getDashboard(parseInt(days, 10) || 30);
  }

  @Get('daily-digest')
  @UseGuards(ModerationGuard)
  async dailyDigest(@Query('date') date: string) {
    return this.analyticsService.getDailyDigest(date);
  }
}
