import { BiomeTypes, FlagTypes, ShapeTypes } from '../Types';

type Surface = 'grass' | 'sand' | 'dirt' | 'snow' | 'stone' | 'water' | 'coast';
type Style = 'print' | 'puff' | 'splash';

interface SurfaceCfg {
  sound: FlagTypes;
  style: Style;
  tint: number;
  alpha: number;
  fade: number;
  sizeMul: number;
  light: boolean;
}

const surfaces: Record<Surface, SurfaceCfg> = {
  sand:  { sound: FlagTypes.FootstepGrass, style: 'print',  tint: 0x6e5a36, alpha: 0.42, fade: 6000, sizeMul: 0.44, light: false },
  coast: { sound: FlagTypes.FootstepGrass, style: 'print',  tint: 0x5a4a2c, alpha: 0.40, fade: 2000, sizeMul: 0.44, light: false },
  dirt:  { sound: FlagTypes.FootstepGrass, style: 'print',  tint: 0x46321f, alpha: 0.46, fade: 5000, sizeMul: 0.44, light: false },
  snow:  { sound: FlagTypes.FootstepSnow,  style: 'print',  tint: 0x9fb2c9, alpha: 0.50, fade: 6500, sizeMul: 0.48, light: false },
  grass: { sound: FlagTypes.FootstepGrass, style: 'puff',   tint: 0xb8a878, alpha: 0.34, fade: 1300, sizeMul: 0.66, light: false },
  stone: { sound: FlagTypes.FootstepStone, style: 'puff',   tint: 0xb0b0b0, alpha: 0.32, fade: 1300, sizeMul: 0.64, light: false },
  water: { sound: FlagTypes.FootstepWater, style: 'splash', tint: 0xdaf0ff, alpha: 0.55, fade: 750,  sizeMul: 0.78, light: true },
};

function biomeSurface(t: number | undefined): Surface {
  switch (t) {
    case BiomeTypes.Ice: return 'snow';
    case BiomeTypes.Rocks:
    case BiomeTypes.Fire: return 'stone';
    case BiomeTypes.Desert:
    case BiomeTypes.Oasis: return 'sand';
    case BiomeTypes.Dirt: return 'dirt';
    default: return 'grass';
  }
}

function pointInShape(shape: any, wx: number, wy: number): boolean {
  if (!shape) return false;
  if (shape.type === ShapeTypes.Circle) {
    const dx = wx - shape.x, dy = wy - shape.y;
    return dx * dx + dy * dy <= shape.radius * shape.radius;
  }
  if (shape.type === ShapeTypes.Polygon) {
    if (shape.polygonBounds && !Phaser.Geom.Rectangle.Contains(shape.polygonBounds, wx, wy)) return false;
    const pts = shape.points, ox = shape.x, oy = shape.y;
    let inside = false;
    for (let j = 0, k = pts.length - 1; j < pts.length; k = j++) {
      const xi = ox + pts[j].x, yi = oy + pts[j].y;
      const xk = ox + pts[k].x, yk = oy + pts[k].y;
      if ((yi > wy) !== (yk > wy) && wx < (xk - xi) * (wy - yi) / (yk - yi) + xi) inside = !inside;
    }
    return inside;
  }
  return false;
}

const coastDist = 340;
const coastDistSq = coastDist * coastDist;

function nearLand(biomes: any[], wx: number, wy: number): boolean {
  for (let i = 0; i < biomes.length; i++) {
    const b = biomes[i];
    const t = b.type;
    if (t === BiomeTypes.River || t === BiomeTypes.Safezone || t === BiomeTypes.TutorialZone) continue;
    const shape = b.shape;
    if (!shape) continue;
    if (shape.type === ShapeTypes.Circle) {
      const dx = wx - shape.x, dy = wy - shape.y;
      if (Math.sqrt(dx * dx + dy * dy) - shape.radius < coastDist) return true;
    } else if (shape.type === ShapeTypes.Polygon) {
      if (shape.polygonBounds) {
        const bb = shape.polygonBounds;
        const bdx = wx < bb.x ? bb.x - wx : wx > bb.right ? wx - bb.right : 0;
        const bdy = wy < bb.y ? bb.y - wy : wy > bb.bottom ? wy - bb.bottom : 0;
        if (bdx * bdx + bdy * bdy > coastDistSq) continue;
      }
      const pts = shape.points, ox = shape.x, oy = shape.y;
      for (let j = 0; j < pts.length; j++) {
        const k = (j + 1) % pts.length;
        const ax = ox + pts[j].x, ay = oy + pts[j].y;
        const bx = ox + pts[k].x, by = oy + pts[k].y;
        const edx = bx - ax, edy = by - ay;
        const lenSq = edx * edx + edy * edy;
        const tt = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((wx - ax) * edx + (wy - ay) * edy) / lenSq));
        const px = ax + tt * edx, py = ay + tt * edy;
        const ddx = wx - px, ddy = wy - py;
        if (ddx * ddx + ddy * ddy < coastDistSq) return true;
      }
    }
  }
  return false;
}

function surfaceAt(biomes: any[], wx: number, wy: number): Surface {
  for (let i = 0; i < biomes.length; i++) {
    const b = biomes[i];
    if (b.type === BiomeTypes.River) continue;
    if (pointInShape(b.shape, wx, wy)) return biomeSurface(b.type);
  }
  return nearLand(biomes, wx, wy) ? 'coast' : 'water';
}

function ensureTextures(scene: Phaser.Scene) {
  if (!scene.textures.exists('fpStep')) {
    const s = 64;
    const c = document.createElement('canvas'); c.width = s; c.height = s;
    const ctx = c.getContext('2d')!;
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.55, 'rgba(255,255,255,0.85)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(s / 2, s / 2, s / 2, 0, Math.PI * 2); ctx.fill();
    scene.textures.addCanvas('fpStep', c);
  }
  if (!scene.textures.exists('fpSplash')) {
    const s = 64;
    const c = document.createElement('canvas'); c.width = s; c.height = s;
    const ctx = c.getContext('2d')!;
    ctx.strokeStyle = 'rgba(255,255,255,1)';
    ctx.lineWidth = s * 0.085;
    ctx.beginPath(); ctx.arc(s / 2, s / 2, s * 0.4, 0, Math.PI * 2); ctx.stroke();
    scene.textures.addCanvas('fpSplash', c);
  }
}

const pool: Phaser.GameObjects.Image[] = [];

function getImg(scene: Phaser.Scene, key: string): Phaser.GameObjects.Image {
  let img = pool.pop();
  while (img && (img as any).scene !== scene) img = pool.pop();
  if (!img) img = scene.add.image(0, 0, key);
  else { img.setTexture(key); img.setActive(true).setVisible(true); }
  img.setDepth(0);
  return img;
}

const maxPool = 200;
function releaseImg(img: Phaser.GameObjects.Image) {
  if (pool.length >= maxPool) { img.destroy(); return; }
  img.setVisible(false).setActive(false);
  pool.push(img);
}

export class FootstepTrail {
  private scene: Phaser.Scene;
  private lastX = 0;
  private lastY = 0;
  private primed = false;
  private accum = 0;
  private side = 1;
  private soundCd = 0;

  constructor(private player: any) {
    this.scene = player.game;
    ensureTextures(this.scene);
  }

  update(dt: number) {
    if (this.soundCd > 0) this.soundCd -= dt;

    const c = this.player.container;
    if (!c) return;
    const x = c.x, y = c.y;
    if (!this.primed) { this.lastX = x; this.lastY = y; this.primed = true; return; }

    if (this.player.invisible && !this.player.isMe) {
      this.lastX = x;
      this.lastY = y;
      this.accum = 0;
      return;
    }

    const dx = x - this.lastX, dy = y - this.lastY;
    this.lastX = x; this.lastY = y;
    const dist = Math.hypot(dx, dy);

    const r = this.player.shape?.radius || 50;
    if (dist < 0.08 || dist > r * 4) { return; }

    const stride = Math.min(260, Math.max(70, r * 1.7));
    this.accum += dist;
    if (this.accum < stride) return;
    this.accum = 0;
    this.side = -this.side;

    const v = this.scene.cameras.main.worldView;
    const m = 120;
    if (x < v.x - m || x > v.right + m || y < v.y - m || y > v.bottom + m) return;

    const surface = surfaceAt(this.player.game.gameState.gameMap.biomes, x, y);
    const cfg = surfaces[surface];
    this.emit(cfg, x, y, Math.atan2(dy, dx), r);

    if (this.player.isMe && this.soundCd <= 0) {
      this.player.game.soundManager.play(cfg.sound);
      this.soundCd = 250;
    }
  }

  private emit(cfg: SurfaceCfg, x: number, y: number, ang: number, r: number) {
    const key = cfg.style === 'splash' ? 'fpSplash' : 'fpStep';
    const img = getImg(this.scene, key);
    img.setTint(cfg.tint);
    img.setAlpha(cfg.alpha);
    img.setBlendMode(cfg.light ? Phaser.BlendModes.SCREEN : Phaser.BlendModes.NORMAL);

    let endSX: number, endSY: number;
    if (cfg.style === 'print') {
      const perp = ang + Math.PI / 2;
      const off = r * 0.3 * this.side;
      img.setPosition(x + Math.cos(perp) * off, y + Math.sin(perp) * off);
      img.setRotation(ang);
      const len = (r * cfg.sizeMul) / 64;
      const wid = (r * cfg.sizeMul * 0.5) / 64;
      img.setScale(len, wid);
      endSX = len; endSY = wid;
    } else if (cfg.style === 'puff') {
      img.setPosition(x, y + r * 0.08);
      img.setRotation(Math.random() * Math.PI);
      const s = (r * cfg.sizeMul) / 64;
      img.setScale(s);
      endSX = s * 1.5; endSY = s * 1.5;
    } else {
      img.setPosition(x, y);
      img.setRotation(0);
      const s = (r * cfg.sizeMul) / 64;
      img.setScale(s * 0.5);
      endSX = s * 1.7; endSY = s * 1.7;
    }

    this.scene.tweens.add({
      targets: img,
      alpha: 0,
      scaleX: endSX,
      scaleY: endSY,
      duration: cfg.fade,
      ease: 'Quad.easeOut',
      onComplete: () => releaseImg(img),
    });
  }
}
