import { Controller, Post, Get, Body, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('upgrade-select')
  async logSelection(@Body() data: {
    card_id: number;
    card_name: string;
    is_major: boolean;
    card_pick_number: number;
    evolution?: number;
    coins?: number;
    level?: number;
    minor_stacks?: string;
    major_cards?: string;
    account_id?: number;
  }) {
    return this.analyticsService.logSelection(data);
  }

  @Post('aggregate')
  async runAggregation() {
    await this.analyticsService.runAllAggregations();
    return { success: true };
  }

  @Get('tracking')
  async getTracking(@Query('window') timeWindow: string) {
    return this.analyticsService.getLatestTracking(timeWindow || 'last_24h');
  }
}
