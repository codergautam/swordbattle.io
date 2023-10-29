import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Account } from 'src/accounts/account.entity';

@Entity({ name: 'stats' })
export class Stats {
  @PrimaryGeneratedColumn() id: number;

  @Column({ default: 0 }) past_week_xp: number;

  @Column({ default: 0 }) past_week_games: number;

  @Column({ default: 0 }) past_week_playtime: number;

  @Column({ default: 0 }) login_streak: number;

  @Column({ default: 0 }) total_xp: number;

  @Column({ default: 0 }) total_games: number;

  @Column({ default: 0 }) total_playtime: number;

  @ManyToOne(() => Account, account => account.stats)
  @JoinColumn({ name: 'account_id' })
  account: Account;
}
