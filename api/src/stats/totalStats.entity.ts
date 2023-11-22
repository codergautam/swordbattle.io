import { Entity, PrimaryColumn, Column, JoinColumn, OneToOne } from 'typeorm';
import { Account } from 'src/accounts/account.entity';

@Entity({ name: 'total_stats' })
export class TotalStats {
  @PrimaryColumn() id: number;

  @Column({ default: 0 }) xp: number;

  @Column({ default: 0 }) coins: number;

  @Column({ default: 0 }) kills: number;

  @Column({ default: 0 }) games: number;

  @Column({ default: 0 }) playtime: number;

  @Column({ default: 0 }) login_streak: number;

  @OneToOne(() => Account, account => account.total_stats)
  @JoinColumn({ name: 'id' })
  account: Account;
}
