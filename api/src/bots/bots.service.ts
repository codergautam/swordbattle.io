import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BotSetting } from './botSetting.entity';
import { BotMessage } from './botMessage.entity';

const configKey = 'config';
const emojiKey = 'emojis';

export const botConfigDefaults = {
  support: {
    notifyStaffReply: false,
    notifyClosed: false,
    notifyStatusChange: false,
  },
  leaderboard: {
    topN: 10,
    singlePush: false,
    dailyEnabled: false,
    dailyXpThreshold: 500000,
  },
};

const clampInt = (v: any, min: number, max: number, fallback: number) => {
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
};

@Injectable()
export class BotsService {
  constructor(
    @InjectRepository(BotSetting) private readonly settings: Repository<BotSetting>,
    @InjectRepository(BotMessage) private readonly messages: Repository<BotMessage>,
  ) {}

  private async readSetting(key: string) {
    const row = await this.settings.findOne({ where: { key } });
    return row ? row.value : null;
  }

  private async writeSetting(key: string, value: any) {
    const row = (await this.settings.findOne({ where: { key } })) || this.settings.create({ key });
    row.value = value;
    await this.settings.save(row);
    return value;
  }

  private normalize(raw: any) {
    const stored = raw && typeof raw === 'object' ? raw : {};
    const support = { ...botConfigDefaults.support, ...(stored.support || {}) };
    const leaderboard = { ...botConfigDefaults.leaderboard, ...(stored.leaderboard || {}) };
    return {
      support: {
        notifyStaffReply: !!support.notifyStaffReply,
        notifyClosed: !!support.notifyClosed,
        notifyStatusChange: !!support.notifyStatusChange,
      },
      leaderboard: {
        topN: clampInt(leaderboard.topN, 3, 25, botConfigDefaults.leaderboard.topN),
        singlePush: !!leaderboard.singlePush,
        dailyEnabled: !!leaderboard.dailyEnabled,
        dailyXpThreshold: clampInt(leaderboard.dailyXpThreshold, 0, 1000000000, botConfigDefaults.leaderboard.dailyXpThreshold),
      },
    };
  }

  async getConfig() {
    return this.normalize(await this.readSetting(configKey));
  }

  async saveConfig(patch: any) {
    const current = await this.getConfig();
    const merged = {
      support: { ...current.support, ...((patch && patch.support) || {}) },
      leaderboard: { ...current.leaderboard, ...((patch && patch.leaderboard) || {}) },
    };
    const normalized = this.normalize(merged);
    await this.writeSetting(configKey, normalized);
    return normalized;
  }

  async getEmojis() {
    const stored = await this.readSetting(emojiKey);
    return Array.isArray(stored) ? stored : [];
  }

  async saveEmojis(list: any[]) {
    const clean = (Array.isArray(list) ? list : [])
      .filter((e) => e && e.name && e.id)
      .slice(0, 400)
      .map((e) => ({
        name: String(e.name).slice(0, 64),
        id: String(e.id).slice(0, 32),
        animated: !!e.animated,
        tag: `<${e.animated ? 'a' : ''}:${String(e.name).slice(0, 64)}:${String(e.id).slice(0, 32)}>`,
      }));
    await this.writeSetting(emojiKey, clean);
    return clean;
  }

  async queueMessage(dto: any) {
    const reactions = (Array.isArray(dto?.reactions) ? dto.reactions : [])
      .map((r: any) => String(r).trim())
      .filter(Boolean)
      .slice(0, 20);
    const row = this.messages.create({
      bot: dto?.bot === 'support' || dto?.bot === 'metrics' ? dto.bot : 'leaderboard',
      title: String(dto?.title || '').slice(0, 256),
      body: String(dto?.body || '').slice(0, 4000),
      color: dto?.color ? String(dto.color).slice(0, 16) : null,
      ping: !!dto?.ping,
      reactions,
      status: 'pending',
    });
    return this.messages.save(row);
  }

  async pendingMessages(bot: string) {
    return this.messages.find({
      where: { bot: bot || 'leaderboard', status: 'pending' },
      order: { id: 'ASC' },
      take: 10,
    });
  }

  async listMessages(limit = 20) {
    return this.messages.find({ order: { id: 'DESC' }, take: Math.min(100, limit) });
  }

  async setMessageStatus(id: number, status: string, error?: string) {
    const row = await this.messages.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Message not found');
    row.status = status === 'sent' ? 'sent' : 'failed';
    row.sent_at = new Date();
    row.error = error ? String(error).slice(0, 500) : null;
    return this.messages.save(row);
  }

  async deleteMessage(id: number) {
    const res = await this.messages.delete({ id });
    return { ok: true, removed: res.affected || 0 };
  }
}
