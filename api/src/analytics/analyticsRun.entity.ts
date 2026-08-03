import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity({ name: 'analytics_runs' })
export class AnalyticsRun {
  @PrimaryGeneratedColumn() id: number;

  @Column({ unique: true })
  run_id: string;

  @Index()
  @Column({ nullable: true }) session_id: string;

  @Index()
  @Column({ nullable: true }) visitor_id: string;

  @Index()
  @Column({ type: 'int', nullable: true }) account_id: number | null;

  @Index()
  @CreateDateColumn() created_at: Date;

  @Column({ type: 'timestamptz', nullable: true }) started_at: Date | null;
  @Column({ type: 'timestamptz', nullable: true }) ended_at: Date | null;

  @Column({ type: 'int', nullable: true }) playtime_ms: number | null;

  @Index()
  @Column({ nullable: true }) end_reason: string;

  @Column({ nullable: true }) killer_name: string | null;

  @Column({ type: 'int', default: 0 }) coins: number;
  @Column({ type: 'int', default: 0 }) kills: number;

  @Column({ type: 'int', default: 0 }) run_index: number;
  @Column({ default: false }) is_first_run: boolean;

  @Column({ default: false }) is_logged_in: boolean;
  @Column({ default: false }) is_mobile: boolean;
  @Column({ nullable: true }) device_type: string | null;

  @Index()
  @Column({ nullable: true }) preroll_variant: string | null;
  @Column({ default: false }) preroll_shown: boolean;

  @Column({ type: 'jsonb', nullable: true })
  ab_variants: Record<string, string> | null;
}
