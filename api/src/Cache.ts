export default class CacheObj<T> {
  private data: T | null = null;
  private lastFetch: number = 0;
  private readonly ttl: number; // Time to live in milliseconds

  constructor(ttl: number) {
    this.ttl = ttl;
  }

  isStale(): boolean {
    return Date.now() - this.lastFetch > this.ttl;
  }

  updateData(newData: T) {
    this.data = newData;
    this.lastFetch = Date.now();
  }

  getData(): T | null {
    return this.data;
  }
}