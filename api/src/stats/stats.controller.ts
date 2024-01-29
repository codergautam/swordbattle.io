import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { StatsService } from './stats.service';
import { ServerGuard } from 'src/auth/guards/server.guard';
import { FetchStatsDTO, SaveGameDTO } from './stats.dto';

let lastForumFetch = 0;
const forumFetchInt = 1000 * 60 * 10; // 10 minutes
const url = 'https://iogames.forum/c/swordbattle/5/l/top.json?period=weekly'; // trending posts in the last week
let forumData ={};

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

  @Get('forum')
  forum() {
    return new Promise((resolve, reject) => {
    if (Date.now() - lastForumFetch > forumFetchInt) {
      lastForumFetch = Date.now();
      fetch(url)
        .then((res) => res.json())
        .then((json) => {
          forumData = json;
          resolve(forumData);
        }).catch((e) => {
          console.error(e);
          resolve(forumData);
        });
    } else {
      resolve(forumData);
    }
  });
}
}
