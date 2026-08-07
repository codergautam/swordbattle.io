export class SoundSystem {
  private _ctx: AudioContext | null = null;
  private _master: GainNode | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private resume: () => void;
  mute = false;
  volume = 1;

  constructor() {
    this.resume = () => {
      const ctx = this.ensureCtx();
      if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    };
    try {
      window.addEventListener('pointerdown', this.resume);
      window.addEventListener('keydown', this.resume);
      window.addEventListener('touchstart', this.resume);
    } catch (e) { /* noop */ }
  }

  destroy(): void {
    try {
      window.removeEventListener('pointerdown', this.resume);
      window.removeEventListener('keydown', this.resume);
      window.removeEventListener('touchstart', this.resume);
    } catch (e) { /* noop */ }
    try { if (this._ctx) this._ctx.close(); } catch (e) { /* noop */ }
    this._ctx = null;
    this._master = null;
    this.buffers.clear();
    this.urlDecodes.clear();
  }

  private ensureCtx(): AudioContext | null {
    if (!this._ctx) {
      try {
        const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!AC) return null;
        const ctx: AudioContext = new AC();
        const master = ctx.createGain();
        master.gain.value = this.mute ? 0 : this.volume;
        master.connect(ctx.destination);
        this._ctx = ctx;
        this._master = master;
      } catch (e) { return null; }
    }
    return this._ctx;
  }

  private urlDecodes = new Map<string, Promise<AudioBuffer | null>>();

  async decode(key: string, url: string): Promise<void> {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const c: AudioContext = ctx;
    let pending = this.urlDecodes.get(url);
    if (!pending) {
      pending = (async () => {
        try {
          const resp = await fetch(url);
          const arr = await resp.arrayBuffer();
          const buf: AudioBuffer = await new Promise((resolve, reject) => {
            const p = c.decodeAudioData(arr, resolve, reject);
            if (p && (p as any).then) (p as Promise<AudioBuffer>).then(resolve, reject);
          });
          return buf;
        } catch (e) { return null; }
      })();
      this.urlDecodes.set(url, pending);
    }
    const buf = await pending;
    if (buf) this.buffers.set(key, buf);
  }

  add(key: string, config?: any): any {
    let vol = config && config.volume != null ? config.volume : 1;
    let muted = false;
    const sys = this;
    return {
      play(playConfig?: any): boolean {
        const ctx = sys.ensureCtx();
        if (!ctx || !sys._master) return false;
        if (ctx.state === 'suspended') ctx.resume().catch(() => {});
        const buf = sys.buffers.get(key);
        if (!buf) return false;
        try {
          const src = ctx.createBufferSource();
          src.buffer = buf;
          const g = ctx.createGain();
          const base = (playConfig && playConfig.volume != null) ? playConfig.volume : vol;
          g.gain.value = muted ? 0 : base;
          if (playConfig && playConfig.rate) src.playbackRate.value = playConfig.rate;
          if (playConfig && playConfig.detune) { try { (src as any).detune.value = playConfig.detune; } catch (e) { /* noop */ } }
          if (playConfig && playConfig.loop) src.loop = true;
          src.connect(g); g.connect(sys._master);
          src.onended = () => { try { src.disconnect(); g.disconnect(); } catch (e) { /* noop */ } };
          src.start(0);
        } catch (e) { return false; }
        return true;
      },
      stop() {}, pause() {}, resume() {},
      setVolume(v: number) { if (typeof v === 'number') vol = v; return this; },
      setRate() { return this; }, setSeek() { return this; },
      setDetune() { return this; }, setLoop() { return this; },
      setMute(m: boolean) { muted = !!m; return this; },
      destroy() {}, on() { return this; }, once() { return this; }, off() { return this; },
      isPlaying: false, isPaused: false, duration: 0, get volume() { return vol; },
    };
  }

  play(key: string, config?: any): boolean { return this.add(key, config).play(config); }
  stopAll(): void {}
  removeAll(): void {}
  pauseAll(): void {}
  resumeAll(): void {}
  setVolume(v: number): this { this.volume = v; if (this._master && !this.mute) this._master.gain.value = v; return this; }
  setMute(m: boolean): this { this.mute = m; if (this._master) this._master.gain.value = m ? 0 : this.volume; return this; }
}
