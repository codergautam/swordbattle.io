import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  OneToOne,
} from 'typeorm';
import { Account } from '../accounts/account.entity';
import { Clan } from './clan.entity';

export enum ClanRole {
  Leader = 0,
  CoLeader = 1,
  Elite = 2,
  Member = 3,
}

@Entity({ name: 'clan_members' })
export class ClanMember {
  @PrimaryGeneratedColumn() id: number;

  @CreateDateColumn() joined_at: Date;

  @Index()
  @Column() clanId: number;

  @ManyToOne(() => Clan, (clan) => clan.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clanId' })
  clan: Clan;

  @Index({ unique: true })
  @Column() accountId: number;

  @OneToOne(() => Account, (account) => account.clanMember, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'accountId' })
  account: Account;

  @Column({ type: 'int', default: ClanRole.Member }) role: ClanRole;

  @Column({ type: 'bigint', default: 0 }) contributedXp: number;
}
