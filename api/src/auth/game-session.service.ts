import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { ActiveGameSession } from './game-session.entity';

export type GameSessionAcquireResult =
  | { acquired: true; leaseId: string; expiresAt: Date; ttlMs: number }
  | { acquired: false; retryAfterMs: number };

@Injectable()
export class GameSessionService {
  static readonly leaseTtlMs = 45_000;

  constructor(
    @InjectRepository(ActiveGameSession)
    private readonly sessions: Repository<ActiveGameSession>,
  ) {}

  private cleanId(value: unknown, fallback: string): string {
    const cleaned = String(value || '')
      .replace(/[^a-zA-Z0-9:._-]/g, '')
      .slice(0, 128);
    return cleaned || fallback;
  }

  async acquire(accountId: number, serverId: unknown, ownerId: unknown): Promise<GameSessionAcquireResult> {
    const leaseId = uuidv4();
    const safeServerId = this.cleanId(serverId, 'unknown-server');
    const safeOwnerId = this.cleanId(ownerId, 'unknown-client');
    const expiresAt = new Date(Date.now() + GameSessionService.leaseTtlMs);

    // This conditional upsert is the lock. PostgreSQL serializes competing
    // inserts for one account, so two game servers cannot both win.
    const rows = await this.sessions.query(
      `INSERT INTO active_game_sessions
        (account_id, lease_id, server_id, owner_id, expires_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (account_id) DO UPDATE SET
         lease_id = EXCLUDED.lease_id,
         server_id = EXCLUDED.server_id,
         owner_id = EXCLUDED.owner_id,
         expires_at = EXCLUDED.expires_at,
         updated_at = NOW()
       WHERE active_game_sessions.expires_at <= NOW()
       RETURNING lease_id, expires_at`,
      [accountId, leaseId, safeServerId, safeOwnerId, expiresAt],
    );

    if (rows.length > 0) {
      return { acquired: true, leaseId, expiresAt, ttlMs: GameSessionService.leaseTtlMs };
    }

    const active = await this.sessions.findOne({ where: { accountId } });
    const retryAfterMs = active
      ? Math.max(500, active.expiresAt.getTime() - Date.now())
      : 1000;
    return { acquired: false, retryAfterMs };
  }

  async heartbeat(accountId: number, leaseId: string, serverId: unknown): Promise<boolean> {
    const expiresAt = new Date(Date.now() + GameSessionService.leaseTtlMs);
    const result = await this.sessions.update(
      {
        accountId,
        leaseId,
        serverId: this.cleanId(serverId, 'unknown-server'),
      },
      { expiresAt },
    );
    return (result.affected || 0) === 1;
  }

  async release(accountId: number, leaseId: string, serverId: unknown): Promise<boolean> {
    const result = await this.sessions.delete({
      accountId,
      leaseId,
      serverId: this.cleanId(serverId, 'unknown-server'),
    });
    return (result.affected || 0) === 1;
  }
}
