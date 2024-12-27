import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Account } from 'src/accounts/account.entity';

@Entity({ name: 'transactions' })
export class Transaction {
  @PrimaryGeneratedColumn() id: number

  @CreateDateColumn() created_at: Date;

  @Column() transaction_id: string;

  @Column() description: string;

  @Column() amount: number;

  @ManyToOne(() => Account, account => account.transactions)
  @JoinColumn({ name: 'account_id' })
  account: Account;
}
