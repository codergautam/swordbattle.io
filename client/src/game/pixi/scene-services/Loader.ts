import { TextureManager } from './TextureManager';
import { withAssetVersion } from '../../../assetVersion';
import { span } from '../../../bootTiming';
import {
  ldBatchStart, ldBatchEnd, ldQueued, ldStarted, ldAttempt, ldAttemptFailed,
  ldOnload, ldUploaded, ldCacheHit, ldDone, ldProgress,
} from '../../../loaderDebug';

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
    const endBatch = span(`loader:batch(${imgQueue.length} img, ${audQueue.length} audio)`);
    for (const { key, url } of imgQueue) ldQueued(key, url, 'image');
    for (const { key, url } of audQueue) ldQueued(key, Array.isArray(url) ? url[0] : url, 'audio');
    let done = 0;
    const tick = () => { done++; ldProgress(() => this.emitProgress(done / total)); };
    const jobs: Array<() => Promise<any>> = [
      ...imgQueue.map(({ key, url }) => async () => {
        const ok = await this.loadImage(key, url);
        tick();
        return ok ? null : { key, url, type: 'image' };
      }),
      ...audQueue.map(({ key, url }) => async () => {
        ldStarted(key);
        try {
          if (this._sound) await this._sound.decode(key, Array.isArray(url) ? url[0] : url);
          ldOnload(key, 1); ldUploaded(key); ldDone(key, true);
          return null;
        } catch (e) {
          ldDone(key, false);
          return { key, url, type: 'audio' };
        } finally {
          tick();
        }
      }),
    ];
    const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
      || (navigator.maxTouchPoints > 1 && /Macintosh|Mac OS/i.test(navigator.userAgent));
    const concurrency = mobile ? 4 : 10;
    ldBatchStart(imgQueue.length, audQueue.length, concurrency);
    const results = new Array(jobs.length);
    let next = 0;
    const worker = async () => {
      while (next < jobs.length) {
        const index = next++;
        results[index] = await jobs[index]();
      }
    };
    await Promise.all(Array.from({ length: Math.min(concurrency, jobs.length) }, worker));

    endBatch();
    ldBatchEnd();
    const failed = results.find((r) => r);
    if (failed) this.fireError(failed, onceE);
    this.fireComplete(onceC);
  }

  private loadImage(key: string, url: string): Promise<boolean> {
    if (this._textures.exists(key)) { ldCacheHit(key); ldDone(key, true); return Promise.resolve(true); }
    const pending = this.inflight.get(key);
    if (pending) return pending;
    ldStarted(key);
    const p = new Promise<boolean>((resolve) => {
      const maxAttempts = 4;
      let settled = false;
      let attempt = 0;
      let timer: any = null;

      const finish = (ok: boolean) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        this.inflight.delete(key);
        ldDone(key, ok);
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
        img.onload = () => {
          // Split network+decode from texture creation: onload means the bytes are
          // decoded, addImage is the main-thread GPU/texture cost.
          ldOnload(key, myAttempt);
          let ok = true;
          try {
            if (/\.svg(?:[?#]|$)/i.test(finalUrl)) {
              // PIXI's direct HTMLImageElement upload can preserve an SVG's
              // alpha while losing its RGB channels on some WebGL paths. A
              // transparent 2D-canvas rasterization gives the GPU ordinary
              // RGBA pixels and keeps the vector asset as the source.
              const width = img.naturalWidth || img.width;
              const height = img.naturalHeight || img.height;
              if (!width || !height) throw new Error(`SVG ${key} has no intrinsic size`);
              const canvas = document.createElement('canvas');
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              if (!ctx) throw new Error(`Could not rasterize SVG ${key}`);
              ctx.clearRect(0, 0, width, height);
              ctx.drawImage(img, 0, 0, width, height);
              this._textures.addCanvas(key, canvas);
            } else {
              this._textures.addImage(key, img);
            }
          } catch (e) {
            console.warn('[pixi-loader] failed to upload', key, e);
            ok = false;
          }
          ldUploaded(key);
          finish(ok);
        };
        img.onerror = () => {
          if (settled || myAttempt !== attempt) return;
          ldAttemptFailed(key, myAttempt);
          if (myAttempt === 1) { tryLoad(); return; }
          console.warn('[pixi-loader] failed to load', key, url, 'attempt', myAttempt);
          if (attempt < maxAttempts) setTimeout(() => { if (!settled && myAttempt === attempt) tryLoad(); }, 500 * myAttempt);
          else finish(false);
        };
        const base = withAssetVersion(url);
        const finalUrl = myAttempt > 2 ? base + (base.indexOf('?') === -1 ? '?' : '&') + 'r=' + myAttempt : base;
        ldAttempt(key, myAttempt, finalUrl);
        img.src = finalUrl;
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
