import { TextureManager } from './TextureManager';
import { withAssetVersion } from '../../../assetVersion';

type ProgressCb = (value: number) => void;
type CompleteCb = () => void;
type ErrorCb = (file?: any) => void;

export class Loader {
  private queue: Array<{ key: string; url: string }> = [];
  private audioQueue: Array<{ key: string; url: string }> = [];
  private progressCbs: ProgressCb[] = [];
  private completeCbs: CompleteCb[] = [];
  private errorCbs: ErrorCb[] = [];
  private onceCompleteCbs: CompleteCb[] = [];
  private onceErrorCbs: ErrorCb[] = [];
  private inflight = new Map<string, Promise<boolean>>();
  private _textures: TextureManager;
  private _sound: any;

  constructor(textures: TextureManager, sound?: any) { this._textures = textures; this._sound = sound; }

  image(key: string, url: string): this { this.queue.push({ key, url }); return this; }
  spritesheet(key: string, url: string, _config?: any): this { this.queue.push({ key, url }); return this; }
  plugin(_key?: string, _ctor?: any, _start?: boolean): this { return this; }
  audio(key: string, url: string): this { this.audioQueue.push({ key, url }); return this; }

  on(event: string, cb: any): this {
    if (event === 'progress') this.progressCbs.push(cb);
    else if (event === 'complete') this.completeCbs.push(cb);
    else if (event === 'loaderror') this.errorCbs.push(cb);
    return this;
  }

  once(event: string, cb: any): this {
    if (event === 'complete') this.onceCompleteCbs.push(cb);
    else if (event === 'loaderror') this.onceErrorCbs.push(cb);
    else if (event === 'progress') {
      const wrap = (v: number) => { this.off('progress', wrap); cb(v); };
      this.progressCbs.push(wrap);
    }
    return this;
  }

  off(event: string, cb: any): this {
    const drop = (arr: any[]) => { const i = arr.indexOf(cb); if (i >= 0) arr.splice(i, 1); };
    if (event === 'progress') drop(this.progressCbs);
    else if (event === 'complete') { drop(this.completeCbs); drop(this.onceCompleteCbs); }
    else if (event === 'loaderror') { drop(this.errorCbs); drop(this.onceErrorCbs); }
    return this;
  }

  async start(): Promise<void> {
    const imgQueue = this.queue.splice(0, this.queue.length);
    const audQueue = this.audioQueue.splice(0, this.audioQueue.length);
    const onceC = this.onceCompleteCbs.splice(0, this.onceCompleteCbs.length);
    const onceE = this.onceErrorCbs.splice(0, this.onceErrorCbs.length);

    const total = imgQueue.length + audQueue.length;
    if (total === 0) { this.emitProgress(1); this.fireComplete(onceC); return; }
    let done = 0;
    const tick = () => { done++; this.emitProgress(done / total); };
    const imgs = imgQueue.map(({ key, url }) => this.loadImage(key, url).then((ok) => { tick(); return ok ? null : { key, url, type: 'image' }; }));
    const auds = audQueue.map(({ key, url }) =>
      (this._sound ? this._sound.decode(key, Array.isArray(url) ? url[0] : url) : Promise.resolve()).then(() => { tick(); return null; }),
    );
    const results = await Promise.all([...imgs, ...auds]);

    const failed = results.find((r) => r);
    if (failed) this.fireError(failed, onceE);
    this.fireComplete(onceC);
  }

  private loadImage(key: string, url: string): Promise<boolean> {
    if (this._textures.exists(key)) return Promise.resolve(true);
    const pending = this.inflight.get(key);
    if (pending) return pending;
    const p = new Promise<boolean>((resolve) => {
      const maxAttempts = 3;
      let settled = false;
      let attempt = 0;
      let timer: any = null;

      const finish = (ok: boolean) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        this.inflight.delete(key);
        resolve(ok);
      };

      const tryLoad = () => {
        attempt++;
        const myAttempt = attempt;
        const img = new Image();
        clearTimeout(timer);
        timer = setTimeout(() => {
          if (settled || myAttempt !== attempt) return;
          if (attempt < maxAttempts) tryLoad();
          else finish(false);
        }, 15000);
        img.crossOrigin = 'anonymous';
        img.onload = () => { let ok = true; try { this._textures.addImage(key, img); } catch (e) { ok = false; } finish(ok); };
        img.onerror = () => {
          if (settled || myAttempt !== attempt) return;
          console.warn('[pixi-loader] failed to load', key, url, 'attempt', myAttempt);
          if (attempt < maxAttempts) setTimeout(() => { if (!settled && myAttempt === attempt) tryLoad(); }, 500 * myAttempt);
          else finish(false);
        };
        const base = withAssetVersion(url);
        img.src = myAttempt > 1 ? base + (base.indexOf('?') === -1 ? '?' : '&') + 'r=' + myAttempt : base;
      };
      tryLoad();
    });
    this.inflight.set(key, p);
    return p;
  }

  private emitProgress(v: number): void { for (const cb of this.progressCbs.slice()) { try { cb(v); } catch (e) {} } }

  private fireError(file: any, onceE: ErrorCb[]): void {
    for (const cb of this.errorCbs.slice().concat(onceE)) { try { cb(file); } catch (e) {} }
  }

  private fireComplete(onceC: CompleteCb[]): void {
    for (const cb of this.completeCbs.slice().concat(onceC)) { try { cb(); } catch (e) {} }
  }
}
