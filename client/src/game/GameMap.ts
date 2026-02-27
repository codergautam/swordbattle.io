import Game from './scenes/Game';
import Biome, { BiomeType } from './biomes/Biome';
import Safezone from './biomes/Safezone';
import River from './biomes/River';
import { BiomeTypes, ShapeTypes } from './Types';
import { GetEntityClass } from './entities';

class GameMap {
  scene: Game;
  biomes: BiomeType[] = [];
  staticObjects: any[] = [];
  x = 0;
  y = 0;
  width = 0;
  height = 0;
  borderGraphics: Phaser.GameObjects.Graphics | null = null;

  constructor(scene: Game) {
    this.scene = scene;
  }

  update() {
    this.biomes.forEach((biome: any) => biome.update());
  }

  updateMapData(mapData: any) {
    this.x = mapData.x;
    this.y = mapData.y;
    this.width = mapData.width;
    this.height = mapData.height;
    this.scene.physics.world.setBounds(this.x, this.y, this.width, this.height);
    mapData.biomes.forEach((biomeData: any) => this.addBiome(biomeData));
    if (mapData.staticObjects) {
      mapData.staticObjects.forEach(((objectData: any) => this.addStaticObject(objectData)));
    }
    this.sortBiomes();
    this.createRiverBorders();
    this.createMapBorder();
    this.scene.hud.minimap.updateMapData();
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
    }
    if (!BiomeClass) return console.log('Unknown biome type: ', biomeData.type);

    const biome = new BiomeClass(this.scene, biomeData);
    biome.createSprite();
    this.biomes.push(biome);
  }

  sortBiomes() {
    this.biomes.sort((a, b) => a.zIndex - b.zIndex);
  }

  createRiverBorders() {
    const rivers = this.biomes.filter(b => b.type === BiomeTypes.River);
    if (rivers.length === 0) return;

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

    const padding = 150;
    minX -= padding; minY -= padding;
    maxX += padding; maxY += padding;
    const worldW = maxX - minX;
    const worldH = maxY - minY;

    const canvasScale = 0.3;
    const canvasW = Math.ceil(worldW * canvasScale);
    const canvasH = Math.ceil(worldH * canvasScale);

    const toX = (wx: number) => (wx - minX) * canvasScale;
    const toY = (wy: number) => (wy - minY) * canvasScale;

    const borders = [
      { width: 330, alpha: 0.075, texture: 'sand', key: 'riverBorderOuter' },
      { width: 300, alpha: 0.2, texture: 'sand', key: 'riverBorderShadow' },
      { width: 270, alpha: 1,    texture: 'sand', key: 'riverBorder' },
      { width: 30, alpha: 1,    color: '#000000', key: 'riverBorderBlack' },
    ];

    const sandSource = this.scene.textures.get('sand').getSourceImage() as HTMLImageElement;

    for (const border of borders) {
      const canvas = document.createElement('canvas');
      canvas.width = canvasW;
      canvas.height = canvasH;
      const ctx = canvas.getContext('2d')!;

      if (border.texture) {
        const pattern = ctx.createPattern(sandSource, 'repeat')!;
        ctx.fillStyle = pattern;
      } else {
        ctx.fillStyle = border.color!;
      }
      for (const river of rivers) {
        this.fillRiverOnCanvas(ctx, river.shape as any, toX, toY, canvasScale);
      }

      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = '#000000';
      for (const river of rivers) {
        this.fillInsetOnCanvas(ctx, river.shape as any, border.width, toX, toY, canvasScale, rivers);
      }

      if (this.scene.textures.exists(border.key)) {
        this.scene.textures.remove(border.key);
      }
      this.scene.textures.addCanvas(border.key, canvas);

      const sprite = this.scene.add.sprite(minX + worldW / 2, minY + worldH / 2, border.key);
      sprite.setDisplaySize(worldW, worldH);
      sprite.setDepth(-1.5);
      sprite.setAlpha(border.alpha);
    }
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

  private fillInsetOnCanvas(
    ctx: CanvasRenderingContext2D, shape: any, inset: number,
    toX: (x: number) => number, toY: (y: number) => number, scale: number,
    rivers: BiomeType[],
  ) {
    if (shape.type === ShapeTypes.Circle) {
      const r = Math.max(0, (shape.radius - inset) * scale);
      ctx.beginPath();
      ctx.arc(toX(shape.x), toY(shape.y), r, 0, Math.PI * 2);
      ctx.fill();
    } else if (shape.type === ShapeTypes.Polygon) {
      const points: { x: number; y: number }[] = shape.points;
      const n = points.length;

      const worldLeft = this.x;
      const worldRight = this.x + this.width;
      const worldTop = this.y;
      const worldBottom = this.y + this.height;
      const tolerance = 1;

      const edgeInsets: number[] = [];
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        const ax = shape.x + points[i].x;
        const ay = shape.y + points[i].y;
        const bx = shape.x + points[j].x;
        const by = shape.y + points[j].y;

        const onWorldBorder =
          (Math.abs(ax - worldLeft) < tolerance && Math.abs(bx - worldLeft) < tolerance) ||
          (Math.abs(ax - worldRight) < tolerance && Math.abs(bx - worldRight) < tolerance) ||
          (Math.abs(ay - worldTop) < tolerance && Math.abs(by - worldTop) < tolerance) ||
          (Math.abs(ay - worldBottom) < tolerance && Math.abs(by - worldBottom) < tolerance);

        const insideCircle = rivers.some(r => {
          const cs = r.shape as any;
          if (cs.type !== ShapeTypes.Circle) return false;
          const margin = inset;
          const distA = Math.sqrt((ax - cs.x) ** 2 + (ay - cs.y) ** 2);
          const distB = Math.sqrt((bx - cs.x) ** 2 + (by - cs.y) ** 2);
          return distA < cs.radius + margin && distB < cs.radius + margin;
        });

        edgeInsets.push((onWorldBorder || insideCircle) ? 0 : inset);
      }

      const normals: { x: number; y: number }[] = [];
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        const dx = points[j].x - points[i].x;
        const dy = points[j].y - points[i].y;
        const len = Math.sqrt(dx * dx + dy * dy);
        normals.push({ x: -dy / len, y: dx / len });
      }

      let area = 0;
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        area += points[i].x * points[j].y - points[j].x * points[i].y;
      }
      if (area < 0) {
        for (const nm of normals) { nm.x = -nm.x; nm.y = -nm.y; }
      }

      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const prevEdge = (i - 1 + n) % n;
        const currEdge = i;
        const n1 = normals[prevEdge];
        const n2 = normals[currEdge];
        const inset1 = edgeInsets[prevEdge];
        const inset2 = edgeInsets[currEdge];

        let ix: number, iy: number;
        const det = n1.x * n2.y - n2.x * n1.y;

        if (Math.abs(det) > 0.001) {
          const ox = (inset1 * n2.y - inset2 * n1.y) / det;
          const oy = (inset2 * n1.x - inset1 * n2.x) / det;
          ix = points[i].x + ox;
          iy = points[i].y + oy;
        } else {
          const avgInset = (inset1 + inset2) / 2;
          const dot = n1.x * n2.x + n1.y * n2.y;
          const denom = 1 + dot;
          const f = denom > 0.001 ? avgInset / denom : avgInset;
          ix = points[i].x + (n1.x + n2.x) * f;
          iy = points[i].y + (n1.y + n2.y) * f;
        }

        if (i === 0) ctx.moveTo(toX(shape.x + ix), toY(shape.y + iy));
        else ctx.lineTo(toX(shape.x + ix), toY(shape.y + iy));
      }
      ctx.closePath();
      ctx.fill();
    }
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
