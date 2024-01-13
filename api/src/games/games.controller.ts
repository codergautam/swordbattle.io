import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { GamesService } from './games.service';
import { FetchGamesDTO, SaveGameDTO } from './games.dto';
import { ServerGuard } from 'src/auth/guards/server.guard';

@Controller('games')
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  @Post('save')
  @UseGuards(ServerGuard)
  saveGame(@Body() gameData: SaveGameDTO) {
    return this.gamesService.create(gameData);
  }

  @Post('fetch')
  fetchGames(@Body() data: FetchGamesDTO) {
    return this.gamesService.fetch(data);
  }

  @Get('ping')
  ping() {
    return 'pong';
  }
}
