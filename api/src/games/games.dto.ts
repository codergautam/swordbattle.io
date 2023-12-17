import { IsEnum, IsInt, IsNumber, Max, Min } from 'class-validator';
import { TimeRange } from 'src/stats/stats.dto';

export class SaveGameDTO {
  @IsInt() account_id: number;
  
  @IsInt() coins: number;

  @IsInt() kills: number;

  @IsNumber() playtime: number;
}

export enum GamesSortType {
  Coins = 'coins',
  Kills = 'kills',
  Playtime = 'playtime',
}

export class FetchGamesDTO {
  @IsEnum(GamesSortType) sortBy: GamesSortType;

  @IsEnum(TimeRange) timeRange: TimeRange;

  @Min(0) @Max(100) limit: number;
}
