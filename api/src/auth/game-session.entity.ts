import { Column, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'active_game_sessions' })
@Index('IDX_active_game_sessions_expires_at', ['expiresAt'])
export class ActiveGameSession {
  @PrimaryColumn({ type: 'integer', name: 'account_id' })
  accountId: number;

  @Column({ type: 'varchar', length: 64, name: 'lease_id' })
  leaseId: string;

  @Column({ type: 'varchar', length: 128, name: 'server_id' })
  serverId: string;

  @Column({ type: 'varchar', length: 128, name: 'owner_id' })
  ownerId: string;

  @Column({ type: 'timestamptz', name: 'expires_at' })
  expiresAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
