import { TextureManager } from './TextureManager';

const assetVer: string = (process.env.REACT_APP_ASSET_VER as string) || '';
function withAssetVersion(url: string): string {
  if (!assetVer || typeof url !== 'string' || url.indexOf('/assets/') === -1 || /[?&]v=/.test(url)) return url;
  return url + (url.indexOf('?') === -1 ? '?' : '&') + 'v=' + assetVer;
}

type ProgressCb = (value: number) => void;
type CompleteCb = () => void;

export class Loader {
  private queue: Array<{ key: string; url: string }> = [];
  private audioQueue: Array<{ key: string; url: string }> = [];
  private progressCbs: ProgressCb[] = [];
  private completeCbs: CompleteCb[] = [];
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
    return this;
  }

  async start(): Promise<void> {
    const total = this.queue.length + this.audioQueue.length;
    if (total === 0) { this.emitProgress(1); this.emitComplete(); return; }
    let done = 0;
    const tick = () => { done++; this.emitProgress(done / total); };
    const imgs = this.queue.map(({ key, url }) => this.loadImage(key, url).then(tick));
    const auds = this.audioQueue.map(({ key, url }) =>
      (this._sound ? this._sound.decode(key, Array.isArray(url) ? url[0] : url) : Promise.resolve()).then(tick),
    );
    await Promise.all([...imgs, ...auds]);
    this.queue.length = 0;
    this.audioQueue.length = 0;
    this.emitComplete();
  }

  private loadImage(key: string, url: string): Promise<void> {
    return new Promise((resolve) => {
      if (this._textures.exists(key)) { resolve(); return; }
      const img = new Image();
      let settled = false;
      const finish = () => { if (settled) return; settled = true; clearTimeout(timer); resolve(); };
      const timer = setTimeout(finish, 12000);
      img.crossOrigin = 'anonymous';
      img.onload = () => { try { this._textures.addImage(key, img); } catch (e) {} finish(); };
      img.onerror = () => { console.warn('[pixi-loader] failed to load', key, url); finish(); };
      img.src = withAssetVersion(url);
    });
  }

  private emitProgress(v: number): void { for (const cb of this.progressCbs) { try { cb(v); } catch (e) {} } }
  private emitComplete(): void { for (const cb of this.completeCbs) { try { cb(); } catch (e) {} } }
}
