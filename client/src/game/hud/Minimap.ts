import HudComponent from './HudComponent';
import GlobalEntity from '../entities/GlobalEntity';
import { BiomeTypes, EntityTypes } from '../Types';
import { drawPanel } from './panel';
import { getTheme } from '../../hudTheme';

const _circleSides = 16;
const _circleCos: number[] = [];
const _circleSin: number[] = [];
for (let i = 0; i <= _circleSides; i++) {
  const a = (i / _circleSides) * Math.PI * 2;
  _circleCos.push(Math.cos(a));
  _circleSin.push(Math.sin(a));
}

function _tracePolyCircle(g: Phaser.GameObjects.Graphics, cx: number, cy: number, r: number) {
  g.moveTo(cx + r * _circleCos[0], cy + r * _circleSin[0]);
  for (let i = 1; i <= _circleSides; i++) {
    g.lineTo(cx + r * _circleCos[i], cy + r * _circleSin[i]);
  }
}

const pad = 12;
const header = 28;
const map = 200;
const mapRes = 1;

class Minimap extends HudComponent {
  graphics: Phaser.GameObjects.Graphics | null = null;
  outerPanel: Phaser.GameObjects.Graphics | null = null;
  innerFrame: Phaser.GameObjects.Graphics | null = null;
  maskG: Phaser.GameObjects.Graphics | null = null;
  viewport: Phaser.GameObjects.Container | null = null;
  pan: Phaser.GameObjects.Container | null = null;
  mapContainer: Phaser.GameObjects.Container | null = null;
  crown: Phaser.GameObjects.Sprite | null = null;
  header!: Phaser.GameObjects.Text;
  leftArrow!: Phaser.GameObjects.Text;
  rightArrow!: Phaser.GameObjects.Text;
  zoomInBtn!: Phaser.GameObjects.Text;
  zoomOutBtn!: Phaser.GameObjects.Text;
  mapLabel!: Phaser.GameObjects.Text;
  headerHit!: any;
  crownSpeed: number = 500;
  width: number = map;
  height: number = map;
  scaleX = 0;
  scaleY = 0;
  minimized = false;
  zoom = 1;
  private selfX = map / 2;
  private selfY = map / 2;
  private _minimapAccumulator: number = 0;
  private _minimapInterval: number = 67;
  private _dotPositions: Map<string, { x: number, y: number, targetX: number, targetY: number, radius: number, isSelf: boolean, isZombie: boolean }> = new Map();
  private dotLayer: Phaser.GameObjects.Container | null = null;
  private dotSprites: Phaser.GameObjects.Image[] = [];
  private static readonly dotBakeR = 9;

  initialize() {
    this.outerPanel = this.game.add.graphics();
    this.innerFrame = this.game.add.graphics();

    this.header = this.hud.scene.add.text(pad + 2, pad + header / 2, 'Minimap', {
      fontSize: 17, fontFamily: "'Saira', sans-serif", fontStyle: '700',
      color: '#f5c842', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0, 0.5);

    const arrowStyle = { fontSize: 13, fontFamily: "'Saira', sans-serif", fontStyle: '700', color: '#ffffff', stroke: '#000000', strokeThickness: 3 };
    this.leftArrow = this.hud.scene.add.text(0, 0, '▼', arrowStyle).setOrigin(0.5);
    this.rightArrow = this.hud.scene.add.text(0, 0, '▼', arrowStyle).setOrigin(0.5);

    const zStyle = { fontSize: 20, fontFamily: "'Saira', sans-serif", fontStyle: '700', color: '#ffffff', stroke: '#000000', strokeThickness: 3 };
    this.zoomOutBtn = this.hud.scene.add.text(0, pad + header / 2, '−', zStyle).setOrigin(0.5)
      .setInteractive({ useHandCursor: true }).on('pointerdown', () => this.setZoom(this.zoom - 1));
    this.zoomInBtn = this.hud.scene.add.text(0, pad + header / 2, '+', zStyle).setOrigin(0.5)
      .setInteractive({ useHandCursor: true }).on('pointerdown', () => this.setZoom(this.zoom + 1));

    this.header.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.toggleMinimize());

    this.crown = this.game.add.sprite(0, 0, 'crown').setScale(0.1);
    this.ensureDotTextures();
    this.dotLayer = this.game.add.container();
    this.mapContainer = this.game.add.container();

    this.pan = this.game.add.container(0, 0, [this.mapContainer, this.dotLayer, this.crown]);
    this.viewport = this.game.add.container(pad, pad + header, [this.pan]);

    this.mapLabel = this.hud.scene.add.text(pad + map - 4, pad + header + map - 4, 'Map: v3', {
      fontSize: 11, fontFamily: "'Saira', sans-serif", fontStyle: '700',
      color: '#ffffff', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(1, 1);

    this.maskG = this.hud.scene.add.graphics();
    this.maskG.setVisible(false);

    this.headerHit = this.game.add.zone(0, 0, pad * 2 + map, pad + header).setOrigin(0, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.toggleMinimize());

    this.container = this.game.add.container(0, 0, [
      this.outerPanel, this.headerHit, this.header, this.leftArrow, this.rightArrow,
      this.zoomInBtn, this.zoomOutBtn, this.innerFrame, this.viewport, this.mapLabel,
    ]);
    this.hud.add(this.container);

    this.viewport.setMask(this.maskG.createGeometryMask());

    if (this.game.isMobile) {
      this.minimized = true;
      this.innerFrame.setVisible(false);
      this.viewport.setVisible(false);
      this.mapLabel.setVisible(false);
    }

    this.redrawFrame();
    this.layoutHeader();
  }

  private layoutHeader() {
    const hy = (pad + header) / 2;
    this.leftArrow.setPosition(pad + 6, hy);
    this.header.setPosition(pad + 16, hy);
    this.rightArrow.setPosition(pad + 16 + this.header.width + 6, hy);
    const panelW = pad * 2 + map;
    this.zoomInBtn.setPosition(panelW - pad - 6, hy);
    this.zoomOutBtn.setPosition(panelW - pad - 26, hy);
    const showZoom = !this.minimized;
    this.zoomInBtn.setVisible(showZoom);
    this.zoomOutBtn.setVisible(showZoom);
    this.updateArrows();
  }

  private ensureDotTextures() {
    const R = Minimap.dotBakeR;
    const size = (R + 3) * 2;
    const bake = (key: string, fill: number) => {
      if (this.game.textures.exists(key)) return;
      const g = this.game.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(fill, 1);
      g.lineStyle(4, 0x000000, 1);
      g.fillCircle(size / 2, size / 2, R);
      g.strokeCircle(size / 2, size / 2, R);
      g.generateTexture(key, size, size);
      g.destroy();
    };
    bake('mmDotEnemy', 0xff0000);
    bake('mmDotSelf', 0xffffff);
    bake('mmDotZombie', 0x72d63c);
  }

  private redrawFrame() {
    const t = getTheme();
    const panelW = pad * 2 + map;
    const panelH = this.minimized ? (pad + header) : (pad * 2 + header + map);
    this.outerPanel!.clear();
    drawPanel(this.outerPanel!, 0, 0, panelW, panelH, { radius: t.radius });

    this.innerFrame!.clear();
    if (!this.minimized) {
      const mx = pad, my = pad + header, yw = t.borderW, bw = t.outerW;
      if (bw > 0) {
        this.innerFrame!.fillStyle(t.outer, t.outerAlpha);
        this.innerFrame!.fillRoundedRect(mx - yw - bw, my - yw - bw, map + (yw + bw) * 2, map + (yw + bw) * 2, 6);
      }
      if (yw > 0) {
        this.innerFrame!.fillStyle(t.border, t.borderAlpha);
        this.innerFrame!.fillRoundedRect(mx - yw, my - yw, map + yw * 2, map + yw * 2, 4);
      }
      this.innerFrame!.fillStyle(0x2a3358, 1);
      this.innerFrame!.fillRect(mx, my, map, map);
    }
    if (this.header) this.header.setColor(t.accent);
  }

  applyTheme() {
    if (!this.outerPanel) return;
    const t = getTheme();
    this.redrawFrame();
    for (const text of [this.header, this.leftArrow, this.rightArrow, this.zoomInBtn, this.zoomOutBtn, this.mapLabel]) {
      text?.setStroke(t.textOutline, t.textOutlineW);
    }
    this.leftArrow?.setColor(t.text);
    this.rightArrow?.setColor(t.text);
    this.zoomInBtn?.setColor(t.text);
    this.zoomOutBtn?.setColor(t.text);
    this.mapLabel?.setColor(t.text);
  }

  updateArrows() {
    const arrow = this.minimized ? '▲' : '▼';
    this.leftArrow.setText(arrow);
    this.rightArrow.setText(arrow);
  }

  setZoom(z: number) {
    this.zoom = Math.max(1, Math.min(4, z));
  }

  toggleMinimize() {
    this.minimized = !this.minimized;
    this.redrawFrame();
    this.layoutHeader();
    const show = !this.minimized;
    this.innerFrame?.setVisible(show);
    this.viewport?.setVisible(show);
    this.mapLabel.setVisible(show);
    this.resize();
  }

  resize() {
    if (!this.container) return;
    const panelW = pad * 2 + map;
    const panelH = this.minimized ? (pad + header) : (pad * 2 + header + map);
    const s = this.scale;
    const x = this.game.scale.width - (panelW * s) - 10;
    let y = this.game.scale.height - (panelH * s) - 10;

    const controls: any = this.game.controls;
    const aimBase: any = controls?.aimJoystick?.base;
    if (this.game.isMobile && aimBase && aimBase.y > 0) {
      const r = (typeof controls.stickRadius === 'function' ? controls.stickRadius() : 130 * s);
      const clusterTop = aimBase.y - r - (128 + 55 + 12) * s;
      y = Math.min(y, clusterTop - panelH * s);
    }
    this.container.setPosition(x, Math.max(10, y));
    this.updateMaskRect();
  }

  private updateMaskRect() {
    if (!this.maskG || !this.container) return;
    const s = this.scale;
    const wx = this.container.x + pad * s;
    const wy = this.container.y + (pad + header) * s;
    this.maskG.clear();
    this.maskG.fillStyle(0xffffff);
    this.maskG.fillRect(wx, wy, map * s, map * s);
  }

  updateMapData() {
    if (!this.mapContainer) return;

    const map = this.game.gameState.gameMap;
    const scene = this.game;
    this.scaleX = this.width / map.width;
    this.scaleY = this.height / map.height;

    this.mapContainer.removeAll(true);
    this.mapContainer.setScale(this.scaleX, this.scaleY);
    this.mapContainer.setPosition(-map.x * this.scaleX, -map.y * this.scaleY);

    const tempContainer = scene.add.container(0, 0);
    const riverColor = 0x4854a2;
    const biomeGraphics = scene.add.graphics();
    biomeGraphics.fillStyle(riverColor);
    biomeGraphics.fillRect(map.x, map.y, map.width, map.height);

    for (const biome of map.biomes) {
      let color = riverColor;
      switch (biome.type) {
        case BiomeTypes.Fire: color = 0x9a2c13; break;
        case BiomeTypes.Earth: color = 0x1aad41; break;
        case BiomeTypes.Ice: color = 0xffffff; break;
        case BiomeTypes.River: color = 0x4854a2; break;
        case BiomeTypes.Safezone: color = 0x999999; break;
        case BiomeTypes.TutorialZone: color = 0xd9c48b; break;
        case BiomeTypes.Meadow: color = 0x7fbf4f; break;
        case BiomeTypes.Savanna: color = 0xd9bb5c; break;
        case BiomeTypes.Alpine: color = 0x1c6d42; break;
        case BiomeTypes.Dirt: color = 0x8a6a45; break;
        case BiomeTypes.Rocks: color = 0x8a8a8a; break;
        case BiomeTypes.Desert: color = 0xe4c987; break;
        case BiomeTypes.Oasis: color = 0xe4c987; break;
      }
      biomeGraphics.fillStyle(color);
      biome.shape.fillShape(biomeGraphics);
      if (biome.type === BiomeTypes.Safezone && (biome.shape as any).radius) {
        const s: any = biome.shape;
        biomeGraphics.lineStyle(200, 0x000000, 1);
        biomeGraphics.strokeCircle(s.x, s.y, s.radius + 250);
        biomeGraphics.lineStyle(0, 0, 0);
      }
    }
    tempContainer.add(biomeGraphics);

    const visualKeys = ['container', 'body', 'shadow', 'houseSprite', 'roofSprite'];
    const gameEntities = this.game.gameState.entities;
    for (const staticObject of map.staticObjects) {
      const entity = staticObject as any;
      const snap: Record<string, any> = {};
      for (const key of visualKeys) {
        if (entity[key] !== undefined) {
          snap[key] = entity[key];
          entity[key] = null;
        }
      }

      const before = new Set(scene.children.list);
      try {
        staticObject.createSprite();
      } catch (e) {
        console.warn('[Minimap] static createSprite failed', e);
      }

      for (const child of scene.children.list) {
        if (!before.has(child) && !(child as any).parentContainer) {
          tempContainer.add(child);
        }
      }

      for (const key of visualKeys) {
        if (key in snap) entity[key] = snap[key];
        else delete entity[key];
      }

      if (entity.id !== undefined && gameEntities[entity.id] && snap.container) {
        (snap.container as any).visible = false;
        if ((snap.container as any).displayList) (snap.container as any).removeFromDisplayList();
      }
    }

    tempContainer.setScale(this.scaleX * mapRes, this.scaleY * mapRes);
    tempContainer.setPosition(-map.x * this.scaleX * mapRes, -map.y * this.scaleY * mapRes);

    const rt = scene.add.renderTexture(0, 0, this.width * mapRes, this.height * mapRes).setOrigin(0, 0);
    rt.draw(tempContainer);
    tempContainer.destroy(true);

    rt.setPosition(map.x, map.y);
    rt.setDisplaySize(map.width, map.height);
    this.mapContainer.add(rt);
  }

  updateCrown(player: any, dt: number) {
    if (!this.crown || !this.mapContainer) return;
    const lerpFactor = dt / this.crownSpeed;
    const targetX = this.mapContainer.x + player.shape.x * this.scaleX;
    const targetY = this.mapContainer.y + player.shape.y * this.scaleY;
    this.crown.x += (targetX - this.crown.x) * lerpFactor;
    this.crown.y += (targetY - this.crown.y) * lerpFactor;
  }

  updateGlobalEntities() {
    const globalEntities = this.game.gameState.globalEntities;
    for (const id in globalEntities) {
      const entity = globalEntities[id];
      if (entity.type === EntityTypes.Player || entity.type === EntityTypes.Zombie) continue;
      if (!entity.container) {
        try {
          const sprite = entity.createSprite();
          if (sprite) this.mapContainer?.add(sprite);
        } catch (e) {
          console.error('Failed to add mm entity', e);
        }
      }
    }
  }

  private applyPanZoom() {
    if (!this.pan) return;
    const z = this.zoom;
    let ox = map / 2 - this.selfX * z;
    let oy = map / 2 - this.selfY * z;
    const min = map - map * z;
    ox = Math.max(min, Math.min(0, ox));
    oy = Math.max(min, Math.min(0, oy));
    this.pan.setScale(z);
    this.pan.setPosition(ox, oy);
    this.crown?.setScale(0.28 / z);
  }

  update(dt: number) {
    if (!this.dotLayer) return;
    if (this.minimized) return;

    const dotLayer = this.dotLayer;
    const map = this.game.gameState.gameMap;
    const globalEntities = this.game.gameState.globalEntities;

    this._minimapAccumulator += dt;
    const shouldRecalc = this._minimapAccumulator >= this._minimapInterval;
    if (shouldRecalc) {
      this._minimapAccumulator -= this._minimapInterval;
      this.updateGlobalEntities();

      const activeIds = new Set<string>();
      for (const id in globalEntities) {
        const player = globalEntities[id] as any;
        const isZombie = player.type === EntityTypes.Zombie;
        if (player.type !== EntityTypes.Player && !isZombie) continue;
        const targetX = (player.shape.x - map.x) * this.scaleX;
        const targetY = (player.shape.y - map.y) * this.scaleY;
        const isSelf = !isZombie && player.id === this.game.gameState.self.id;
        const scale = this.scaleX * (isSelf ? 3 : 2) * (map.scale || 1) * 1.5;
        const dotRadius = player.shape.radius * scale;
        activeIds.add(id);
        const existing = this._dotPositions.get(id);
        if (existing) {
          existing.targetX = targetX; existing.targetY = targetY;
          existing.radius = dotRadius; existing.isSelf = isSelf; existing.isZombie = isZombie;
        } else {
          this._dotPositions.set(id, { x: targetX, y: targetY, targetX, targetY, radius: dotRadius, isSelf, isZombie });
        }
      }
      for (const id of this._dotPositions.keys()) {
        if (!activeIds.has(id)) this._dotPositions.delete(id);
      }
    }

    const lerpRate = 1 - Math.exp(-dt / this._minimapInterval);

    let leader: any = null;
    let leaderDotVisible = true;
    let selfSprite: Phaser.GameObjects.Image | null = null;
    const zr = 1 / this.zoom;
    const R = Minimap.dotBakeR;
    const pool = this.dotSprites;
    let used = 0;

    for (const [id, dot] of this._dotPositions) {
      dot.x += (dot.targetX - dot.x) * lerpRate;
      dot.y += (dot.targetY - dot.y) * lerpRate;
      const tooSmall = dot.radius < 1;
      const player = globalEntities[id as any] as any;
      if (player?.type === EntityTypes.Player && (!leader || player.coins > leader.coins)) {
        leader = player; leaderDotVisible = !tooSmall;
      }
      if (tooSmall) continue;

      let spr = pool[used];
      if (!spr) {
        spr = this.game.add.image(0, 0, 'mmDotEnemy').setOrigin(0.5);
        dotLayer.add(spr);
        pool[used] = spr;
      }
      used++;
      spr.setTexture(dot.isSelf ? 'mmDotSelf' : (dot.isZombie ? 'mmDotZombie' : 'mmDotEnemy'));
      spr.setPosition(dot.x, dot.y);
      spr.setScale((dot.radius * zr) / R);
      spr.setVisible(true);
      if (dot.isSelf) {
        this.selfX = dot.x;
        this.selfY = dot.y;
        selfSprite = spr;
      }
    }
    for (let i = used; i < pool.length; i++) pool[i].setVisible(false);
    if (selfSprite) dotLayer.bringToTop(selfSprite);

    if (leader && leaderDotVisible) {
      this.updateCrown(leader, dt);
      if (this.crown) this.crown.setVisible(true);
    } else {
      if (this.crown) this.crown.setVisible(false);
    }

    this.applyPanZoom();
  }

  removeGlobalEntity(entity: GlobalEntity) {
    this.mapContainer?.remove(entity.container);
  }
}

export default Minimap;
