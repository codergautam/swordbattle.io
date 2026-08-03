import api from '../../api';

const clientIdKey = 'sb:supportId';

export function getSupportClientId(): string {
  try {
    let id = window.localStorage.getItem(clientIdKey);
    if (!id) {
      id = makeId();
      window.localStorage.setItem(clientIdKey, id);
    }
    return id;
  } catch {
    return makeId();
  }
}

function makeId(): string {
  try {
    if (window.crypto && (window.crypto as any).randomUUID) return (window.crypto as any).randomUUID();
  } catch {}
  return 'c-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function deviceSnapshot(): Record<string, any> {
  const nav: any = typeof navigator !== 'undefined' ? navigator : {};
  const info: Record<string, any> = {};
  try {
    info.userAgent = nav.userAgent || '';
    info.platform = nav.platform || '';
    info.screen = typeof window !== 'undefined' ? `${window.screen?.width || 0}x${window.screen?.height || 0}` : '';
    info.viewport = typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : '';
    info.dpr = typeof window !== 'undefined' ? window.devicePixelRatio : 1;
    if (nav.deviceMemory) info.deviceMemory = nav.deviceMemory;
    if (nav.hardwareConcurrency) info.cores = nav.hardwareConcurrency;
    if (nav.connection && nav.connection.effectiveType) info.connection = nav.connection.effectiveType;
  } catch {}
  return info;
}

export type TicketMessage = { from: 'user' | 'staff'; text: string; at: number; images?: string[] };

export async function compressImage(file: File, maxDim = 1200): Promise<string | null> {
  if (!file || !file.type.startsWith('image/')) return null;
  try {
    const dataUrl: string = await new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(String(fr.result));
      fr.onerror = rej;
      fr.readAsDataURL(file);
    });
    const img: HTMLImageElement = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = dataUrl;
    });
    let w = img.width || 1;
    let h = img.height || 1;
    const scale = Math.min(1, maxDim / Math.max(w, h));
    w = Math.max(1, Math.round(w * scale));
    h = Math.max(1, Math.round(h * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return dataUrl.length < 1_300_000 ? dataUrl : null;
    ctx.drawImage(img, 0, 0, w, h);
    for (const q of [0.6, 0.45, 0.35]) {
      const out = canvas.toDataURL('image/jpeg', q);
      if (out.length <= 1_300_000) return out;
    }
    return canvas.toDataURL('image/jpeg', 0.3);
  } catch {
    return null;
  }
}

export const MAX_TICKET_IMAGES = 3;
export type Ticket = {
  id: number;
  category: string;
  subject: string;
  status: string;
  details: Record<string, any>;
  contact: string;
  linkedUsername: string | null;
  messages: TicketMessage[];
  unread: boolean;
  createdAt: string;
  updatedAt: string;
};

export function submitTicket(payload: {
  category: string; subject?: string; message: string; details?: Record<string, any>; images?: string[];
}): Promise<{ ok?: boolean; ticket?: Ticket; message?: string }> {
  return api.postAsync(`${api.endpoint}/support/submit`, { ...payload, clientId: getSupportClientId() });
}

export function fetchMyTickets(): Promise<{ tickets: Ticket[]; unreadCount: number; screenshotsBlocked: boolean }> {
  return api.postAsync(`${api.endpoint}/support/mine`, { clientId: getSupportClientId() })
    .then((d) => ({ tickets: d?.tickets || [], unreadCount: d?.unreadCount || 0, screenshotsBlocked: !!d?.screenshotsBlocked }));
}

export function fetchUnreadCount(): Promise<number> {
  return api.postAsync(`${api.endpoint}/support/unread`, { clientId: getSupportClientId() })
    .then((d) => d?.unreadCount || 0)
    .catch(() => 0);
}

export function replyToTicket(ticketId: number, message: string, images?: string[]): Promise<{ ok?: boolean; ticket?: Ticket; message?: string | string[] }> {
  return api.postAsync(`${api.endpoint}/support/reply`, { ticketId, message, images, clientId: getSupportClientId() });
}

export function markTicketSeen(ticketId: number): Promise<any> {
  return api.postAsync(`${api.endpoint}/support/seen`, { ticketId, clientId: getSupportClientId() });
}

export const SUPPORT_REFRESH_EVENT = 'sb:support-refresh';
export function pingSupportRefresh() {
  try { window.dispatchEvent(new Event(SUPPORT_REFRESH_EVENT)); } catch {}
}
