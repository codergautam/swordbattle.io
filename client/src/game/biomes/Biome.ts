import { BiomeTypes } from '../Types';
import { Shape, ShapeType } from '../physics/Shape';
import Game from '../scenes/Game';
import River from './River';

export type BiomeType = Biome | River;

const containerPools = new WeakMap<Phaser.Scene, Phaser.GameObjects.TileSprite[]>();
const biomesCount = 20;

export const riverFlowSpeed = 26;
export const riverBottomSpeed = 7;
export const riverShimmerSpeed = 13;

const flowScratch = { x: 0, y: 0 };
const bottomScratch = { x: 0, y: 0 };
const shimmerScratch = { x: 0, y: 0 };
const zeroDrift = { x: 0, y: 0 };

export function riverFlowDrift(scene: Game): { x: number, y: number } {
  const t = ((scene.game.loop && scene.game.loop.time) || 0) / 1000;
  const d = t * riverFlowSpeed;
  flowScratch.x = d; flowScratch.y = d;
  return flowScratch;
}
export function riverBottomDrift(scene: Game): { x: number, y: number } {
  const t = ((scene.game.loop && scene.game.loop.time) || 0) / 1000;
  const d = t * riverBottomSpeed;
  bottomScratch.x = d; bottomScratch.y = d;
  return bottomScratch;
}
export function riverShimmerDrift(scene: Game): { x: number, y: number } {
  const t = ((scene.game.loop && scene.game.loop.time) || 0) / 1000;
  const d = t * riverShimmerSpeed;
  shimmerScratch.x = d * 0.7; shimmerScratch.y = -d * 0.5;
  return shimmerScratch;
}

class Biome {
  scene: Game;
  container: Phaser.GameObjects.TileSprite | null = null;
  maskGraphics: Phaser.GameObjects.Graphics | null = null;
  type: BiomeTypes;
  shape: ShapeType;
  viewportSize: { width: number, height: number };
  zIndex = -3;
  tileScale = 2;

  constructor(game: Game, biomeData: any) {
    this.scene = game;
    this.type = biomeData.type;
    this.shape = Shape.create(biomeData.shapeData);
    this.viewportSize = {
      width: this.scene.scale.width,
      height: this.scene.scale.height,
    };
  }

  static simplifyRing(pts: any[], tol: number): any[] {
    const n = pts.length;
    if (n < 4) return pts;
    const keep = new Array(n).fill(false);
    keep[0] = true; keep[n - 1] = true;
    const tol2 = tol * tol;
    const stack: [number, number][] = [[0, n - 1]];
    while (stack.length) {
      const [s, e] = stack.pop()!;
      const ax = pts[s].x, ay = pts[s].y, bx = pts[e].x, by = pts[e].y;
      const dx = bx - ax, dy = by - ay;
      const len2 = dx * dx + dy * dy;
      let maxD = 0, idx = -1;
      for (let i = s + 1; i < e; i++) {
        const px = pts[i].x, py = pts[i].y;
        let d2: number;
        if (len2 === 0) { const ex = px - ax, ey = py - ay; d2 = ex * ex + ey * ey; }
        else {
          let t = ((px - ax) * dx + (py - ay) * dy) / len2;
          t = t < 0 ? 0 : t > 1 ? 1 : t;
          const ex = px - (ax + t * dx), ey = py - (ay + t * dy);
          d2 = ex * ex + ey * ey;
        }
        if (d2 > maxD) { maxD = d2; idx = i; }
      }
      if (maxD > tol2 && idx !== -1) { keep[idx] = true; stack.push([s, idx]); stack.push([idx, e]); }
    }
    const out: any[] = [];
    for (let i = 0; i < n; i++) if (keep[i]) out.push(pts[i]);
    return out;
  }

  static initialize(scene: Phaser.Scene) {
    const containers: Phaser.GameObjects.TileSprite[] = [];
    for (let i = 0; i < biomesCount; i++) {
      containers.push(scene.add.tileSprite(0, 0, 0, 0, '').setVisible(false));
    }
    containerPools.set(scene, containers);
  }

  createSprite() {
    let texture = '';
    switch (this.type) {
      case BiomeTypes.Fire: texture = 'fireTile'; break;
      case BiomeTypes.Earth: texture = 'earthTile'; break;
      case BiomeTypes.Ice: texture = 'iceTile'; break;
      case BiomeTypes.River: texture = 'riverBottom'; break;
      case BiomeTypes.Safezone: texture = 'safezone'; break;
      case BiomeTypes.TutorialZone: texture = 'tutorialTile'; break;
      case BiomeTypes.Meadow: texture = 'meadowTile'; break;
      case BiomeTypes.Savanna: texture = 'savannaTile'; break;
      case BiomeTypes.Alpine: texture = 'alpineTile'; break;
      case BiomeTypes.Dirt: texture = 'dirtTile'; break;
      case BiomeTypes.Rocks: texture = 'rocksNewTile'; break;
      case BiomeTypes.Desert: texture = 'desertTile'; break;
      case BiomeTypes.Oasis: texture = 'oasisTile'; break;
      case BiomeTypes.Tidelands: texture = 'tidelandsTile'; break;
    }

    this.maskGraphics = this.scene.make.graphics();
    this.maskGraphics.fillStyle(0xffffff);
    const pts: any[] = (this.shape as any).points;
    if (pts && pts.length > 10) {
      const sp = Biome.simplifyRing(pts, 8);
      const ox = this.shape.x, oy = this.shape.y;
      const flat: number[] = [];
      for (let i = 0; i < sp.length; i++) flat.push(ox + sp[i].x, oy + sp[i].y);
      let tris: number[] | null = null;
      try { tris = (Phaser.Geom.Polygon as any).Earcut(flat); } catch (e) { tris = null; }
      if (tris && tris.length >= 3) {
        for (let i = 0; i < tris.length; i += 3) {
          const a = tris[i] * 2, b = tris[i + 1] * 2, c = tris[i + 2] * 2;
          this.maskGraphics.fillTriangle(flat[a], flat[a + 1], flat[b], flat[b + 1], flat[c], flat[c + 1]);
        }
      } else {
        this.maskGraphics.beginPath();
        this.maskGraphics.moveTo(flat[0], flat[1]);
        for (let i = 1; i < sp.length; i++) this.maskGraphics.lineTo(flat[i * 2], flat[i * 2 + 1]);
        this.maskGraphics.closePath();
        this.maskGraphics.fillPath();
      }
    } else {
      this.shape.fillShape(this.maskGraphics);
    }
    const mask = new Phaser.Display.Masks.GeometryMask(this.scene, this.maskGraphics);

    const container = containerPools.get(this.scene)?.pop()
      ?? this.scene.add.tileSprite(0, 0, 0, 0, '').setVisible(false);
    (container as any).renderable = true;
    this.container = container
      .setTexture(texture)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(this.zIndex)
      .setMask(mask)
    this.resize();
  }

  resize() {
    if (!this.container) return;
    const camera = this.scene.cameras.main;
    this.container.setSize(camera.width, camera.height);
    this.container.setPosition(camera.width / 2, camera.height / 2);
  }

  update() {
    if (!this.container) return;

    const camera = this.scene.cameras.main;
    const isInViewport = this.shape.isInViewport(camera);
    this.container.setVisible(isInViewport);

    if (isInViewport) {
      const drift = this.tileDrift();
      this.container.setSize(camera.width, camera.height);
      this.container.setPosition(camera.width / 2, camera.height / 2);
      this.container.setDisplaySize(camera.displayWidth, camera.displayHeight);
      this.container.setTileScale(camera.zoom * this.tileScale);
      this.container.setTilePosition(
        (camera.scrollX - camera.displayWidth / 2) / this.tileScale + drift.x,
        (camera.scrollY - camera.displayHeight / 2) / this.tileScale + drift.y);
    }
  }

  protected tileDrift(): { x: number, y: number } {
    return zeroDrift;
  }

  destroy() {
    if (this.container) {
      this.container.clearMask(true);
      this.container.setVisible(false);
      this.container.setTexture('');
      containerPools.get(this.scene)?.push(this.container);
      this.container = null;
    }
    if (this.maskGraphics) {
      this.maskGraphics.destroy();
      this.maskGraphics = null;
    }
  }
}

export default Biome;
