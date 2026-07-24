import { IsBoolean, IsInt, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class SessionDTO {
  @IsString() session_id: string;

  @IsOptional() @IsString() visitor_id?: string;
  @IsOptional() @IsInt() account_id?: number | null;
  @IsOptional() @IsString() username?: string | null;

  @IsOptional() @IsNumber() client_started_at?: number;
  @IsOptional() @IsNumber() ended_at?: number;
  @IsOptional() @IsString() end_reason?: string;
  @IsOptional() @IsInt() duration_ms?: number;

  @IsOptional() @IsBoolean() clicked_play?: boolean;
  @IsOptional() @IsInt() time_to_first_play_ms?: number;
  @IsOptional() @IsInt() play_count?: number;
  @IsOptional() @IsInt() death_count?: number;
  @IsOptional() @IsNumber() total_playtime_ms?: number;
  @IsOptional() @IsNumber() max_run_playtime_ms?: number;
  @IsOptional() @IsBoolean() reached_1min?: boolean;
  @IsOptional() @IsBoolean() reached_5min?: boolean;

  @IsOptional() @IsBoolean() is_first_visit?: boolean;
  @IsOptional() @IsBoolean() is_returning?: boolean;
  @IsOptional() @IsBoolean() is_logged_in?: boolean;
  @IsOptional() @IsBoolean() is_embedded?: boolean;
  @IsOptional() @IsBoolean() is_mobile?: boolean;
  @IsOptional() @IsString() device_type?: string;
  @IsOptional() @IsInt() screen_w?: number;
  @IsOptional() @IsInt() screen_h?: number;
  @IsOptional() @IsString() browser?: string;
  @IsOptional() @IsString() os?: string;
  @IsOptional() @IsString() language?: string;
  @IsOptional() @IsString() timezone?: string;
  @IsOptional() @IsString() referrer?: string;
  @IsOptional() @IsString() landing_query?: string;

  @IsOptional() @IsString() ad_provider?: string;
  @IsOptional() @IsBoolean() adblock?: boolean;
  @IsOptional() @IsInt() ad_impressions?: number;
  @IsOptional() @IsInt() video_ads_watched?: number;
  @IsOptional() @IsInt() rewarded_ads_watched?: number;

  @IsOptional() @IsObject() ab_variants?: Record<string, string>;
  @IsOptional() @IsString() app_version?: string;
}

export class RunDTO {
  @IsString() run_id: string;

  @IsOptional() @IsString() session_id?: string;
  @IsOptional() @IsString() visitor_id?: string;
  @IsOptional() @IsInt() account_id?: number | null;

  @IsOptional() @IsNumber() started_at?: number;
  @IsOptional() @IsNumber() ended_at?: number;
  @IsOptional() @IsNumber() playtime_ms?: number;

  @IsOptional() @IsString() end_reason?: string;
  @IsOptional() @IsString() killer_name?: string;
  @IsOptional() @IsInt() coins?: number;
  @IsOptional() @IsInt() kills?: number;

  @IsOptional() @IsInt() run_index?: number;
  @IsOptional() @IsBoolean() is_first_run?: boolean;
  @IsOptional() @IsBoolean() is_logged_in?: boolean;
  @IsOptional() @IsBoolean() is_mobile?: boolean;
  @IsOptional() @IsString() device_type?: string;

  @IsOptional() @IsString() preroll_variant?: string;
  @IsOptional() @IsBoolean() preroll_shown?: boolean;
  @IsOptional() @IsObject() ab_variants?: Record<string, string>;
}

export class AdEventDTO {
  @IsString() event_type: string;

  @IsOptional() @IsString() session_id?: string;
  @IsOptional() @IsString() visitor_id?: string;
  @IsOptional() @IsInt() account_id?: number | null;

  @IsOptional() @IsString() ad_provider?: string;
  @IsOptional() @IsString() ad_format?: string;
  @IsOptional() @IsString() ad_size?: string;
  @IsOptional() @IsString() placement?: string;

  @IsOptional() @IsInt() visible_ms?: number;
  @IsOptional() @IsNumber() viewability?: number;
  @IsOptional() @IsBoolean() is_mobile?: boolean;
  @IsOptional() @IsObject() ab_variants?: Record<string, string>;
}
