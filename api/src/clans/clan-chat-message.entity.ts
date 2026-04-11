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
  // reserved for the deferred bank feature
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

  // null when the message is system-generated
  @Column({ nullable: true }) accountId: number | null;

  @ManyToOne(() => Account, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'accountId' })
  account: Account | null;

  @Column({ length: 200 }) content: string;

  @Column({ type: 'int', default: ClanChatMessageType.User })
  type: ClanChatMessageType;

  // For system messages: stores actor/target account ids and any extra context.
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;
}
