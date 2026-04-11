import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { ClanMember } from './clan-member.entity';
import { ClanJoinRequest } from './clan-join-request.entity';
import { ClanChatMessage } from './clan-chat-message.entity';

export enum ClanStatus {
  Public = 0,
  Request = 1,
  Private = 2,
}

@Entity({ name: 'clans' })
export class Clan {
  @PrimaryGeneratedColumn() id: number;

  @CreateDateColumn() created_at: Date;

  @Index({ unique: true })
  @Column({ length: 4 }) tag: string;

  @Index({ unique: true })
  @Column({ length: 25 }) name: string;

  @Column({ type: 'text', default: '' }) description: string;

  @Column({ default: 1 }) frameId: number;
  @Column({ default: 1 }) iconId: number;

  // reserved for the deferred banner system
  @Column({ default: 0 }) bannerId: number;

  @Column({ length: 7, default: '#ffffff' }) frameColor: string;
  @Column({ length: 7, default: '#33cc33' }) iconColor: string;

  // reserved for the deferred custom-tag-color feature
  @Column({ length: 7, default: '#ffd700' }) tagColor: string;
  @Column({ default: false }) customTagColor: boolean;

  @Column({ type: 'int', default: ClanStatus.Public }) status: ClanStatus;

  @Column({ type: 'bigint', default: 0 }) xpRequirement: number;
  @Column({ type: 'bigint', default: 0 }) masteryRequirement: number;

  // Denormalized aggregate of all members' contributedXp. Updated incrementally so the
  // leaderboard query stays cheap.
  @Column({ type: 'bigint', default: 0 }) clanXp: number;

  // Composite "rank" stat — kept as a column so it can be sorted on directly. Computed
  // by an offline job (not implemented for v1, stays at 0).
  @Column({ default: 0 }) clanRank: number;

  // Reserved schema for the deferred relations and bank features.
  @Column({ type: 'jsonb', default: () => `'{"allies":[],"enemies":[]}'` })
  relations: { allies: number[]; enemies: number[] };

  @Column({ type: 'jsonb', default: () => `'{"value":0,"max":0}'` })
  bank: { value: number; max: number };

  @Column() leaderId: number;

  @OneToMany(() => ClanMember, (member) => member.clan)
  members: ClanMember[];

  @OneToMany(() => ClanJoinRequest, (req) => req.clan)
  joinRequests: ClanJoinRequest[];

  @OneToMany(() => ClanChatMessage, (msg) => msg.clan)
  chatMessages: ClanChatMessage[];
}
