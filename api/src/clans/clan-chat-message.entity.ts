import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Account } from '../accounts/account.entity';
import { Clan } from './clan.entity';

export enum ClanChatMessageType {
  User = 0,
  Join = 1,
  Leave = 2,
  Kick = 3,
  Promote = 4,
  Demote = 5,
  Bank = 6,
}

@Entity({ name: 'clan_chat_messages' })
export class ClanChatMessage {
  @PrimaryGeneratedColumn() id: number;

  @CreateDateColumn() created_at: Date;

  @Index()
  @Column() clanId: number;

  @ManyToOne(() => Clan, (clan) => clan.chatMessages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clanId' })
  clan: Clan;

  @Column({ nullable: true }) accountId: number | null;

  @ManyToOne(() => Account, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'accountId' })
  account: Account | null;

  @Column({ length: 200 }) content: string;

  @Column({ type: 'int', default: ClanChatMessageType.User })
  type: ClanChatMessageType;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;
}
