import { EntityTypes } from '../Types';
import { windRotation } from './Wind';

export interface ShakeConfig {
  particle: string | null;
  count: number;
  size: number;
  spin: number;
  wind: boolean;
}

export const movers = new Set<number>([
  EntityTypes.Player, EntityTypes.Wolf, EntityTypes.Cat, EntityTypes.Bunny,
  EntityTypes.Moose, EntityTypes.Fish, EntityTypes.AngryFish, EntityTypes.IceSpirit,
  EntityTypes.Chimera, EntityTypes.Yeti, EntityTypes.Santa, EntityTypes.Roku,
  EntityTypes.Ancient, EntityTypes.Sphinx,
]);

const mobFactor = 0.2;
const scanMs = 80;
const shakeMs = 520;
const rotAmp = 0.045;
const baseAmp = 12;
const partDepth = 31;

const pool: Phaser.GameObjects.Sprite[] = [];
function getPart(scene: any, key: string): Phaser.GameObjects.Sprite {
  let p = pool.pop();
  while (p && (p as any).scene !== scene) p = pool.pop();
  const sprite: Phaser.GameObjects.Sprite = p || scene.add.sprite(0, 0, key);
  if (p) { sprite.setTexture(key); sprite.setActive(true).setVisible(true); }
  sprite.setDepth(partDepth);
  return sprite;
}
const maxPool = 120;
function releasePart(p: Phaser.GameObjects.Sprite) {
  if (pool.length >= maxPool) { p.destroy(); return; }
  p.setVisible(false).setActive(false);
  pool.push(p);
}

export class TreeShake {
  private scene: any;
  private baseRot = 0;
  private baseShX = 0; private baseShY = 0; private baseShRot = 0;
  private ampMax: number;

  private shT = Infinity;
  private shDX = 0; private shDY = 0;
  private shRot = 0;
  private shAmpScale = 1;

  private inContact = new Set<number>();
  private seen = new Set<number>();
  private scanCd: number;

  constructor(
    private entity: any,
    private body: Phaser.GameObjects.Sprite,
    private shadow: Phaser.GameObjects.Sprite | null,
    private cfg: ShakeConfig,
  ) {
    this.scene = entity.game;
    this.baseRot = body.rotation;
    this.baseShRot = body.rotation;
    if (shadow) { this.baseShX = shadow.x; this.baseShY = shadow.y; this.baseShRot = shadow.rotation; }
    this.ampMax = baseAmp;
    this.scanCd = Math.random() * scanMs;
  }

  update(dt: number) {
    this.scanCd -= dt;
    if (this.scanCd <= 0) { this.scanCd += scanMs; this.scan(); }

    const shaking = this.shT !== Infinity;
    if (!this.cfg.wind && !shaking) return;

    let posX = 0, posY = 0, shakeRot = 0;
    if (shaking) {
      this.shT += dt;
      const t = Math.min(1, this.shT / shakeMs);
      const env = (Math.sin(t * Math.PI * 5) * 0.7 + Math.sin(t * Math.PI * 11) * 0.3) * (1 - t) * (1 - t);
      const o = this.ampMax * this.shAmpScale * env;
      posX = this.shDX * o;
      posY = this.shDY * o;
      shakeRot = this.shRot * env;
      if (t >= 1) this.shT = Infinity;
    }

    const windRot = this.cfg.wind ? windRotation(this.entity.shape?.x || 0) : 0;
    const rot = windRot + shakeRot;
    this.body.setPosition(posX, posY);
    this.body.setRotation(this.baseRot + rot);
    if (this.shadow) {
      this.shadow.setPosition(this.baseShX + posX, this.baseShY + posY);
      this.shadow.setRotation(this.baseShRot + rot);
    }
  }

  private pos(e: any): { x: number, y: number } | null {
    if (e.container) return { x: e.container.x, y: e.container.y };
    if (e.shape) return { x: e.shape.x, y: e.shape.y };
    return null;
  }

  private scan() {
    const tp = this.pos(this.entity);
    if (!tp) return;
    const v = this.scene.cameras.main.worldView;
    if (tp.x < v.x - 200 || tp.x > v.right + 200 || tp.y < v.y - 200 || tp.y > v.bottom + 200) {
      this.inContact.clear();
      return;
    }

    const treeR = this.entity.shape?.radius || 0;
    const movers = this.scene.gameState.moverList as any[];
    const seen = this.seen;
    seen.clear();
    for (let i = 0; i < movers.length; i++) {
      const e = movers[i];
      if (!e || !e.shape) continue;
      const mp = this.pos(e);
      if (!mp) continue;
      const key = e.id;
      seen.add(key);
      const dx = tp.x - mp.x, dy = tp.y - mp.y;
      const d2 = dx * dx + dy * dy;
      const mr = e.shape.radius || 0;
      const reachIn = treeR * 1.1 + mr;
      const reachOut = treeR * 1.28 + mr;
      const was = this.inContact.has(key);
      if (was) {
        if (d2 > reachOut * reachOut) { this.inContact.delete(key); this.bump(e, tp, mp, false); }
      } else if (d2 < reachIn * reachIn) {
        this.inContact.add(key);
        this.bump(e, tp, mp, true);
      }
    }
    if (this.inContact.size > seen.size) {
      for (const k of this.inContact) if (!seen.has(k)) this.inContact.delete(k);
    }
  }

  private bump(e: any, tp: { x: number, y: number }, mp: { x: number, y: number }, isEnter: boolean) {
    let dx = tp.x - mp.x, dy = tp.y - mp.y;
    const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;

    const treeR = this.entity.shape?.radius || 150;
    const moverR = e.shape?.radius || 60;
    const isPlayer = e.type === EntityTypes.Player;
    const treeWeight = Math.max(0.3, Math.min(1.4, 150 / treeR));
    const moverWeight = Math.max(0.4, Math.min(1.5, moverR / 110));
    const kind = isPlayer ? 1 : mobFactor;
    const w = treeWeight * moverWeight * kind;

    this.shDX = dx; this.shDY = dy;
    this.shAmpScale = w;
    this.shRot = rotAmp * w * (dx >= 0 ? 1 : -1);
    this.shT = 0;
    this.emit(dx, dy, kind, isEnter, tp);

    if (isEnter && this.cfg.wind && e.isMe) {
      this.scene.soundManager?.play('treeShake');
    }
  }

  private emit(nx: number, ny: number, factor: number, isEnter: boolean, tp: { x: number, y: number }) {
    if (!this.cfg.particle) return;
    let n = Math.round(this.cfg.count * factor * (isEnter ? 1 : 0.6));
    if (n < 1) { if (isEnter && factor >= 1) n = 1; else return; }

    const r = this.entity.shape?.radius || 100;
    for (let i = 0; i < n; i++) {
      const p = getPart(this.scene, this.cfg.particle);
      const ang = Math.random() * Math.PI * 2;
      const rad = r * (0.7 + Math.random() * 0.5);
      const sx = tp.x + Math.cos(ang) * rad;
      const sy = tp.y + Math.sin(ang) * rad;
      p.setPosition(sx, sy);
      const target = r * this.cfg.size;
      p.setScale(target / (p.width || target || 1));
      p.setAlpha(0.95);
      p.setAngle(Math.random() * 360);
      p.setBlendMode(Phaser.BlendModes.NORMAL);

      let bx = Math.cos(ang) * 0.7 + nx * 0.4 + (Math.random() - 0.5) * 0.5;
      let by = Math.sin(ang) * 0.7 + ny * 0.4 + (Math.random() - 0.5) * 0.5;
      const bd = Math.hypot(bx, by) || 1;
      const dist = r * (0.25 + Math.random() * 0.45);
      const tx = sx + (bx / bd) * dist;
      const ty = sy + (by / bd) * dist + r * 0.1;
      const spin = (Math.random() < 0.5 ? -1 : 1) * this.cfg.spin * (0.4 + Math.random() * 0.6);
      this.scene.tweens.add({
        targets: p,
        x: tx, y: ty, alpha: 0,
        angle: p.angle + spin,
        scaleX: p.scaleX * 0.85, scaleY: p.scaleY * 0.85,
        duration: 1500 + Math.random() * 1000,
        ease: 'Sine.easeOut',
        onComplete: () => releasePart(p),
      });
    }
  }
}

export const shake: Record<string, ShakeConfig> = {
  leaf:  { particle: 'partTree',  count: 5, size: 0.85, spin: 120, wind: true },
  pine:  { particle: 'partPine',  count: 5, size: 0.72, spin: 120, wind: true },
  palm:  { particle: 'partPalm',  count: 3, size: 1.35, spin: 80,  wind: true },
  sav:   { particle: 'partSav',   count: 3, size: 1.35, spin: 80,  wind: true },
  stick: { particle: 'partDead',  count: 4, size: 0.95, spin: 90,  wind: true },
  snow:  { particle: 'partMound', count: 4, size: 0.78, spin: 70,  wind: false },
  none:  { particle: null,        count: 0, size: 0,    spin: 0,   wind: false },
};
