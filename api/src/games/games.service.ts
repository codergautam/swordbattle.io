import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Game } from './games.entity';
import { Repository } from 'typeorm';
import { SaveGameDTO } from './games.dto';
import { AccountsService } from 'src/accounts/accounts.service';

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
}
