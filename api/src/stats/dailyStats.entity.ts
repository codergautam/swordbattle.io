import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Account } from 'src/accounts/account.entity';

@Entity({ name: 'daily_stats' })
export class DailyStats {
  @PrimaryGeneratedColumn() id: number;

  @Column({ type: 'date' }) date: Date;

  @Column({ default: 0 }) xp: number;

  @Column({ default: 0 }) coins: number;
  
  @Column({ default: 0 }) kills: number;

  @Column({ default: 1 }) games: number;

  @Column({ default: 0 }) playtime: number;

  @Column({ default: 0 }) login_streak: number;

  @ManyToOne(() => Account, account => account.daily_stats)
  @JoinColumn({ name: 'account_id' })
  account: Account;
}
