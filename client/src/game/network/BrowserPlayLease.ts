type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

type LeaseRecord = {
  ownerId: string;
  expiresAt: number;
};

const lockKey = 'swordbattle:active-play-session:v1';
const tabIdKey = 'swordbattle:play-tab-id:v1';

function createTabId(): string {
  try {
    const existing = window.sessionStorage.getItem(tabIdKey);
    if (existing) return existing;
    const id = window.crypto?.randomUUID?.()
      || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    window.sessionStorage.setItem(tabIdKey, id);
    return id;
  } catch (_) {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }
}

export class BrowserPlayLease {
  static readonly ttlMs = 8_000;
  static readonly heartbeatMs = 2_000;

  private active = false;
  private heartbeat: ReturnType<typeof setInterval> | null = null;
  private onLost: (() => void) | null = null;
  private readonly onStorageBound: (event: StorageEvent) => void;

  constructor(
    private readonly storage: StorageLike,
    readonly ownerId: string,
    private readonly now: () => number = () => Date.now(),
    private readonly eventTarget?: EventTarget,
  ) {
    this.onStorageBound = this.handleStorage.bind(this);
    this.eventTarget?.addEventListener('storage', this.onStorageBound as EventListener);
  }

  private read(): LeaseRecord | null {
    try {
      const raw = this.storage.getItem(lockKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (typeof parsed?.ownerId !== 'string' || !Number.isFinite(parsed?.expiresAt)) return null;
      return parsed;
    } catch (_) {
      return null;
    }
  }

  private write(): boolean {
    try {
      this.storage.setItem(lockKey, JSON.stringify({
        ownerId: this.ownerId,
        expiresAt: this.now() + BrowserPlayLease.ttlMs,
      }));
      return this.read()?.ownerId === this.ownerId;
    } catch (_) {
      // Storage can be disabled. The server-side account lease remains the
      // security boundary, so failing open here preserves playability.
      return true;
    }
  }

  acquire(onLost?: () => void): boolean {
    this.onLost = onLost || null;
    if (this.active) {
      const current = this.read();
      if (current && current.ownerId !== this.ownerId && current.expiresAt > this.now()) {
        this.lose();
        return false;
      }
      return this.write();
    }

    const existing = this.read();
    if (existing && existing.ownerId !== this.ownerId && existing.expiresAt > this.now()) {
      return false;
    }
    if (!this.write()) return false;

    this.active = true;
    this.heartbeat = setInterval(() => {
      if (this.active && !this.write()) this.lose();
    }, BrowserPlayLease.heartbeatMs);
    return true;
  }

  release(): void {
    if (this.read()?.ownerId === this.ownerId) {
      try { this.storage.removeItem(lockKey); } catch (_) {}
    }
    this.deactivate();
  }

  isActive(): boolean {
    return this.active;
  }

  dispose(): void {
    this.release();
    this.eventTarget?.removeEventListener('storage', this.onStorageBound as EventListener);
  }

  private handleStorage(event: StorageEvent): void {
    if (!this.active || event.key !== lockKey) return;
    const current = this.read();
    if (current && current.ownerId !== this.ownerId && current.expiresAt > this.now()) {
      this.lose();
    }
  }

  private lose(): void {
    const callback = this.onLost;
    this.deactivate();
    callback?.();
  }

  private deactivate(): void {
    this.active = false;
    this.onLost = null;
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.heartbeat = null;
  }
}

export const browserPlayLease = typeof window !== 'undefined'
  ? new BrowserPlayLease(window.localStorage, createTabId(), () => Date.now(), window)
  : null;

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => browserPlayLease?.release());
}
