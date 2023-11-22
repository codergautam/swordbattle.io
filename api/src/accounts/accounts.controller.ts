import { Controller, Param, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { AccountsService } from './accounts.service';
import { StatsService } from 'src/stats/stats.service';

@Controller('profile')
export class AccountsController {
  private recentProfileViews = new Map<number, Set<string>>();
  
  constructor(
    private readonly statsService: StatsService,
    private readonly accountsService: AccountsService,
  ) {}

  @Post(':username')
  async getAccount(@Param('username') username: string, @Req() request: Request) {
    const account = await this.accountsService.getByUsername(username);
    const totalStats = await this.statsService.getTotalStats(account);
    const latestDayStats = await this.statsService.getLatestDayStats(account);
    const rank = await this.statsService.getAccountRankByXp(account);
    
    const ip = request.ip;
    let viewedIps = this.recentProfileViews.get(account.id);
    if (!viewedIps) {
      viewedIps = new Set();
      this.recentProfileViews.set(account.id, viewedIps);
    }
    if (!viewedIps.has(ip)) {
      viewedIps.add(ip);
      this.accountsService.incrementProfileViews(account);
    }

    return { account, totalStats, latestDayStats, rank };
  }
}
