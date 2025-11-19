import { Controller, Get, Param, Post, Req, UseGuards, Query, Body } from '@nestjs/common';
import { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AccountsService } from './accounts.service';
import { StatsService } from 'src/stats/stats.service';
import { AuthService } from 'src/auth/auth.service';
import { CosmeticsService } from 'src/cosmetics/cosmetics.service';
import { ServerGuard } from 'src/auth/guards/server.guard';
import { AccountGuard, AccountRequest } from 'src/auth/guards/account.guard';

@Controller('profile')
export class AccountsController {
  private recentProfileViews = new Map<number, Set<string>>();

  constructor(
    private readonly statsService: StatsService,
    private readonly accountsService: AccountsService,
    private readonly authService: AuthService,
    private readonly cosmeticsService: CosmeticsService,
  ) {}

  @Get('skins/buys')
  async getSkinBuys() {
    return this.cosmeticsService.getSkinBuyCounts();
  }

  @Get('skins/daily')
  async getDailySkins() {
    return this.cosmeticsService.getTodaysSkins();
  }

  @UseGuards(AccountGuard)
  @Throttle({ short: { limit: 2, ttl: 1000 }, medium: { limit: 10, ttl: 60000 } })
  @Post('cosmetics/:type/buy/:itemId')
  async buySkin(@Req() request: any) {
    const id = request.account.id;
    const itemId = request.params.itemId;
    const type = request.params.type;

    if(!['skins'].includes(type)) {
      return { error: 'Invalid type' };
    }

    if(!itemId || isNaN(Number(itemId))) {
      return { error: 'Invalid item id' };
    }

    const itemIdNum = Number(itemId);

    return await this.accountsService.buyCosmetic(id, itemIdNum, type);
  }

  @UseGuards(AccountGuard)
  @Throttle({ short: { limit: 3, ttl: 1000 }, medium: { limit: 20, ttl: 60000 } })
  @Post('cosmetics/skins/equip/:skinId')
  async equipSkin(@Req() request: any) {
    const { token } = request.body;
    const id = request.account.id;
    const skinId = request.params.skinId;
    if(!skinId || isNaN(Number(skinId))) {
      return { error: 'Invalid skin id' };
    }
    const skinIdNum = Number(skinId);

    return await this.accountsService.equipSkin(id, skinIdNum);
  }

  @UseGuards(AccountGuard)
  @Post('getPrivateUserInfo')
  async getPrivateAccount(@Req() request: AccountRequest) {
    const id = request.account.id;
    const account = await this.accountsService.getById(id);

    return { account: this.accountsService.sanitizeAccount(account) };
  }

  @UseGuards(ServerGuard)
  @Post('getTop100Rank/:username')
  async getTop100Rank(@Param('username') username: string) {
    const account = await this.accountsService.getByUsername(username);
    const rank = await this.statsService.getTop100RankedUser(account);
    return { rank };
  }

  @Throttle({ short: { limit: 5, ttl: 1000 }, medium: { limit: 30, ttl: 60000 } })
  @Post('getPublicUserInfo/:username')
  async getAccount(@Param('username') username: string, @Req() request: Request) {
    const account = await this.accountsService.getByUsername(username);
    const totalStats = await this.statsService.getTotalStats(account);
    const dailyStats = await this.statsService.getAllDailyStats(account);
    const clan = await this.accountsService.getClan(username);
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

    return { account, totalStats, dailyStats, rank, clan };
  }

  @Throttle({ short: { limit: 5, ttl: 1000 }, medium: { limit: 30, ttl: 60000 } })
  @Post('getPublicUserInfoById/:id')
  async getAccountById(@Param('id') id: number, @Req() request: Request) {
    const account = await this.accountsService.getById(id);
    const totalStats = await this.statsService.getTotalStats(account);
    const dailyStats = await this.statsService.getAllDailyStats(account);
    const clan = await this.accountsService.getClanById(id);
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

    return { account, totalStats, dailyStats, rank, clan };
  }

  @Get('clanMembers')
  async getClanMembers(@Query('clan') clan: string) {
    const members = await this.accountsService.findClanMembers(clan);
    const memberXP = await this.accountsService.findStatOfAll({where: { clan }}, 'xp');

    return { count: members.length, xp: memberXP, members };
  }

  // Search accounts by username prefix (case-insensitive).
  // Body: { q: string, limit?: number }
  @Post('search')
  async searchAccounts(@Body() body: { q: string; limit?: number }) {
    const q = (body?.q ?? '').toString().trim();
    const limit = Number(body?.limit) || 25;
    if (!q) return [];
    const results = await this.accountsService.searchAccountsByPrefix(q, limit);
    return results;
  }
}
