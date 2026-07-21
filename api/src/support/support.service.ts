import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupportTicket, TicketMessage } from './supportTicket.entity';
import { ScreenshotBan } from './screenshotBan.entity';
import { ImageModerationService } from './imageModeration.service';
import { AuthService } from '../auth/auth.service';
import { SUPPORT_CATEGORIES } from './support.dto';

const maxMsg = 4000;
const maxThread = 200;
const maxImages = 3;

type Identity = { accountId: number | null; clientId: string | null; ip: string | null };

@Injectable()
export class SupportService {
  constructor(
    @InjectRepository(SupportTicket)
    private readonly tickets: Repository<SupportTicket>,
    @InjectRepository(ScreenshotBan)
    private readonly bans: Repository<ScreenshotBan>,
    private readonly moderation: ImageModerationService,
    private readonly authService: AuthService,
  ) {}

  private clean(text: string): string {
    return String(text || '').replace(/\r\n/g, '\n').trim().slice(0, maxMsg);
  }

  private cleanImages(arr: any): string[] | undefined {
    if (!Array.isArray(arr)) return undefined;
    const imgs = arr
      .filter((s) => typeof s === 'string' && s.startsWith('data:image/') && s.length <= 3_200_000)
      .slice(0, maxImages);
    return imgs.length ? imgs : undefined;
  }

  private message(from: 'user' | 'staff', text: string, images?: string[]): TicketMessage {
    const msg: TicketMessage = { from, text, at: Date.now() };
    if (images && images.length) msg.images = images;
    return msg;
  }

  private async isScreenshotBanned(id: Identity): Promise<boolean> {
    const conds: string[] = [];
    const params: any = {};
    if (id.accountId != null) { conds.push('b.account_id = :aid'); params.aid = id.accountId; }
    if (id.clientId) { conds.push('b.client_id = :cid'); params.cid = id.clientId; }
    if (id.ip) { conds.push('b.ip = :ip'); params.ip = id.ip; }
    if (!conds.length) return false;
    const n = await this.bans.createQueryBuilder('b').where(`(${conds.join(' OR ')})`, params).getCount();
    return n > 0;
  }

  private async banScreenshots(id: Identity, reason: string): Promise<void> {
    if (await this.isScreenshotBanned(id)) return;
    await this.bans.save(this.bans.create({
      account_id: id.accountId ?? null,
      client_id: id.clientId ?? null,
      ip: id.ip ?? null,
      reason: String(reason || '').slice(0, 200),
    }));
  }

  private async enforceImages(id: Identity, rawImages: any): Promise<string[] | undefined> {
    const images = this.cleanImages(rawImages);
    if (!images) return undefined;

    if (await this.isScreenshotBanned(id)) {
      throw new ForbiddenException(
        'Screenshots are turned off for your account after a previous image was flagged. You can still send your message — just remove the screenshot and send it as text.',
      );
    }

    const verdict = await this.moderation.check(images);
    if (verdict.blocked) {
      await this.banScreenshots(id, verdict.reason);
      throw new ForbiddenException(
        'That screenshot appears to break our rules, so your message was not sent and screenshots are now turned off for your account. You can still send your report as text without the image.',
      );
    }
    return images;
  }

  private async accountFromSecret(secret?: string) {
    if (!secret) return null;
    try {
      return await this.authService.getAccountFromSecret(secret);
    } catch {
      return null;
    }
  }

  private owns(ticket: SupportTicket, account: any, clientId?: string): boolean {
    if (account && ticket.account_id && ticket.account_id === account.id) return true;
    if (clientId && ticket.client_id && ticket.client_id === clientId) return true;
    return false;
  }

  private userView(t: SupportTicket) {
    return {
      id: t.id,
      category: t.category,
      subject: t.subject,
      status: t.status,
      details: t.details || {},
      contact: t.contact || '',
      linkedUsername: t.username || null,
      messages: t.messages || [],
      unread: !!t.unread_for_user,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
    };
  }

  async submit(dto: any, ip?: string) {
    const account = await this.accountFromSecret(dto.secret);
    const message = this.clean(dto.message);
    if (!message) throw new ForbiddenException('Message is empty');

    const category = SUPPORT_CATEGORIES.includes(dto.category) ? dto.category : 'other';
    const identity: Identity = {
      accountId: account ? account.id : null,
      clientId: dto.clientId ? String(dto.clientId).slice(0, 100) : null,
      ip: ip ? String(ip).slice(0, 45) : null,
    };
    const firstMessage = this.message('user', message, await this.enforceImages(identity, dto.images));

    const ticket = this.tickets.create({
      category,
      subject: this.clean(dto.subject).slice(0, 140),
      account_id: account ? account.id : null,
      username: account ? account.username : null,
      client_id: dto.clientId ? String(dto.clientId).slice(0, 100) : null,
      ip: ip ? String(ip).slice(0, 45) : null,
      contact: dto.contact ? this.clean(dto.contact).slice(0, 200) : null,
      details: dto.details && typeof dto.details === 'object' ? dto.details : {},
      messages: [firstMessage],
      status: 'open',
      unread_for_user: false,
      unread_for_admin: true,
    });

    const saved = await this.tickets.save(ticket);
    return { ok: true, ticket: this.userView(saved) };
  }

  async mine(dto: any) {
    const account = await this.accountFromSecret(dto.secret);
    const clientId = dto.clientId ? String(dto.clientId) : null;

    const conds: string[] = [];
    const params: any = {};
    if (account) { conds.push('t.account_id = :aid'); params.aid = account.id; }
    if (clientId) { conds.push('t.client_id = :cid'); params.cid = clientId; }
    if (!conds.length) return { tickets: [], unreadCount: 0, screenshotsBlocked: false };

    const rows = await this.tickets
      .createQueryBuilder('t')
      .where(`(${conds.join(' OR ')})`, params)
      .orderBy('t.updated_at', 'DESC')
      .take(100)
      .getMany();

    return {
      tickets: rows.map((t) => this.userView(t)),
      unreadCount: rows.filter((t) => t.unread_for_user).length,
      screenshotsBlocked: await this.isScreenshotBanned({
        accountId: account ? account.id : null, clientId, ip: null,
      }),
    };
  }

  async unread(dto: any) {
    const account = await this.accountFromSecret(dto.secret);
    const clientId = dto.clientId ? String(dto.clientId) : null;
    const conds: string[] = [];
    const params: any = {};
    if (account) { conds.push('t.account_id = :aid'); params.aid = account.id; }
    if (clientId) { conds.push('t.client_id = :cid'); params.cid = clientId; }
    if (!conds.length) return { unreadCount: 0 };
    const count = await this.tickets
      .createQueryBuilder('t')
      .where(`t.unread_for_user = true AND (${conds.join(' OR ')})`, params)
      .getCount();
    return { unreadCount: count };
  }

  async reply(dto: any, ip?: string) {
    const account = await this.accountFromSecret(dto.secret);
    const ticket = await this.tickets.findOne({ where: { id: dto.ticketId } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (!this.owns(ticket, account, dto.clientId)) throw new ForbiddenException('Not your ticket');

    const text = this.clean(dto.message);
    if (!text) throw new ForbiddenException('Message is empty');

    const identity: Identity = {
      accountId: account ? account.id : null,
      clientId: dto.clientId ? String(dto.clientId).slice(0, 100) : null,
      ip: ip ? String(ip).slice(0, 45) : null,
    };
    ticket.messages = [...(ticket.messages || []), this.message('user', text, await this.enforceImages(identity, dto.images))].slice(-maxThread);
    ticket.status = 'open';
    ticket.unread_for_admin = true;
    const saved = await this.tickets.save(ticket);
    return { ok: true, ticket: this.userView(saved) };
  }

  async markSeen(dto: any) {
    const account = await this.accountFromSecret(dto.secret);
    const ticket = await this.tickets.findOne({ where: { id: dto.ticketId } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (!this.owns(ticket, account, dto.clientId)) throw new ForbiddenException('Not your ticket');

    if (ticket.unread_for_user) {
      ticket.unread_for_user = false;
      await this.tickets.save(ticket);
    }
    return { ok: true };
  }

  async adminList(status?: string, category?: string, limit = 200) {
    const qb = this.tickets.createQueryBuilder('t').orderBy('t.updated_at', 'DESC').take(Math.min(500, limit));
    if (status && status !== 'all') qb.andWhere('t.status = :status', { status });
    if (category && category !== 'all') qb.andWhere('t.category = :category', { category });
    const rows = await qb.getMany();

    const bans = await this.bans.find();
    const bannedAccounts = new Set(bans.map((b) => b.account_id).filter((v) => v != null));
    const bannedClients = new Set(bans.map((b) => b.client_id).filter(Boolean));
    const bannedIps = new Set(bans.map((b) => b.ip).filter(Boolean));
    const isBanned = (t: SupportTicket) =>
      (t.account_id != null && bannedAccounts.has(t.account_id)) ||
      (!!t.client_id && bannedClients.has(t.client_id)) ||
      (!!t.ip && bannedIps.has(t.ip));

    return {
      tickets: rows.map((t) => ({ ...t, screenshotBanned: isBanned(t) })),
      openCount: await this.tickets.count({ where: { status: 'open' } }),
      unreadCount: await this.tickets.count({ where: { unread_for_admin: true } }),
    };
  }

  async adminUnbanScreenshots(ticketId: number) {
    const ticket = await this.tickets.findOne({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    const qb = this.bans.createQueryBuilder().delete();
    const conds: string[] = [];
    const params: any = {};
    if (ticket.account_id != null) { conds.push('account_id = :aid'); params.aid = ticket.account_id; }
    if (ticket.client_id) { conds.push('client_id = :cid'); params.cid = ticket.client_id; }
    if (ticket.ip) { conds.push('ip = :ip'); params.ip = ticket.ip; }
    if (!conds.length) return { ok: true, removed: 0 };
    const res = await qb.where(`(${conds.join(' OR ')})`, params).execute();
    return { ok: true, removed: res.affected || 0 };
  }

  async adminReply(dto: any) {
    const ticket = await this.tickets.findOne({ where: { id: dto.ticketId } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    const text = this.clean(dto.message);
    if (!text) throw new ForbiddenException('Message is empty');

    ticket.messages = [...(ticket.messages || []), this.message('staff', text, this.cleanImages(dto.images))].slice(-maxThread);
    ticket.status = dto.status || 'answered';
    ticket.unread_for_user = true;
    ticket.unread_for_admin = false;
    return this.tickets.save(ticket);
  }

  async adminSetStatus(dto: any) {
    const ticket = await this.tickets.findOne({ where: { id: dto.ticketId } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    ticket.status = dto.status;
    ticket.unread_for_admin = false;
    return this.tickets.save(ticket);
  }

  async adminMarkRead(ticketId: number) {
    const ticket = await this.tickets.findOne({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    ticket.unread_for_admin = false;
    return this.tickets.save(ticket);
  }
}
