import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Account } from 'src/accounts/account.entity';

@Entity({ name: 'games' })
export class Game {
  @PrimaryGeneratedColumn() id: number;

  @CreateDateColumn() created_at: Date;

  @Column() playtime: number;

  @Column() coins: number;

  @Column() kills: number;

  @ManyToOne(() => Account, account => account.games)
  @JoinColumn({ name: 'account_id' })
  account: Account;
}
