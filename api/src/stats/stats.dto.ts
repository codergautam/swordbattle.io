import { IsEnum, IsInt, IsNumber, Max, Min } from 'class-validator';

export class SaveGameDTO {
  @IsInt() account_id: number;

  @IsNumber() xp: number;

  @IsInt() kills: number;

  @IsInt() mastery: number;

  @IsInt() coins: number;

  @IsNumber() playtime: number;

  @IsNumber() gems: number;
}

export enum TimeRange {
  AllTime = 'all',
  PastDay = 'day',
  PastWeek = 'week',
  PastMonth = 'month',
}

export enum StatsSortType {
  XP = 'xp',
  Mastery = 'mastery',
  TotalCoins = 'coins',
  TotalKills = 'kills',
  TotalPlaytime = 'playtime',
}

export class FetchStatsDTO {
  @IsEnum(StatsSortType) sortBy: StatsSortType;

  @IsEnum(TimeRange) timeRange: TimeRange;

  @Min(0) @Max(100) limit: number;
}
