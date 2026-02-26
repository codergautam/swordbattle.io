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

    // Compute bounding box of all rivers
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

    const borderWidth = 120;
    const borderAlpha = 0.25;
    const canvasScale = 0.1;
    const canvasW = Math.ceil(worldW * canvasScale);
    const canvasH = Math.ceil(worldH * canvasScale);

    const toX = (wx: number) => (wx - minX) * canvasScale;
    const toY = (wy: number) => (wy - minY) * canvasScale;

    const canvas = document.createElement('canvas');
    canvas.width = canvasW;
    canvas.height = canvasH;
    const ctx = canvas.getContext('2d')!;

    // Fill all river shapes with solid black
    ctx.fillStyle = '#000000';
    for (const river of rivers) {
      this.fillRiverOnCanvas(ctx, river.shape as any, toX, toY, canvasScale);
    }

    // Punch out inset shapes using destination-out compositing
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = '#000000';
    for (const river of rivers) {
      this.fillInsetOnCanvas(ctx, river.shape as any, borderWidth, toX, toY, canvasScale);
    }

    // Create Phaser texture from canvas
    const textureKey = 'riverBorder';
    if (this.scene.textures.exists(textureKey)) {
      this.scene.textures.remove(textureKey);
    }
    this.scene.textures.addCanvas(textureKey, canvas);

    const sprite = this.scene.add.sprite(minX + worldW / 2, minY + worldH / 2, textureKey);
    sprite.setDisplaySize(worldW, worldH);
    sprite.setDepth(-1.5);
    sprite.setAlpha(borderAlpha);
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
  ) {
    if (shape.type === ShapeTypes.Circle) {
      const r = Math.max(0, (shape.radius - inset) * scale);
      ctx.beginPath();
      ctx.arc(toX(shape.x), toY(shape.y), r, 0, Math.PI * 2);
      ctx.fill();
    } else if (shape.type === ShapeTypes.Polygon) {
      const points: { x: number; y: number }[] = shape.points;
      const n = points.length;

      // Compute inward unit normals for each edge
      const normals: { x: number; y: number }[] = [];
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        const dx = points[j].x - points[i].x;
        const dy = points[j].y - points[i].y;
        const len = Math.sqrt(dx * dx + dy * dy);
        normals.push({ x: -dy / len, y: dx / len });
      }

      // Check winding via signed area — flip normals if CW
      let area = 0;
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        area += points[i].x * points[j].y - points[j].x * points[i].y;
      }
      if (area < 0) {
        for (const nm of normals) { nm.x = -nm.x; nm.y = -nm.y; }
      }

      // Offset each vertex inward using miter formula for uniform border width
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const n1 = normals[(i - 1 + n) % n];
        const n2 = normals[i];
        const dot = n1.x * n2.x + n1.y * n2.y;
        const denom = 1 + dot;
        const f = denom > 0.001 ? inset / denom : inset;
        const ix = points[i].x + (n1.x + n2.x) * f;
        const iy = points[i].y + (n1.y + n2.y) * f;
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
    this.borderGraphics.setDepth(-2);

    this.borderGraphics.lineStyle(35, 0x000000, 1);

    this.borderGraphics.strokeRect(this.x, this.y, this.width, this.height);
  }
}

export default GameMap;
