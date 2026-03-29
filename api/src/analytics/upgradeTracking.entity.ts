import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'upgrade_tracking' })
export class UpgradeTracking {
  @PrimaryGeneratedColumn() id: number;

  @CreateDateColumn() created_at: Date;

  @Column() time_window: string;

  @Column({ default: 0 }) total_selections: number;

  @Column({ type: 'text', default: '{}' }) minor_pick_counts: string;

  @Column({ type: 'text', default: '{}' }) major_pick_counts: string;

  @Column({ nullable: true }) top_minor_id: number;
  @Column({ nullable: true }) top_minor_name: string;

  @Column({ nullable: true }) bottom_minor_id: number;
  @Column({ nullable: true }) bottom_minor_name: string;

  @Column({ nullable: true }) top_major_id: number;
  @Column({ nullable: true }) top_major_name: string;

  @Column({ type: 'text', default: '[]' }) top_minor_major_combos: string;

  @Column({ type: 'text', default: '[]' }) top_major_major_combos: string;

  @Column({ type: 'text', default: '[]' }) top_major_evolution_combos: string;

  @Column({ type: 'float', default: 0 }) avg_picks_per_game: number;

  @Column({ type: 'text', default: '{}' }) avg_minor_stacks: string;

  @Column({ type: 'float', default: 0 }) major_skip_rate: number;
}
