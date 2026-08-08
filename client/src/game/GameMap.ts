import Game from './scenes/Game';
import Biome, { BiomeType, riverFlowDrift, riverBottomDrift } from './biomes/Biome';
import Safezone from './biomes/Safezone';
import River from './biomes/River';
import { BiomeTypes, ShapeTypes } from './Types';
import { GetEntityClass } from './entities';

class GameMap {
  scene: Game;
  biomes: BiomeType[] = [];
  staticObjects: any[] = [];
  riverBorderSprites: Phaser.GameObjects.Sprite[] = [];
  tideBorders: { sprite: Phaser.GameObjects.Sprite, width: number }[] = [];
  x = 0;
  y = 0;
  width = 0;
  height = 0;
  scale = 1;
  borderGraphics: Phaser.GameObjects.Graphics | null = null;
  riverBackdrop: Phaser.GameObjects.TileSprite | null = null;
  riverBackdropTop: Phaser.GameObjects.TileSprite | null = null;
  riverBackdropShimmer: Phaser.GameObjects.TileSprite | null = null;
  riverBackdropMask: Phaser.GameObjects.Graphics | null = null;
  worldCutout: Phaser.GameObjects.TileSprite | null = null;
  worldCutoutMask: Phaser.GameObjects.Graphics | null = null;
  private lastCamW = -1;
  private lastCamH = -1;
  private camResized = true;
  private coastBuildHandle: any = null;
  private coastBuildIdle = false;
  private coastBuildVersion = 0;

  constructor(scene: Game) {
    this.scene = scene;
  }

  update() {
    const camera = this.scene.cameras.main;
    this.camResized = camera.width !== this.lastCamW || camera.height !== this.lastCamH;
    for (let i = 0; i < this.biomes.length; i++) (this.biomes[i] as any).update();
    this.updateRiverBackdrop();
    this.updateWorldCutout();
    this.updateShoreTide();
    this.lastCamW = camera.width;
    this.lastCamH = camera.height;
  }

  updateRiverBackdrop() {
    const camera = this.scene.cameras.main;
    const tileScale = 2;
    const layer = (sprite: Phaser.GameObjects.TileSprite | null, drift: { x: number, y: number }) => {
      if (!sprite) return;
      if (this.camResized) {
        sprite.setSize(camera.width, camera.height);
        sprite.setPosition(camera.width / 2, camera.height / 2);
      }
      sprite.setDisplaySize(camera.displayWidth, camera.displayHeight);
      sprite.setTileScale(camera.zoom * tileScale);
      sprite.setTilePosition(
        (camera.scrollX - camera.displayWidth / 2) / tileScale + drift.x,
        (camera.scrollY - camera.displayHeight / 2) / tileScale + drift.y,
      );
    };
    layer(this.riverBackdrop, riverBottomDrift(this.scene));
    layer(this.riverBackdropTop, riverFlowDrift(this.scene));
  }

  updateWorldCutout() {
    if (!this.worldCutout) return;
    const camera = this.scene.cameras.main;
    const v = camera.worldView;
    const m = 100;
    const nearEdge = v.x <= this.x + m || v.y <= this.y + m ||
      v.right >= this.x + this.width - m || v.bottom >= this.y + this.height - m;
    if (this.worldCutout.visible !== nearEdge) this.worldCutout.setVisible(nearEdge);
    if (!nearEdge) return;
    const tileScale = 2;
    this.worldCutout.setSize(camera.width, camera.height);
    this.worldCutout.setPosition(camera.width / 2, camera.height / 2);
    this.worldCutout.setDisplaySize(camera.displayWidth, camera.displayHeight);
    this.worldCutout.setTileScale(camera.zoom * tileScale);
    this.worldCutout.setTilePosition(
      (camera.scrollX - camera.displayWidth / 2) / tileScale,
      (camera.scrollY - camera.displayHeight / 2) / tileScale,
    );
  }

  private lastMapSig: string | null = null;

  updateMapData(mapData: any) {
    let sig: string | null = null;
    try { sig = JSON.stringify(mapData); } catch (e) { sig = null; }
    if (sig && sig === this.lastMapSig && this.biomes.length > 0) {
      return;
    }
    this.cancelDeferredWork();
    this.lastMapSig = sig;

    for (const biome of this.biomes) {
      biome.destroy();
    }
    this.biomes = [];

    for (const obj of this.staticObjects) {
      obj.remove();
    }
    this.staticObjects = [];

    for (const sprite of this.riverBorderSprites) {
      sprite.destroy();
    }
    this.riverBorderSprites = [];
    this.tideBorders = [];

    for (const l of [this.riverBackdrop, this.riverBackdropTop, this.riverBackdropShimmer]) {
      if (l) { l.clearMask(true); l.destroy(); }
    }
    this.riverBackdrop = null;
    this.riverBackdropTop = null;
    this.riverBackdropShimmer = null;
    if (this.riverBackdropMask) {
      this.riverBackdropMask.destroy();
      this.riverBackdropMask = null;
    }
    if (this.worldCutout) {
      this.worldCutout.clearMask(true);
      this.worldCutout.destroy();
      this.worldCutout = null;
    }
    if (this.worldCutoutMask) {
      this.worldCutoutMask.destroy();
      this.worldCutoutMask = null;
    }

    this.x = mapData.x;
    this.y = mapData.y;
    this.width = mapData.width;
    this.height = mapData.height;
    this.scale = typeof mapData.scale === 'number' && mapData.scale > 0 ? mapData.scale : 1;
    this.scene.physics.world.setBounds(this.x, this.y, this.width, this.height);
    mapData.biomes.forEach((biomeData: any) => this.addBiome(biomeData));
    if (mapData.staticObjects) {
      mapData.staticObjects.forEach(((objectData: any) => this.addStaticObject(objectData)));
    }
    {
      const live: any = this.scene.gameState.entities;
      for (const obj of this.staticObjects as any[]) {
        if (obj.id !== undefined && live[obj.id] && obj.container) obj.container.visible = false;
      }
    }
    console.log('[map] static decorations on map:', this.staticObjects.length);
    this.sortBiomes();
    this.createRiverBackdrop();
    this.scheduleRiverBorders();
    this.createWorldCutout();
    this.createMapBorder();
    this.scene.hud.minimap.updateMapData();
  }

  cancelDeferredWork() {
    this.coastBuildVersion++;
    if (this.coastBuildHandle === null) return;
    const browser = window as any;
    if (this.coastBuildIdle && typeof browser.cancelIdleCallback === 'function') {
      browser.cancelIdleCallback(this.coastBuildHandle);
    } else {
      clearTimeout(this.coastBuildHandle);
    }
    this.coastBuildHandle = null;
  }

  scheduleRiverBorders() {
    this.cancelDeferredWork();
    const mapSig = this.lastMapSig;
    const buildVersion = this.coastBuildVersion;
    const run = () => {
      this.coastBuildHandle = null;
      if (mapSig !== this.lastMapSig) return;
      void this.createRiverBorders(buildVersion);
    };
    const browser = window as any;
    if (typeof browser.requestIdleCallback === 'function') {
      this.coastBuildIdle = true;
      this.coastBuildHandle = browser.requestIdleCallback(run, { timeout: 1500 });
    } else {
      this.coastBuildIdle = false;
      this.coastBuildHandle = setTimeout(run, 150);
    }
  }

  createWorldCutout() {
    if (!this.scene.textures.exists('rockTile')) return;

    this.worldCutoutMask = this.scene.make.graphics({}, false);
    this.worldCutoutMask.fillStyle(0xffffff);
    this.worldCutoutMask.fillRect(this.x, this.y, this.width, this.height);

    const camera = this.scene.cameras.main;
    this.worldCutout = this.scene.add.tileSprite(
      camera.width / 2, camera.height / 2,
      camera.width, camera.height,
      'rockTile',
    )
      .setScrollFactor(0)
      .setDepth(-2)
      .setTileScale(2);

    const mask = new Phaser.Display.Masks.GeometryMask(this.scene, this.worldCutoutMask);
    mask.invertAlpha = true;
    this.worldCutout.setMask(mask);
    this.updateWorldCutout();
  }

  createRiverBackdrop() {
    if (!this.scene.textures.exists('riverBottom')) return;

    this.riverBackdropMask = this.scene.make.graphics({}, false);
    this.riverBackdropMask.fillStyle(0xffffff);
    this.riverBackdropMask.fillRect(this.x, this.y, this.width, this.height);

    const camera = this.scene.cameras.main;
    const make = (key: string, depth: number, alpha: number, add = false) => {
      const s = this.scene.add.tileSprite(
        camera.width / 2, camera.height / 2, camera.width, camera.height, key,
      ).setScrollFactor(0).setDepth(depth).setTileScale(2).setAlpha(alpha);
      if (add) s.setBlendMode(Phaser.BlendModes.ADD);
      return s;
    };

    this.riverBackdrop = make('riverBottom', -5.6, 1);
    this.riverBackdropTop = make('riverTop', -5.4, 0.62);
    this.updateRiverBackdrop();
  }

  addStaticObject(objectData: any) {
    const EntityClass = GetEntityClass(objectData.type);
    const entity = new EntityClass(this.scene);
    entity.updateState(objectData);
    entity.createSprite();
    entity.setDepth();
    this.staticObjects.push(entity);
    return entity;
  }

  addBiome(biomeData: any) {
    let BiomeClass;
    switch (biomeData.type) {
      case BiomeTypes.Fire: BiomeClass = Biome; break;
      case BiomeTypes.Ice: BiomeClass = Biome; break;
      case BiomeTypes.Earth: BiomeClass = Biome; break;
      case BiomeTypes.River: BiomeClass = River; break;
      case BiomeTypes.Safezone: BiomeClass = Safezone; break;
      case BiomeTypes.TutorialZone: BiomeClass = Safezone; break;
      case BiomeTypes.Meadow: BiomeClass = Biome; break;
      case BiomeTypes.Savanna: BiomeClass = Biome; break;
      case BiomeTypes.Alpine: BiomeClass = Biome; break;
      case BiomeTypes.Dirt: BiomeClass = Biome; break;
      case BiomeTypes.Rocks: BiomeClass = Biome; break;
      case BiomeTypes.Desert: BiomeClass = Biome; break;
      case BiomeTypes.Oasis: BiomeClass = Biome; break;
    }
    if (!BiomeClass) return console.log('Unknown biome type: ', biomeData.type);

    const biome = new BiomeClass(this.scene, biomeData);
    const depth = biomeData.nestingDepth || 0;
    if (depth > 0) biome.zIndex = biome.zIndex + depth * 10;
    biome.createSprite();
    this.biomes.push(biome);
  }

  sortBiomes() {
    this.biomes.sort((a, b) => a.zIndex - b.zIndex);
  }

  getSafezoneCenter(): { x: number, y: number } | null {
    const sz = this.biomes.find(b => b.type === BiomeTypes.Safezone);
    if (!sz || !sz.shape) return null;
    const shape: any = sz.shape;
    if (shape.polygonBounds) {
      const b = shape.polygonBounds;
      return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
    }
    return { x: shape.x, y: shape.y };
  }

  async createRiverBorders(buildVersion = this.coastBuildVersion) {
    const lands = this.biomes.filter(b =>
      b.type !== BiomeTypes.River &&
      b.type !== BiomeTypes.Safezone &&
      b.type !== BiomeTypes.TutorialZone
    );
    if (lands.length === 0) return;
    const rivers = lands;
    const sandLands = rivers;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const river of rivers) {
      const s = river.shape as any;
      if (s.type === ShapeTypes.Circle) {
        minX = Math.min(minX, s.x - s.radius);
        minY = Math.min(minY, s.y - s.radius);
        maxX = Math.max(maxX, s.x + s.radius);
        maxY = Math.max(maxY, s.y + s.radius);
      } else if (s.type === ShapeTypes.Polygon) {
        for (const p of s.points) {
          minX = Math.min(minX, s.x + p.x);
          minY = Math.min(minY, s.y + p.y);
          maxX = Math.max(maxX, s.x + p.x);
          maxY = Math.max(maxY, s.y + p.y);
        }
      }
    }

    const padding = 460;
    minX -= padding; minY -= padding;
    maxX += padding; maxY += padding;
    const worldW = maxX - minX;
    const worldH = maxY - minY;

    const isMobile = this.scene.isMobile;
    const maxCanvasSize = isMobile ? 2048 : 4096;
    const maxCanvasPixels = isMobile ? 3000000 : 8000000;
    let canvasScale = isMobile ? 0.06 : 0.075;
    canvasScale = Math.min(
      canvasScale,
      maxCanvasSize / worldW,
      maxCanvasSize / worldH,
      Math.sqrt(maxCanvasPixels / (worldW * worldH)),
    );
    const canvasW = Math.ceil(worldW * canvasScale);
    const canvasH = Math.ceil(worldH * canvasScale);

    if (canvasW < 1 || canvasH < 1 || canvasW > maxCanvasSize || canvasH > maxCanvasSize) {
      console.warn(`[GameMap] River border canvas too large (${canvasW}x${canvasH}), skipping`);
      return;
    }

    const toX = (wx: number) => (wx - minX) * canvasScale;
    const toY = (wy: number) => (wy - minY) * canvasScale;

    const sandImg = (key: string): HTMLImageElement | HTMLCanvasElement => {
      const k = this.scene.textures.exists(key) ? key : 'sand';
      const img = this.scene.textures.get(k).getSourceImage() as HTMLImageElement | HTMLCanvasElement | null;
      if (img) return img;
      const blank = document.createElement('canvas');
      blank.width = 1;
      blank.height = 1;
      return blank;
    };
    const sandSources: Record<string, HTMLImageElement | HTMLCanvasElement> = {
      sand: sandImg('sand'), sandRock: sandImg('sandRock'),
      sandMud: sandImg('sandMud'), sandAsh: sandImg('sandAsh'),
      rocksNew: sandImg('rocksNew'),
    };
    const sandKeyForBiome = (type: BiomeTypes): string => {
      if (type === BiomeTypes.Rocks || type === BiomeTypes.Alpine) return 'rocksNew';
      if (type === BiomeTypes.Ice) return 'sandRock';
      if (type === BiomeTypes.Dirt) return 'sandMud';
      if (type === BiomeTypes.Fire) return 'sandAsh';
      return 'sand';
    };
    const makePatterns = (ctx: CanvasRenderingContext2D): Record<string, CanvasPattern> => ({
      sand: ctx.createPattern(sandSources.sand, 'repeat')!,
      sandRock: ctx.createPattern(sandSources.sandRock, 'repeat')!,
      sandMud: ctx.createPattern(sandSources.sandMud, 'repeat')!,
      sandAsh: ctx.createPattern(sandSources.sandAsh, 'repeat')!,
      rocksNew: ctx.createPattern(sandSources.rocksNew, 'repeat')!,
    });

    const clipWorld = (ctx: CanvasRenderingContext2D) => {
      ctx.beginPath();
      ctx.rect(toX(this.x), toY(this.y), this.width * canvasScale, this.height * canvasScale);
      ctx.clip();
    };

    {
      const canvas = document.createElement('canvas');
      canvas.width = canvasW; canvas.height = canvasH;
      const ctx = canvas.getContext('2d')!;
      const pats = makePatterns(ctx);
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      const eMid = 250, feather = 215;
      const maxw = 440, minw = 36, steps = isMobile ? 12 : 18;
      const stepsPerFrame = isMobile ? 2 : 3;
      const nextFrame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      ctx.save();
      clipWorld(ctx);
      ctx.globalCompositeOperation = 'source-over';
      for (let i = 0; i < steps; i++) {
        const f = i / (steps - 1);
        const width = maxw + (minw - maxw) * f;
        let a = (eMid + feather - width) / feather;
        a = Math.max(0, Math.min(1, a));
        a = a * a * (3 - 2 * a);
        if (a <= 0.001) continue;
        ctx.globalAlpha = a;
        ctx.lineWidth = width * 2 * canvasScale;
        for (const river of sandLands) {
          ctx.strokeStyle = pats[sandKeyForBiome(river.type)];
          this.strokeRiverOutline(ctx, river.shape as any, toX, toY, canvasScale);
        }
        if ((i + 1) % stepsPerFrame === 0 && i + 1 < steps) {
          await nextFrame();
          if (buildVersion !== this.coastBuildVersion) {
            canvas.width = 1;
            canvas.height = 1;
            return;
          }
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = '#000';
      for (const river of sandLands) this.fillRiverOnCanvas(ctx, river.shape as any, toX, toY, canvasScale);
      ctx.restore();

      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.save();
      clipWorld(ctx);
      const ov = 30;
      const riverSegs: { x: number, y: number, nx: number, ny: number }[][][] = [];
      for (let i = 0; i < sandLands.length; i++) {
        riverSegs.push(this.coastSegments(sandLands[i].shape as any));
        if ((i + 1) % 3 === 0 && i + 1 < sandLands.length) {
          await nextFrame();
          if (buildVersion !== this.coastBuildVersion) {
            canvas.width = 1;
            canvas.height = 1;
            return;
          }
        }
      }
      for (let ri = 0; ri < sandLands.length; ri++) {
        ctx.fillStyle = pats[sandKeyForBiome(sandLands[ri].type)];
        for (const seg of riverSegs[ri]) {
          if (seg.length < 2) continue;
          ctx.beginPath();
          ctx.moveTo(toX(seg[0].x - seg[0].nx * ov), toY(seg[0].y - seg[0].ny * ov));
          for (let i = 1; i < seg.length; i++) ctx.lineTo(toX(seg[i].x - seg[i].nx * ov), toY(seg[i].y - seg[i].ny * ov));
          for (let i = seg.length - 1; i >= 0; i--) {
            const ins = this.coastInset(seg[i].x, seg[i].y);
            ctx.lineTo(toX(seg[i].x + seg[i].nx * ins), toY(seg[i].y + seg[i].ny * ins));
          }
          ctx.closePath();
          ctx.fill();
        }
      }
      ctx.restore();

      if (buildVersion !== this.coastBuildVersion) {
        canvas.width = 1;
        canvas.height = 1;
        return;
      }

      const key = 'riverShoreBlobs';
      if (this.scene.textures.exists(key)) this.scene.textures.remove(key);
      this.scene.textures.addCanvas(key, canvas);
      const sprite = this.scene.add.sprite(minX + worldW / 2, minY + worldH / 2, key);
      sprite.setDisplaySize(worldW, worldH);
      sprite.setDepth(-1.5);
      this.riverBorderSprites.push(sprite);
      setTimeout(() => {
        try {
          const r: any = (this.scene.game as any).app?.renderer;
          if (r && r.gl && this.scene.textures.exists(key)) {
            canvas.width = 1;
            canvas.height = 1;
          }
        } catch (e) {}
      }, 8000);
    }
  }

  updateShoreTide() {
    if (this.tideBorders.length === 0) return;
    const t = ((this.scene.game.loop && this.scene.game.loop.time) || 0) / 1000;
    const tidePeriod = 9;
    const w = (2 * Math.PI) / tidePeriod;
    const eMid = 250, eAmp = 60, feather = 215;
    const edge = eMid + eAmp * Math.sin(t * w);
    for (const b of this.tideBorders) {
      let a = (edge + feather - b.width) / feather;
      a = Math.max(0, Math.min(1, a));
      a = a * a * (3 - 2 * a);
      b.sprite.setAlpha(a);
    }
  }

  private pointInPolygon(shape: any, wx: number, wy: number): boolean {
    const pts = shape.points, ox = shape.x, oy = shape.y;
    let inside = false;
    for (let j = 0, k = pts.length - 1; j < pts.length; k = j++) {
      const xi = ox + pts[j].x, yi = oy + pts[j].y;
      const xk = ox + pts[k].x, yk = oy + pts[k].y;
      if ((yi > wy) !== (yk > wy) && wx < (xk - xi) * (wy - yi) / (yk - yi) + xi) inside = !inside;
    }
    return inside;
  }

  private coastInset(wx: number, wy: number): number {
    const base = 12, amp = 60;
    let n = 0.40 * Math.sin(wx * 0.0028 + wy * 0.0010)
          + 0.24 * Math.sin(wy * 0.0064 - wx * 0.0016 + 1.7)
          + 0.18 * Math.sin((wx - wy) * 0.0115 + 3.1)
          + 0.12 * Math.sin((wx + wy) * 0.0190 + 5.0)
          + 0.06 * Math.sin(wx * 0.0240 - wy * 0.0220 + 0.7);
    n = Math.max(0, Math.min(1, (n + 1) / 2));
    return base + amp * n;
  }

  private fillTriangulated(g: Phaser.GameObjects.Graphics, flat: number[]) {
    if (flat.length < 6) return;
    let tris: number[] | null = null;
    try { tris = (Phaser.Geom.Polygon as any).Earcut(flat); } catch (e) { tris = null; }
    if (tris && tris.length >= 3) {
      for (let i = 0; i < tris.length; i += 3) {
        const a = tris[i] * 2, b = tris[i + 1] * 2, c = tris[i + 2] * 2;
        g.fillTriangle(flat[a], flat[a + 1], flat[b], flat[b + 1], flat[c], flat[c + 1]);
      }
    } else {
      g.beginPath();
      g.moveTo(flat[0], flat[1]);
      for (let i = 2; i < flat.length; i += 2) g.lineTo(flat[i], flat[i + 1]);
      g.closePath();
      g.fillPath();
    }
  }

  private coastSegments(shape: any): { x: number, y: number, nx: number, ny: number }[][] {
    const spacing = 24;
    if (shape.type === ShapeTypes.Circle) {
      const r = shape.radius;
      const n = Math.max(24, Math.floor((2 * Math.PI * r) / spacing));
      const seg: { x: number, y: number, nx: number, ny: number }[] = [];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        seg.push({ x: shape.x + Math.cos(a) * r, y: shape.y + Math.sin(a) * r, nx: -Math.cos(a), ny: -Math.sin(a) });
      }
      seg.push({ ...seg[0] });
      return [seg];
    }
    if (shape.type !== ShapeTypes.Polygon) return [];
    const pts = shape.points, np = pts.length;
    const wl = this.x, wr = this.x + this.width, wt = this.y, wb = this.y + this.height, tol = 1;
    const segs: { x: number, y: number, nx: number, ny: number }[][] = [];
    let cur: { x: number, y: number, nx: number, ny: number }[] = [];
    const flush = () => { if (cur.length >= 2) segs.push(cur); cur = []; };
    for (let i = 0; i < np; i++) {
      const a = pts[i], b = pts[(i + 1) % np];
      const ax = shape.x + a.x, ay = shape.y + a.y, bx = shape.x + b.x, by = shape.y + b.y;
      const onBorder =
        (Math.abs(ax - wl) < tol && Math.abs(bx - wl) < tol) ||
        (Math.abs(ax - wr) < tol && Math.abs(bx - wr) < tol) ||
        (Math.abs(ay - wt) < tol && Math.abs(by - wt) < tol) ||
        (Math.abs(ay - wb) < tol && Math.abs(by - wb) < tol);
      if (onBorder) { flush(); continue; }
      let nx = -(by - ay), ny = bx - ax;
      const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
      if (!this.pointInPolygon(shape, (ax + bx) / 2 + nx * 6, (ay + by) / 2 + ny * 6)) { nx = -nx; ny = -ny; }
      const len = Math.hypot(bx - ax, by - ay);
      const steps = Math.max(1, Math.floor(len / spacing));
      for (let k = 0; k < steps; k++) {
        const t = k / steps;
        cur.push({ x: ax + (bx - ax) * t, y: ay + (by - ay) * t, nx, ny });
      }
      cur.push({ x: bx, y: by, nx, ny });
    }
    flush();
    return segs;
  }

  private fillRiverOnCanvas(
    ctx: CanvasRenderingContext2D, shape: any,
    toX: (x: number) => number, toY: (y: number) => number, scale: number,
  ) {
    if (shape.type === ShapeTypes.Circle) {
      ctx.beginPath();
      ctx.arc(toX(shape.x), toY(shape.y), shape.radius * scale, 0, Math.PI * 2);
      ctx.fill();
    } else if (shape.type === ShapeTypes.Polygon) {
      ctx.beginPath();
      ctx.moveTo(toX(shape.x + shape.points[0].x), toY(shape.y + shape.points[0].y));
      for (let i = 1; i < shape.points.length; i++) {
        ctx.lineTo(toX(shape.x + shape.points[i].x), toY(shape.y + shape.points[i].y));
      }
      ctx.closePath();
      ctx.fill();
    }
  }

  private strokeRiverOutline(
    ctx: CanvasRenderingContext2D, shape: any,
    toX: (x: number) => number, toY: (y: number) => number, scale: number,
  ) {
    if (shape.type === ShapeTypes.Circle) {
      ctx.beginPath();
      ctx.arc(toX(shape.x), toY(shape.y), shape.radius * scale, 0, Math.PI * 2);
      ctx.stroke();
      return;
    }
    if (shape.type !== ShapeTypes.Polygon) return;

    const points: { x: number; y: number }[] = shape.points;
    const n = points.length;
    const worldLeft = this.x, worldRight = this.x + this.width;
    const worldTop = this.y, worldBottom = this.y + this.height;
    const tolerance = 1;

    const isWorldBorderEdge = (i: number) => {
      const j = (i + 1) % n;
      const ax = shape.x + points[i].x, ay = shape.y + points[i].y;
      const bx = shape.x + points[j].x, by = shape.y + points[j].y;
      return (
        (Math.abs(ax - worldLeft) < tolerance && Math.abs(bx - worldLeft) < tolerance) ||
        (Math.abs(ax - worldRight) < tolerance && Math.abs(bx - worldRight) < tolerance) ||
        (Math.abs(ay - worldTop) < tolerance && Math.abs(by - worldTop) < tolerance) ||
        (Math.abs(ay - worldBottom) < tolerance && Math.abs(by - worldBottom) < tolerance)
      );
    };

    let start = -1;
    for (let i = 0; i < n; i++) {
      if (isWorldBorderEdge(i)) { start = (i + 1) % n; break; }
    }

    if (start === -1) {
      ctx.beginPath();
      ctx.moveTo(toX(shape.x + points[0].x), toY(shape.y + points[0].y));
      for (let i = 1; i < n; i++) {
        ctx.lineTo(toX(shape.x + points[i].x), toY(shape.y + points[i].y));
      }
      ctx.closePath();
      ctx.stroke();
      return;
    }

    ctx.beginPath();
    let inSegment = false;
    for (let k = 0; k < n; k++) {
      const i = (start + k) % n;
      if (isWorldBorderEdge(i)) {
        inSegment = false;
        continue;
      }
      const j = (i + 1) % n;
      if (!inSegment) {
        ctx.moveTo(toX(shape.x + points[i].x), toY(shape.y + points[i].y));
        inSegment = true;
      }
      ctx.lineTo(toX(shape.x + points[j].x), toY(shape.y + points[j].y));
    }
    ctx.stroke();
  }

  createMapBorder() {
    if (this.borderGraphics) {
      this.borderGraphics.destroy();
    }

    this.borderGraphics = this.scene.add.graphics();
    this.borderGraphics.setDepth(-1);

    this.borderGraphics.lineStyle(35, 0x000000, 1);

    this.borderGraphics.strokeRect(this.x, this.y, this.width, this.height);
  }
}

export default GameMap;
