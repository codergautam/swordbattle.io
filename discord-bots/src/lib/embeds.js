import { escapeMarkdown } from 'discord.js';
import { emojis } from './emojis.js';

export const colors = {
  brand: 0xffd700,
  error: 0xed4245,
  info: 0x5865f2,
  newTicket: 0xe67e22,
  reply: 0x3498db,
  digest: 0x2ecc71,
};

export function formatNumber(n) {
  return Math.round(Number(n) || 0).toLocaleString('en-US');
}

export function formatDuration(seconds) {
  let duration = Math.trunc(Number(seconds) || 0);
  const portions = [];
  const hours = Math.trunc(duration / 3600);
  if (hours > 0) {
    portions.push(`${hours}h`);
    duration -= hours * 3600;
  }
  const minutes = Math.trunc(duration / 60);
  if (minutes > 0) {
    portions.push(`${minutes}m`);
    duration -= minutes * 60;
  }
  if (duration > 0) portions.push(`${duration}s`);
  return portions.length ? portions.join(' ') : '0s';
}

export function discordTimestamp(dateLike, style = 'R') {
  return `<t:${Math.floor(new Date(dateLike).getTime() / 1000)}:${style}>`;
}

export function truncate(text, max) {
  const s = String(text ?? '');
  return s.length > max ? `${s.slice(0, Math.max(0, max - 1))}…` : s;
}

export function medal(rank) {
  if (rank === 1) return emojis.gold;
  if (rank === 2) return emojis.silver;
  if (rank === 3) return emojis.bronze;
  return `**#${rank}**`;
}

export const escapeName = (name) => escapeMarkdown(String(name ?? ''));
