import { Texture } from 'pixi.js';
import { Container, Sprite } from '../display';

const deg2rad = Math.PI / 180;

const pools = new Map<Texture, Sprite[]>();
const poolMax = 300;
function acquire(tex: Texture): Sprite {
  const p = pools.get(tex);
  const s = (p && p.pop()) || new Sprite(tex);
  s.texture = tex; s.visible = true;
  return s;
}
function recycle(tex: Texture, s: Sprite): void {
  s.visible = false;
  if (s.parent) s.parent.removeChild(s);
  let p = pools.get(tex);
  if (!p) { p = []; pools.set(tex, p); }
  if (p.length < poolMax) p.push(s); else s.destroy();
}

function evalOp(spec: any, fb: number): number {
  if (spec == null) return fb;
  if (typeof spec === 'number') return spec;
  if (typeof spec === 'function') return spec();
  if (Array.isArray(spec)) return spec[(Math.random() * spec.length) | 0];
  if (typeof spec === 'object') {
    if (typeof spec.onEmit === 'function') return spec.onEmit();
    if ('min' in spec && 'max' in spec) return spec.min + Math.random() * (spec.max - spec.min);
    if ('start' in spec) return spec.start;
  }
  return fb;
}
function endOf(spec: any, start: number): number {
  return (spec && typeof spec === 'object' && 'end' in spec) ? spec.end : start;
}

interface Rec { s: Sprite; life: number; lifeCur: number; vx: number; vy: number; sx0: number; sx1: number; a0: number; a1: number; }

export class ParticleEmitter extends Container {
  private _tex?: Texture;
  private _cfg: any;
  private blend = -1;
  private _recs: Rec[] = [];
  private emittedTotal = 0;
  private emitting = true;
  private killed = false;
  private _mgr: ParticleManager;

  constructor(scene: any, x: number, y: number, tex: Texture | undefined, cfg: any, mgr: ParticleManager) {
    super(x, y);
    this._scene = scene; this._tex = tex; this._cfg = cfg || {}; this._mgr = mgr;
    this.sortableChildren = false;
  }

  setBlendMode(mode: number): this {
    this.blend = mode;
    for (const r of this._recs) r.s.setBlendMode(mode);
    return this;
  }

  private emitOne(): void {
    const cfg = this._cfg;
    const max = cfg.maxParticles || 0;
    if (max > 0 && this.emittedTotal >= max) return;
    if (!this._tex) { this.emittedTotal++; return; }
    const speed = evalOp(cfg.speed, 0);
    const angDeg = cfg.angle != null ? evalOp(cfg.angle, 0) : Math.random() * 360;
    const rad = angDeg * deg2rad;
    const life = evalOp(cfg.lifespan, 1000);
    const sx0 = evalOp(cfg.scale, 1);
    const sx1 = endOf(cfg.scale, sx0);
    const a0 = evalOp(cfg.alpha, 1);
    const a1 = endOf(cfg.alpha, a0);
    const s = acquire(this._tex);
    s.x = 0; s.y = 0;
    s.setScale(sx0);
    s.alpha = a0;
    s.rotation = cfg.rotate != null ? evalOp(cfg.rotate, 0) * deg2rad : 0;
    s.setTint(cfg.tint != null ? cfg.tint : 0xffffff);
    if (this.blend >= 0) s.setBlendMode(this.blend);
    this.addChild(s);
    this._recs.push({ s, life, lifeCur: life, vx: Math.cos(rad) * speed, vy: Math.sin(rad) * speed, sx0, sx1, a0, a1 });
    this.emittedTotal++;
  }

  preUpdate(delta: number): void {
    if (this.killed) return;
    const step = delta / 1000;
    const recs = this._recs;
    for (let i = recs.length - 1; i >= 0; i--) {
      const r = recs[i];
      r.lifeCur -= delta;
      if (r.lifeCur <= 0) { recycle(this._tex as Texture, r.s); recs[i] = recs[recs.length - 1]; recs.pop(); continue; }
      const t = 1 - r.lifeCur / r.life;
      r.s.x += r.vx * step;
      r.s.y += r.vy * step;
      r.s.setScale(r.sx0 + (r.sx1 - r.sx0) * t);
      r.s.alpha = r.a0 + (r.a1 - r.a0) * t;
    }
    if (this.emitting) {
      const q = this._cfg.quantity || 1;
      const freq = this._cfg.frequency || 0;
      if (freq === 0) { for (let k = 0; k < q; k++) this.emitOne(); }
      if (this._cfg.emitting === false) this.emitting = false;
    }
    if (!this.emitting && recs.length === 0) this.emit('complete', this);
  }

  explode(count?: number, x?: number, y?: number): this {
    if (x != null) this.x = x; if (y != null) this.y = y;
    const n = count != null ? count : (this._cfg.quantity || this._cfg.maxParticles || 1);
    for (let k = 0; k < n; k++) this.emitOne();
    return this;
  }
  emitParticleAt(x?: number, y?: number, count = 1): this {
    if (x != null) this.x = x; if (y != null) this.y = y;
    for (let k = 0; k < count; k++) this.emitOne();
    return this;
  }
  emitParticle(count = 1, x?: number, y?: number): this { return this.emitParticleAt(x, y, count); }
  start(): this { this.emitting = true; return this; }
  stop(): this { this.emitting = false; return this; }
  setPosition(x = 0, y = x): this { this.transform.position.set(x, y); return this; }

  destroy(_opts?: any): void {
    if (this.killed) return;
    this.killed = true;
    for (const r of this._recs) recycle(this._tex as Texture, r.s);
    this._recs.length = 0;
    this._mgr.remove(this);
    this._scene = null;
    if (this.parent) this.parent.removeChild(this as any);
    super.destroy();
  }
}

export class ParticleManager {
  private list: ParticleEmitter[] = [];
  add(e: ParticleEmitter): void { this.list.push(e); }
  remove(e: ParticleEmitter): void { const i = this.list.indexOf(e); if (i !== -1) this.list.splice(i, 1); }
  update(_time: number, delta: number): void {
    const l = this.list;
    for (let i = l.length - 1; i >= 0; i--) { try { l[i].preUpdate(delta); } catch (e) {} }
  }
  count(): number { return this.list.length; }
}
