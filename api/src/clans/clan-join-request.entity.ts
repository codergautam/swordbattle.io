import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Account } from '../accounts/account.entity';
import { Clan } from './clan.entity';

@Entity({ name: 'clan_join_requests' })
@Unique(['clanId', 'accountId'])
export class ClanJoinRequest {
  @PrimaryGeneratedColumn() id: number;

  @CreateDateColumn() created_at: Date;

  @Column({ type: 'varchar', length: 300, default: '' }) reason: string;

  @Index()
  @Column() clanId: number;

  @ManyToOne(() => Clan, (clan) => clan.joinRequests, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clanId' })
  clan: Clan;

  @Column() accountId: number;

  @ManyToOne(() => Account, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'accountId' })
  account: Account;
}
