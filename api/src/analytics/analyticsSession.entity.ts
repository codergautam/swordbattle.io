import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity({ name: 'analytics_sessions' })
export class AnalyticsSession {
  @PrimaryGeneratedColumn() id: number;

  @Column({ unique: true })
  session_id: string;

  @Index()
  @Column({ nullable: true })
  visitor_id: string;

  @Index()
  @Column({ type: 'int', nullable: true })
  account_id: number | null;

  @Column({ nullable: true }) username: string | null;

  @Index()
  @CreateDateColumn() created_at: Date;

  @Column({ type: 'timestamptz', nullable: true }) client_started_at: Date | null;
  @Column({ type: 'timestamptz', nullable: true }) ended_at: Date | null;

  @Column({ nullable: true }) end_reason: string | null;

  @Column({ type: 'int', nullable: true }) duration_ms: number | null;

  @Column({ default: false }) clicked_play: boolean;
  @Column({ type: 'int', nullable: true }) time_to_first_play_ms: number | null;
  @Column({ type: 'int', default: 0 }) play_count: number;
  @Column({ type: 'int', default: 0 }) death_count: number;
  @Column({ type: 'int', default: 0 }) total_playtime_ms: number;
  @Column({ type: 'int', default: 0 }) max_run_playtime_ms: number;
  @Column({ default: false }) reached_1min: boolean;
  @Column({ default: false }) reached_5min: boolean;

  @Column({ default: false }) is_first_visit: boolean;
  @Column({ default: false }) is_returning: boolean;
  @Column({ default: false }) is_logged_in: boolean;
  @Column({ default: false }) is_embedded: boolean;
  @Column({ default: false }) is_mobile: boolean;
  @Column({ nullable: true }) device_type: string | null;
  @Column({ type: 'int', nullable: true }) screen_w: number | null;
  @Column({ type: 'int', nullable: true }) screen_h: number | null;
  @Column({ nullable: true }) browser: string | null;
  @Column({ nullable: true }) os: string | null;
  @Column({ nullable: true }) language: string | null;
  @Column({ nullable: true }) timezone: string | null;
  @Column({ nullable: true }) country: string | null;
  @Column({ type: 'text', nullable: true }) referrer: string | null;
  @Column({ type: 'text', nullable: true }) landing_query: string | null;

  @Column({ nullable: true }) ad_provider: string | null;
  @Column({ type: 'boolean', nullable: true }) adblock: boolean | null;
  @Column({ type: 'int', default: 0 }) ad_impressions: number;
  @Column({ type: 'int', default: 0 }) video_ads_watched: number;
  @Column({ type: 'int', default: 0 }) rewarded_ads_watched: number;

  @Column({ type: 'jsonb', nullable: true })
  ab_variants: Record<string, string> | null;

  @Column({ nullable: true }) app_version: string | null;
}
