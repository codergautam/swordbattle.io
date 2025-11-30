import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { StatsService } from './stats.service';
import { ServerGuard } from 'src/auth/guards/server.guard';
import { FetchStatsDTO, SaveGameDTO } from './stats.dto';


@Controller('stats')
export class StatsController {
  constructor(
    private readonly statsService: StatsService,
  ) {}

  @Post('update')
  @UseGuards(ServerGuard)
  update(@Body() statsData: SaveGameDTO) {
    return this.statsService.update(statsData);
  }

  @Post('fetch')
  fetch(@Body() fetchData: FetchStatsDTO) {
    return this.statsService.fetch(fetchData);
  }
}
