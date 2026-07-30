import { BaseEntity } from '../BaseEntity';
import { Health } from '../../components/Health';
import { BiomeTypes } from '../../Types';

const oreSkinSuffix: Record<number, string> = {
  0: '',
  1: '-lava',
  2: '-desert',
  3: '-dirt',
  4: '-snow',
};

class Ore extends BaseEntity {
  static stateFields = [...BaseEntity.stateFields, 'size', 'rarity', 'skin', 'angle'];
  static removeTransition = 250;
  static focusShowMs = 2500;
  static focusRingGap = 18;

  body: Phaser.GameObjects.Sprite | null = null;
  shadow: Phaser.GameObjects.Sprite | null = null;
  private hitTween: Phaser.Tweens.Tween | null = null;
  private lastHealth: number | undefined = undefined;
  private focusG: Phaser.GameObjects.Graphics | null = null;
  private lastFocusT: number | undefined = undefined;
  private focusPulse = 0;
  private focusDrawnT: number | undefined = undefined;
  private focusDrawnX: number | undefined = undefined;
  private lastHitT = 0;

  private orePoints(): [number, number][] {
    const s = (this.size as number) || 0;
    const scale = 1.175, ox = -0.12, oy = 0.13;
    const base: [number, number][] = [
      [0, 0],
      [0.2697841726618705, -0.4712230215827338],
      [0.7751798561151079, -0.46402877697841727],
      [0.9712230215827338, -0.2823741007194245],
      [1, -0.09352517985611511],
      [0.8741007194244604, 0.05935251798561151],
      [0.10431654676258993, 0.11151079136690648],
    ];
    return base.map(([x, y]) => [(x * scale + ox) * s, (y * scale + oy) * s]);
  }

  private perimeterPoint(t: number): [number, number] {
    const pts = this.orePoints();
    const segs: number[] = [];
    let total = 0;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      segs.push(len);
      total += len;
    }
    let d = (((t % 1) + 1) % 1) * total;
    for (let i = 0; i < pts.length; i++) {
      if (d <= segs[i] || i === pts.length - 1) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        const f = segs[i] > 0 ? d / segs[i] : 0;
        return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
      }
      d -= segs[i];
    }
    return [pts[0][0], pts[0][1]];
  }

  private pickTexture(): string {
    const tier = ((this.rarity as number) || 0) + 1;
    const skinIdx = (this.skin as number) || 0;
    const suffix = oreSkinSuffix[skinIdx] || '';
    const variantKey = 'ore' + tier + suffix;
    if (suffix && this.game.textures.exists(variantKey)) return variantKey;
    const baseKey = 'ore' + tier;
    return this.game.textures.exists(baseKey) ? baseKey : 'ore1';
  }

  createSprite() {
    const tier = ((this.rarity as number) || 0) + 1;
    const bodyKey = this.pickTexture();

    if ((this as any).isMinimap) {
      this.body = this.game.add.sprite(0, 0, bodyKey).setOrigin(0.3, 0.6);
      let cx = this.shape.x, cy = this.shape.y;
      const biomes: any[] = this.game.gameState?.gameMap?.biomes || [];
      const rocks = biomes.find((b: any) => b.type === BiomeTypes.Rocks && b.shape);
      const bounds = rocks?.shape?.polygonBounds;
      if (bounds) {
        cx = bounds.x + bounds.width / 2;
        cy = bounds.y + bounds.height / 2;
      } else {
        const pts = this.orePoints();
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const [x, y] of pts) {
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
        }
        cx = this.shape.x + (minX + maxX) / 2;
        cy = this.shape.y + (minY + maxY) / 2;
      }
      this.container = this.game.add.container(cx, cy, [this.body])
        .setScale((this.size as number) * 1.2 / this.body.width);
      return this.container;
    }

    this.body = this.game.add.sprite(0, 0, bodyKey).setOrigin(0.1, 0.6);
    this.shadow = this.createOutlineShadow(bodyKey, 0.1, 0.6);
    this.syncOutlineShadow(this.shadow, this.body);

    const spriteW = this.body.width;
    const spriteH = this.body.height;
    this.healthBar = new Health(this, {
      hideWhenFull: false,
      width: spriteW,
      height: spriteW / 17.6,
      offsetX: spriteW * 0.4,
      offsetY: -spriteH * 0.6 - 60,
      tierLabel: `Tier ${tier} Ore`,
    });

    this.container = this.game.add.container(this.shape.x, this.shape.y, [this.shadow, this.body])
      .setScale((this.size as number) * 1.2 / spriteW);

    this.focusG = this.game.add.graphics();
    this.focusG.setDepth(9998);

    return this.container;
  }

  private drawFocus(dt: number) {
    const g = this.focusG;
    const shape: any = this.shape;
    if (!g || !shape) return;
    const t = this.angle as number | undefined;
    const recentlyHit = (Date.now() - this.lastHitT) < Ore.focusShowMs;
    if (t === undefined || t < 0 || !recentlyHit) { g.clear(); return; }

    if (this.focusPulse > 0) {
      this.focusPulse = Math.max(0, this.focusPulse - dt / 260);
    }

    const [px, py] = this.perimeterPoint(t);
    const x = shape.x + px;
    const y = shape.y + py;
    const base = Math.max(38, (this.size as number) * 0.12);
    const r = base * (1 + this.focusPulse * 0.8);

    g.clear();
    g.fillStyle(0x2ef2ff, 0.95);
    g.fillCircle(x, y, r);
    g.lineStyle(4, 0x00ffff, 0.45 + 0.5 * this.focusPulse);
    g.strokeCircle(x, y, r + Ore.focusRingGap);
  }

  update(dt: number) {
    super.update(dt);

    const visible = !this.container || this.container.visible !== false;
    if (this.focusG && this.focusG.visible !== visible) this.focusG.setVisible(visible);
    if (!visible) return;

    const sx = this.shape?.x;
    const recentlyHit = (Date.now() - this.lastHitT) < Ore.focusShowMs + 200;
    const t = this.angle as number | undefined;
    if (recentlyHit || this.focusPulse > 0 || t !== this.focusDrawnT || sx !== this.focusDrawnX) {
      this.drawFocus(dt);
      this.focusDrawnT = t; this.focusDrawnX = sx;
    }
  }

  updateRotation() {
  }

  afterStateUpdate(data: any) {
    if (data.healthPercent !== undefined) {
      if (this.lastHealth !== undefined && data.healthPercent < this.lastHealth - 0.0001) {
        this.playHitAnim();
        this.lastHitT = Date.now();
      }
      this.lastHealth = data.healthPercent;
    }
    if (data.angle !== undefined && data.angle >= 0) {
      if (this.lastFocusT !== undefined && Math.abs(data.angle - this.lastFocusT) > 0.0001) {
        this.focusPulse = 1;
      }
      this.lastFocusT = data.angle;
    }
  }

  private playHitAnim() {
    if (!this.body) return;
    if (this.hitTween) {
      this.hitTween.stop();
      this.hitTween = null;
    }
    this.body.x = 0;
    this.body.y = 0;
    const baseScale = this.container ? this.container.scale : 1;
    const amp = Math.min(10, 5 + baseScale * 0.5);
    const self = this.game.gameState?.self?.entity as any;
    let angle: number;
    if (self && self.container) {
      angle = Math.atan2(this.container.y - self.container.y, this.container.x - self.container.x);
    } else {
      angle = Math.random() * Math.PI * 2;
    }
    const localAngle = angle - (this.container?.rotation || 0);
    this.hitTween = this.game.tweens.add({
      targets: this.body,
      x: Math.cos(localAngle) * amp,
      y: Math.sin(localAngle) * amp,
      duration: 70,
      yoyo: true,
      ease: 'Sine.easeOut',
      onUpdate: () => this.syncOutlineShadow(this.shadow, this.body),
      onComplete: () => {
        if (this.body) { this.body.x = 0; this.body.y = 0; }
        this.syncOutlineShadow(this.shadow, this.body);
        this.hitTween = null;
      },
    });
  }

  remove() {
    if (this.hitTween) {
      this.hitTween.stop();
      this.hitTween = null;
    }
    if (this.body && this.game.tweens) {
      this.game.tweens.killTweensOf(this.body);
    }
    if (this.focusG) {
      this.focusG.destroy();
      this.focusG = null;
    }
    super.remove();
  }
}

export default Ore;
