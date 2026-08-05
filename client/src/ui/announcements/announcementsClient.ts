import { format } from 'date-fns';
import api from '../../api';

export type AnnouncementSummary = {
  id: number;
  title: string;
  icon: string;
  color: string;
  isUpdate: boolean;
  createdAt: string;
};

export type AnnouncementFull = AnnouncementSummary & { body: string };

export type AnnouncementList = { announcements: AnnouncementSummary[]; updateId: number | null; serverNow: number | null };

let cache: { at: number; data: AnnouncementList } | null = null;
const cacheTtl = 60000;

function getJson(url: string): Promise<any> {
  return new Promise((resolve) => api.get(url, resolve));
}

export async function fetchAnnouncements(force = false): Promise<AnnouncementList> {
  if (!force && cache && Date.now() - cache.at < cacheTtl) return cache.data;
  const d = await getJson(`${api.endpoint}/announcements/list`);
  if (!d || !Array.isArray(d.announcements)) throw new Error('announcements unavailable');
  const data: AnnouncementList = {
    announcements: d.announcements,
    updateId: typeof d.updateId === 'number' ? d.updateId : null,
    serverNow: d.now ? new Date(d.now).getTime() || null : null,
  };
  cache = { at: Date.now(), data };
  return data;
}

export async function fetchAnnouncement(id: number): Promise<AnnouncementFull | null> {
  const d = await getJson(`${api.endpoint}/announcements/get?id=${id}`);
  return d && d.announcement ? d.announcement : null;
}

const baselineKey = 'sb:ann:baseline';
const readKey = 'sb:ann:read';

export const announcementsRefreshEvent = 'sb:announcements-refresh';

export function pingAnnouncementsRefresh() {
  try { window.dispatchEvent(new Event(announcementsRefreshEvent)); } catch {}
}

function ensureBaseline(serverNow: number | null): number {
  try {
    const stored = window.localStorage.getItem(baselineKey);
    if (stored) {
      const t = parseInt(stored, 10);
      if (t) return t;
    }
    const now = serverNow || Date.now();
    window.localStorage.setItem(baselineKey, String(now));
    return now;
  } catch {
    return serverNow || Date.now();
  }
}

function getReadIds(): number[] {
  try {
    const arr = JSON.parse(window.localStorage.getItem(readKey) || '[]');
    return Array.isArray(arr) ? arr.filter((v) => typeof v === 'number') : [];
  } catch {
    return [];
  }
}

export function markAnnouncementRead(id: number) {
  try {
    const ids = getReadIds();
    if (!ids.includes(id)) {
      ids.push(id);
      window.localStorage.setItem(readKey, JSON.stringify(ids.slice(-300)));
    }
  } catch {}
  pingAnnouncementsRefresh();
}

export async function fetchUnreadAnnouncementCount(): Promise<number> {
  const d = await fetchAnnouncements();
  const baseline = ensureBaseline(d.serverNow);
  const read = getReadIds();
  return d.announcements.filter((a) => {
    const t = new Date(a.createdAt).getTime();
    return t > baseline && !read.includes(a.id);
  }).length;
}

export function announcementLink(id: number): string {
  return `${window.location.origin}/?announcement=${id}`;
}

export function announcementIdFromHref(href: string): number | null {
  try {
    const u = new URL(href, window.location.origin);
    const sameSite = u.origin === window.location.origin
      || u.hostname === 'swordbattle.io'
      || u.hostname.endsWith('.swordbattle.io');
    if (!sameSite) return null;
    const v = u.searchParams.get('announcement');
    if (v && /^\d+$/.test(v)) return parseInt(v, 10);
  } catch {}
  return null;
}

export function formatAnnouncementDate(iso: string): string {
  const t = new Date(iso);
  if (isNaN(t.getTime())) return '';
  return format(t, 'MMMM do, yyyy, h:mmaaa');
}
