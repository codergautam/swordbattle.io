import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';

import { FetchStatsDTO, SaveGameDTO, TimeRange } from './stats.dto';
import { DailyStats } from './dailyStats.entity';
import { TotalStats } from './totalStats.entity';
import { Account } from '../accounts/account.entity';
import { AccountsService } from '../accounts/accounts.service';
import CacheObj from 'src/Cache';

@Injectable()
export class StatsService {
  private top100RankCache = new CacheObj<{ [key: number]: number }>(3600000) // 1 hour in milliseconds
  constructor(
    private readonly accountsService: AccountsService,
    @InjectRepository(DailyStats) private readonly dailyStatsRepository: Repository<DailyStats>,
    @InjectRepository(TotalStats) private readonly totalStatsRepository: Repository<TotalStats>,
  ) {}

  async update(data: SaveGameDTO) {
    const account = await this.accountsService.findOne({
      where: { id: data.account_id },
      relations: ['total_stats'],
    }, true);
    await this.updateTotalStats(account, data);
    await this.updateDailyStats(account, data);

    // Update gems
    let gems = data.gems;
    await this.accountsService.addGems(account, gems, "game");
    await this.accountsService.addXp(account, data.xp);

    return true;
  }

  async updateDailyStats(account: Account, data: SaveGameDTO) {
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    let dailyStats = await this.dailyStatsRepository
      .createQueryBuilder('daily_stats')
      .where('DATE(daily_stats.date) = DATE(:date)', { date: currentDate })
      .andWhere('daily_stats.account_id = :account_id', { account_id: account.id })
      .getOne();

    if (dailyStats) {
      this.assignData(dailyStats, data);
    } else {
      dailyStats = this.dailyStatsRepository.create({
        ...data,
        account,
        date: currentDate,
      });
    }
    return this.dailyStatsRepository.save(dailyStats);
  }

  async updateTotalStats(account: Account, data: SaveGameDTO) {
    let totalStats = account.total_stats;
    if (totalStats) {
      this.assignData(totalStats, data);
    } else {
      totalStats = this.totalStatsRepository.create({
        ...data,
        games: 1,
        account,
      });
    }
    return this.totalStatsRepository.save(totalStats);
  }

  async getTotalStats(account: Account) {
    return this.totalStatsRepository.findOne({
      where: { id: account.id },
    });
  }

  async getLatestDayStats(account: Account) {
    return this.dailyStatsRepository
      .createQueryBuilder('daily_stats')
      .where('daily_stats.account_id = :id', { id: account.id })
      .orderBy('daily_stats.date', 'DESC')
      .getOne();
  }

  async getAllDailyStats(account: Account) {
    return this.dailyStatsRepository
      .createQueryBuilder('daily_stats')
      .where('daily_stats.account_id = :id', { id: account.id })
      .orderBy('daily_stats.date', 'DESC')
      .getMany();
  }

  async updateTop100RankCache() {
    const result = await this.totalStatsRepository
      .createQueryBuilder('total_stats')
      .select('total_stats.id', 'id')
      .addSelect('RANK() OVER (ORDER BY total_stats.xp DESC)', 'rank')
      .limit(100)
      .getRawMany();

    const cache = {};
    for (const row of result) {
      cache[row.id] = parseInt(row.rank, 10);
    }
    this.top100RankCache.updateData(cache);
  }

  async getTop100RankedUser(account: Account) {
    // faster ranking for top 100
    if(this.top100RankCache.isStale()) {
      await this.updateTop100RankCache();
    }
    return this.top100RankCache.getData()[account.id];
  }

  async getAccountRankByXp(account: Account) {
    if(!this.top100RankCache.isStale() && this.top100RankCache.getData()[account.id]) {
      return this.top100RankCache.getData()[account.id];
    }

    const subQuery = this.totalStatsRepository
      .createQueryBuilder('total_stats')
      .select('total_stats.id', 'id')
      .addSelect('RANK() OVER (ORDER BY total_stats.xp DESC)', 'rank');

    const result = await this.totalStatsRepository
      .createQueryBuilder()
      .select('sub.rank', 'rank')
      .from('(' + subQuery.getQuery() + ')', 'sub')
      .setParameter('id', account.id)
      .where('sub.id = :id')
      .getRawOne();


    return result ? parseInt(result.rank, 10) : undefined;
  }

  async fetch(fetchData: FetchStatsDTO) {
    let { sortBy, timeRange, limit } = fetchData;

    if(limit > 100) {
      limit = 100;
    }
    let where = {};
    const today = new Date();
    if (timeRange === TimeRange.PastDay) {
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      where = { date: Between(yesterday, today) };
    } else if (timeRange === TimeRange.PastWeek) {
      const lastWeek = new Date(today);
      lastWeek.setDate(today.getDate() - 7);
      where = { date: Between(lastWeek, today) };
    }

    if (timeRange === TimeRange.AllTime) {
      return this.totalStatsRepository
        .createQueryBuilder('total_stats')
        .leftJoinAndSelect('total_stats.account', 'account', 'account.id = total_stats.id')
        .select([
          'account.username as username',
          'total_stats.xp as xp',
          'total_stats.coins as coins',
          'total_stats.kills as kills',
          'total_stats.playtime as playtime',
        ])
        .limit(limit)
        .orderBy('total_stats.' + sortBy, 'DESC')
        .getRawMany();
    } else {
      return this.dailyStatsRepository
        .createQueryBuilder('daily_stats')
        .leftJoinAndSelect('daily_stats.account', 'account', 'account.id = daily_stats.account_id')
        .select([
          'account.username as username',
          'SUM(daily_stats.xp) as xp',
          'SUM(daily_stats.coins) as coins',
          'SUM(daily_stats.kills) as kills',
          'SUM(daily_stats.playtime) as playtime',
        ])
        .where(where)
        .limit(limit)
        .groupBy('daily_stats.account_id')
        .addGroupBy('account.username')
        .orderBy('SUM(daily_stats.' + sortBy + ')', 'DESC')
        .getRawMany();
    }
  }

  assignData(row: DailyStats | TotalStats, data: SaveGameDTO) {
    row.xp += data.xp;
    row.coins += data.coins;
    row.kills += data.kills;
    row.playtime += data.playtime;
    row.games += 1;
    return row;
  }
}
