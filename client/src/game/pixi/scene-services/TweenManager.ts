import { GetEaseFunction } from '../phaserlite';

const reservedKeys = [
  'targets', 'duration', 'ease', 'easeParams', 'delay', 'yoyo', 'repeat', 'repeatDelay', 'hold',
  'completeDelay', 'loop', 'loopDelay', 'paused', 'onStart', 'onStartScope', 'onUpdate', 'onUpdateScope',
  'onComplete', 'onCompleteScope', 'onYoyo', 'onRepeat', 'onLoop', 'callbackScope', 'flipX', 'flipY',
  'props', 'from', 'to', 'offset', 'value',
];
const reserved: Record<string, boolean> = {};
reservedKeys.forEach((k) => { reserved[k] = true; });

function resolveEase(ease: any): (v: number) => number {
  if (typeof ease === 'function') return ease;
  try { return GetEaseFunction(ease || 'Linear'); } catch (e) { return (v: number) => v; }
}

export class Tween {
  targets: any[];
  duration: number;
  ease: (v: number) => number;
  delay: number;
  yoyo: boolean;
  repeat: number;
  repeatDelay: number;
  completeDelay: number;
  onStart: any; onUpdate: any; onComplete: any; onYoyo: any; onRepeat: any;
  callbackScope: any;
  paused = false;

  private _config: any;
  private _counter: any;
  private keys: string[];
  private starts: any[] = [];
  private ends: any[] = [];
  private elapsed = 0;
  private delayLeft: number;
  private repeatsLeft: number;
  private reversed = false;
  private started = false;
  private completed = false;
  private active = true;
  private completeDelayLeft = 0;
  removed = false;

  constructor(config: any, counter?: any) {
    this._config = config;
    this._counter = counter || null;
    this.targets = Array.isArray(config.targets) ? config.targets.filter(Boolean) : (config.targets ? [config.targets] : []);
    this.duration = Math.max(config.duration != null ? config.duration : 1000, 0.0001);
    this.ease = resolveEase(config.ease);
    this.delay = config.delay || 0;
    this.yoyo = !!config.yoyo;
    this.repeat = config.repeat === -1 ? Infinity : (config.repeat || 0);
    this.repeatDelay = config.repeatDelay || 0;
    this.completeDelay = config.completeDelay || 0;
    this.onStart = config.onStart; this.onUpdate = config.onUpdate; this.onComplete = config.onComplete;
    this.onYoyo = config.onYoyo; this.onRepeat = config.onRepeat;
    this.callbackScope = config.callbackScope;
    this.paused = !!config.paused;
    this.keys = Object.keys(config).filter((k) => !reserved[k]);
    this.delayLeft = this.delay;
    this.repeatsLeft = this.repeat;
    this.completeDelayLeft = this.completeDelay;
  }

  private capture(): void {
    this.starts = []; this.ends = [];
    for (const t of this.targets) {
      const s: any = {}; const e: any = {};
      for (const k of this.keys) {
        const spec = this._config[k];
        let from: number; let to: number;
        if (spec && typeof spec === 'object') {
          from = ('from' in spec) ? spec.from : (t[k] != null ? t[k] : 0);
          to = ('to' in spec) ? spec.to : ('value' in spec ? spec.value : (t[k] != null ? t[k] : 0));
        } else {
          from = (t[k] != null ? t[k] : 0);
          to = spec;
        }
        s[k] = from; e[k] = to;
      }
      this.starts.push(s); this.ends.push(e);
    }
  }

  private apply(eased: number): void {
    for (let i = 0; i < this.targets.length; i++) {
      const t = this.targets[i], s = this.starts[i], e = this.ends[i];
      for (const k of this.keys) t[k] = s[k] + (e[k] - s[k]) * eased;
    }
  }

  update(dt: number): boolean {
    if (this.removed) return false;
    if (this.paused) return true;

    if (this.delayLeft > 0) {
      this.delayLeft -= dt;
      if (this.delayLeft > 0) return true;
      dt = -this.delayLeft; this.delayLeft = 0;
    }
    if (!this.started) {
      this.started = true;
      this.capture();
      if (this.onStart) { try { this.onStart.call(this.callbackScope, this, this.targets[0]); } catch (e) { } }
    }

    this.elapsed += dt;
    let p = this.elapsed / this.duration;
    if (p > 1) p = 1;
    const eased = this.ease(this.reversed ? 1 - p : p);
    this.apply(eased);
    if (this.onUpdate) { try { this.onUpdate.call(this.callbackScope, this, this.targets[0]); } catch (e) { } }

    if (p >= 1) {
      if (this.yoyo && !this.reversed) {
        this.reversed = true; this.elapsed = 0;
        if (this.onYoyo) { try { this.onYoyo.call(this.callbackScope, this); } catch (e) { } }
        return true;
      }
      if (this.repeatsLeft > 0) {
        this.repeatsLeft = this.repeatsLeft === Infinity ? Infinity : this.repeatsLeft - 1;
        this.reversed = false; this.elapsed = 0; this.delayLeft = this.repeatDelay;
        if (this.onRepeat) { try { this.onRepeat.call(this.callbackScope, this); } catch (e) { } }
        return true;
      }
      if (this.completeDelayLeft > 0) {
        this.completeDelayLeft -= dt;
        if (this.completeDelayLeft > 0) return true;
      }
      if (!this.completed) {
        this.completed = true; this.active = false;
        if (this.onComplete) { try { this.onComplete.call(this.callbackScope, this, this.targets[0]); } catch (e) { } }
      }
      return false;
    }
    return true;
  }

  getValue(): number {
    if (this._counter) return this._counter.value;
    const t = this.targets[0], k = this.keys[0];
    return (t && k != null) ? t[k] : 0;
  }
  isActive(): boolean { return this.active && !this.removed && this.started && !this.completed; }
  isPlaying(): boolean { return this.isActive() && !this.paused; }
  pause(): this { this.paused = true; return this; }
  resume(): this { this.paused = false; return this; }
  play(): this { this.paused = false; return this; }
  restart(): this { this.elapsed = 0; this.delayLeft = this.delay; this.started = false; this.completed = false; this.reversed = false; this.active = true; this.removed = false; this.repeatsLeft = this.repeat; this.completeDelayLeft = this.completeDelay; return this; }
  stop(): this { this.removed = true; this.active = false; return this; }
  remove(): this { this.removed = true; this.active = false; return this; }
  destroy(): void { this.removed = true; this.active = false; }
  hasTarget(t: any): boolean { return this.targets.indexOf(t) !== -1; }
}

export class TweenManager {
  private tweens: Tween[] = [];

  add(config: any): Tween {
    const t = new Tween(config);
    this.tweens.push(t);
    return t;
  }

  addCounter(config: any): Tween {
    const counter = { value: config.from != null ? config.from : 0 };
    const cfg = { ...config, targets: counter, value: { from: config.from != null ? config.from : 0, to: config.to != null ? config.to : 1 } };
    const t = new Tween(cfg, counter);
    this.tweens.push(t);
    return t;
  }

  killTweensOf(target: any): void { for (const t of this.tweens) if (t.hasTarget(target)) t.stop(); }
  killAll(): void { for (const t of this.tweens) t.stop(); this.tweens.length = 0; }
  count(): number { return this.tweens.length; }

  update(_time: number, delta: number): void {
    const list = this.tweens;
    for (let i = list.length - 1; i >= 0; i--) {
      const t = list[i];
      let keep: boolean;
      try { keep = t.update(delta); } catch (e) { keep = false; }
      if (!keep || t.removed) list.splice(i, 1);
    }
  }
}
