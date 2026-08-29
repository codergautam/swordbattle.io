import { BrowserPlayLease } from './BrowserPlayLease';

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

describe('BrowserPlayLease', () => {
  let now = 1_000;
  let storage: MemoryStorage;

  beforeEach(() => {
    jest.useFakeTimers();
    now = 1_000;
    storage = new MemoryStorage();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('allows one playing tab and rejects a second live tab', () => {
    const first = new BrowserPlayLease(storage as any, 'tab-a', () => now);
    const second = new BrowserPlayLease(storage as any, 'tab-b', () => now);

    expect(first.acquire()).toBe(true);
    expect(second.acquire()).toBe(false);

    first.release();
    expect(second.acquire()).toBe(true);
    second.release();
  });

  it('recovers automatically after a stale tab lease expires', () => {
    const first = new BrowserPlayLease(storage as any, 'tab-a', () => now);
    const second = new BrowserPlayLease(storage as any, 'tab-b', () => now);

    expect(first.acquire()).toBe(true);
    first.dispose();
    // Simulate a crashed tab by restoring its stale record after dispose.
    storage.setItem('swordbattle:active-play-session:v1', JSON.stringify({
      ownerId: 'tab-a',
      expiresAt: now + BrowserPlayLease.ttlMs,
    }));
    now += BrowserPlayLease.ttlMs + 1;

    expect(second.acquire()).toBe(true);
    second.release();
  });

  it('renews an owned lease while gameplay remains active', () => {
    const lease = new BrowserPlayLease(storage as any, 'tab-a', () => now);
    expect(lease.acquire()).toBe(true);
    now += BrowserPlayLease.heartbeatMs;
    jest.advanceTimersByTime(BrowserPlayLease.heartbeatMs);

    const record = JSON.parse(storage.getItem('swordbattle:active-play-session:v1')!);
    expect(record.expiresAt).toBe(now + BrowserPlayLease.ttlMs);
    lease.release();
  });
});
