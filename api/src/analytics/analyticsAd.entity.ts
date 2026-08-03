import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity({ name: 'analytics_ad_events' })
export class AnalyticsAdEvent {
  @PrimaryGeneratedColumn() id: number;

  @Index()
  @CreateDateColumn() created_at: Date;

  @Index()
  @Column({ nullable: true }) session_id: string;

  @Index()
  @Column({ nullable: true }) visitor_id: string;

  @Index()
  @Column({ type: 'int', nullable: true }) account_id: number | null;

  @Index()
  @Column() event_type: string;

  @Column({ nullable: true }) ad_provider: string | null;
  @Column({ nullable: true }) ad_format: string | null;
  @Column({ nullable: true }) ad_size: string | null;

  @Index()
  @Column({ nullable: true }) placement: string | null;

  @Column({ type: 'int', nullable: true }) visible_ms: number | null;
  @Column({ type: 'real', nullable: true }) viewability: number | null;

  @Column({ default: false }) is_mobile: boolean;
  @Column({ nullable: true }) country: string | null;

  @Column({ type: 'jsonb', nullable: true })
  ab_variants: Record<string, string> | null;

  @Column({ type: 'numeric', precision: 12, scale: 6, default: 0 })
  estimated_revenue_usd: string;

  @Column({ type: 'numeric', precision: 10, scale: 4, nullable: true })
  ecpm_used: string | null;
}
