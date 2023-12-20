import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Game } from './games.entity';
import { FetchGamesDTO, SaveGameDTO } from './games.dto';
import { AccountsService } from '../accounts/accounts.service';
import { TimeRange } from '../stats/stats.dto';

@Injectable()
export class GamesService {
  constructor(
    @InjectRepository(Game) private readonly gamesRepository: Repository<Game>,
    private readonly accountsService: AccountsService,
  ) {}

  async create(data: SaveGameDTO) {
    const account = await this.accountsService.getById(data.account_id);
    const game = this.gamesRepository.create(data);
    game.account = account;
    return this.gamesRepository.save(game);
  }

  async fetch(fetchData: FetchGamesDTO) {
    let { sortBy, timeRange, limit } = fetchData;
    if(limit > 100) {
      limit = 100;
    }
    let where = {};
    const today = new Date();
    if (timeRange === TimeRange.PastDay) {
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      where = { created_at: Between(yesterday, today) };
    } else if (timeRange === TimeRange.PastWeek) {
      const lastWeek = new Date(today);
      lastWeek.setDate(today.getDate() - 7);
      where = { created_at: Between(lastWeek, today) };
    }

    return await this.gamesRepository
      .createQueryBuilder('game')
      .leftJoinAndSelect('game.account', 'account', 'account.id = game.account_id')
      .select([
        'account.username as username',
        'game.created_at',
        'game.playtime as playtime',
        'game.coins as coins',
        'game.kills as kills',
      ])
      .where(where)
      .orderBy('game.' + sortBy, 'DESC')
      .limit(limit)
      .getRawMany();
  }
}
