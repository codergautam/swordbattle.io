import { Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AccountsService } from './accounts.service';
import { StatsService } from 'src/stats/stats.service';
import { AuthService } from 'src/auth/auth.service';
import { ServerGuard } from 'src/auth/guards/server.guard';
import { AccountGuard, AccountRequest } from 'src/auth/guards/account.guard';

@Controller('profile')
export class AccountsController {
  private recentProfileViews = new Map<number, Set<string>>();

  constructor(
    private readonly statsService: StatsService,
    private readonly accountsService: AccountsService,
    private readonly authService: AuthService,
  ) {}

  @Get('skins/buys')
  async getSkinBuys() {
    return this.accountsService.getCosmeticCnts('skins');
  }

  @UseGuards(AccountGuard)
  @Post('cosmetics/:type/buy/:itemId')
  async buySkin(@Req() request: AccountRequest) {
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
  @Post('cosmetics/skins/equip/:skinId')
  async equipSkin(@Req() request: AccountRequest) {
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

  @Post('getPublicUserInfo/:username')
  async getAccount(@Param('username') username: string, @Req() request: Request) {
    const account = await this.accountsService.getByUsername(username);
    const totalStats = await this.statsService.getTotalStats(account);
    const dailyStats = await this.statsService.getAllDailyStats(account);
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

    return { account, totalStats, dailyStats, rank };
  }
}
