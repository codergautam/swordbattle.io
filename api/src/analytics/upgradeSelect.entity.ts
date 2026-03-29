import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Account } from 'src/accounts/account.entity';

@Entity({ name: 'upgrade_selects' })
export class UpgradeSelect {
  @PrimaryGeneratedColumn() id: number;

  @CreateDateColumn() created_at: Date;

  @Column() card_id: number;

  @Column() card_name: string;

  @Column() is_major: boolean;

  @Column() card_pick_number: number;

  @Column({ nullable: true }) evolution: number;

  @Column({ nullable: true }) coins: number;

  @Column({ nullable: true }) level: number;

  @Column({ type: 'text', nullable: true }) minor_stacks: string;

  @Column({ type: 'text', nullable: true }) major_cards: string;

  @ManyToOne(() => Account, { nullable: true })
  @JoinColumn({ name: 'account_id' })
  account: Account;

  @Column({ nullable: true }) account_id: number;
}
