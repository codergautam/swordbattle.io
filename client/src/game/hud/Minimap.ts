import HudComponent from './HudComponent';
import GlobalEntity from '../entities/GlobalEntity';
import { BiomeTypes, EntityTypes } from '../Types';
import { config } from '../../config';

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

class Minimap extends HudComponent {
  graphics: Phaser.GameObjects.Graphics | null = null;
  mapBackground: Phaser.GameObjects.Graphics | null = null;
  mapContainer: Phaser.GameObjects.Container | null = null;
  crown: Phaser.GameObjects.Sprite | null = null;
  toggleButton!: Phaser.GameObjects.Text;
  leftArrow!: Phaser.GameObjects.Text;
  rightArrow!: Phaser.GameObjects.Text;
  crownSpeed: number = 500;
  width: number = 200;
  height: number = 200;
  scaleX = 0;
  scaleY = 0;
  minimized = false;
  private _minimapAccumulator: number = 0;
  private _minimapInterval: number = 67;
  private _dotPositions: Map<string, { x: number, y: number, targetX: number, targetY: number, radius: number, isSelf: boolean }> = new Map();

  initialize() {
    const arrowStyle = {
      fontSize: 16,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    };

    this.leftArrow = this.hud.scene.add.text(0, 0, '\u25BC', arrowStyle);
    this.rightArrow = this.hud.scene.add.text(0, 0, '\u25BC', arrowStyle);

    this.toggleButton = this.hud.scene.add.text(this.width - 115, -25, 'Minimap', {
      fontSize: 22,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    })
      .setInteractive()
      .on('pointerover', () => {
        const shift = this.minimized ? -3 : 3;
        const targets = [this.leftArrow, this.rightArrow];
        this.game.tweens.killTweensOf(targets);
        this.game.add.tween({ targets, y: this.leftArrow.y + shift, duration: 100 });
      })
      .on('pointerout', () => {
        this.game.tweens.killTweensOf([this.leftArrow, this.rightArrow]);
        this.updateArrows();
      })
      .on('pointerdown', () => this.toggleMinimize());

    this.updateArrows();

    this.mapBackground = this.game.add.graphics()
    this.mapBackground.lineStyle(6, 0x000000);
    this.mapBackground.strokeRect(0, 0, this.width, this.height);

    this.crown = this.game.add.sprite(0, 0, 'crown').setScale(0.3);
    this.graphics = this.game.add.graphics();
    this.mapContainer = this.game.add.container();
    this.container = this.game.add.container(0, 0, [this.leftArrow, this.rightArrow, this.toggleButton, this.mapBackground, this.mapContainer, this.graphics, this.crown])
    this.hud.add(this.container);
  }

  updateArrows() {
    const arrow = this.minimized ? '\u25B2' : '\u25BC';
    this.leftArrow.setText(arrow);
    this.rightArrow.setText(arrow);
    const btnX = this.toggleButton.x;
    const btnY = this.toggleButton.y;
    const btnW = this.toggleButton.width;
    this.leftArrow.setPosition(btnX - 18, btnY + 3);
    this.rightArrow.setPosition(btnX + btnW + 5, btnY + 3);
  }

  toggleMinimize() {
    this.minimized = !this.minimized;
    this.updateArrows();

    const fadeTargets = [this.mapBackground, this.mapContainer, this.graphics, this.crown];
    if (!this.minimized) {
      for (const t of fadeTargets) t?.setVisible(true);
    }
    this.hud.scene!.tweens.add({
      targets: fadeTargets,
      alpha: this.minimized ? 0 : 1,
      duration: 250,
      onComplete: () => {
        if (this.minimized) {
          for (const t of fadeTargets) t?.setVisible(false);
          this.graphics?.clear();
        }
      },
    });
    const targetY = (this.minimized ? this.height : 0) - 25;
    this.hud.scene!.tweens.add({
      targets: this.toggleButton,
      y: targetY,
      duration: 400,
    });
    this.hud.scene!.tweens.add({
      targets: [this.leftArrow, this.rightArrow],
      y: targetY + 3,
      duration: 400,
    });
    this.hud.scene!.tweens.add({
      targets: this.leftArrow,
      x: this.toggleButton.x - 18,
      duration: 400,
    });
    this.hud.scene!.tweens.add({
      targets: this.rightArrow,
      x: this.toggleButton.x + this.toggleButton.width + 5,
      duration: 400,
    });
  }

  resize() {
    if (!this.container) return;

    const x = this.game.scale.width - (this.width * this.scale) - 10;
    const isPortrait = this.game.scale.height > this.game.scale.width;
    const mobileOffset = (this.game.isMobile && isPortrait) ? 120 * this.scale : 0;
    const y = this.game.scale.height - (this.height * this.scale) - 10 - mobileOffset;
    this.container.setPosition(x, y);
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

    const biomeGraphics = scene.add.graphics();
    for (const biome of map.biomes) {
      let color = 0x4854a2;
      switch (biome.type) {
        case BiomeTypes.Fire: color = 0x9a2c13; break;
        case BiomeTypes.Earth: color = 0x1aad41; break;
        case BiomeTypes.Ice: color = 0xffffff; break;
        case BiomeTypes.River: color = 0x4854a2; break;
        case BiomeTypes.Safezone: color = 0x999999; break;
      }
      biomeGraphics.fillStyle(color);
      biome.shape.fillShape(biomeGraphics);
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
      }
    }

    tempContainer.setScale(this.scaleX, this.scaleY);
    tempContainer.setPosition(-map.x * this.scaleX, -map.y * this.scaleY);

    const rt = scene.add.renderTexture(0, 0, this.width, this.height).setOrigin(0, 0);
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
      if (entity.type === EntityTypes.Player) continue;

      if (!entity.container) {
        try {
        const sprite = entity.createSprite();
        this.mapContainer?.add(sprite);
        } catch (e) {
          console.error('Failed to add mm entity', e);
        }
      }
    }
  }

  update(dt: number) {
    if (!this.graphics) return;
    if (this.minimized) return;

    const { graphics } = this;
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
        if (player.type !== EntityTypes.Player) continue;
        const targetX = (player.shape.x - map.x) * this.scaleX;
        const targetY = (player.shape.y - map.y) * this.scaleY;
        const isSelf = player.id === this.game.gameState.self.id;
        const scale = this.scaleX * (isSelf ? 3 : 2);
        const dotRadius = player.shape.radius * scale;

        activeIds.add(id);
        const existing = this._dotPositions.get(id);
        if (existing) {
          existing.targetX = targetX;
          existing.targetY = targetY;
          existing.radius = dotRadius;
          existing.isSelf = isSelf;
        } else {
          this._dotPositions.set(id, { x: targetX, y: targetY, targetX, targetY, radius: dotRadius, isSelf });
        }
      }
      for (const id of this._dotPositions.keys()) {
        if (!activeIds.has(id)) this._dotPositions.delete(id);
      }
    }

    const lerpRate = 1 - Math.exp(-dt / this._minimapInterval);
    graphics.clear();

    let leader: any = null;
    let leaderDotVisible = true;
    let selfDot: { x: number, y: number, radius: number } | null = null;
    let enemyCount = 0;

    for (const [id, dot] of this._dotPositions) {
      dot.x += (dot.targetX - dot.x) * lerpRate;
      dot.y += (dot.targetY - dot.y) * lerpRate;

      const tooSmall = dot.radius < 1;
      const player = globalEntities[id as any] as any;
      if (player && (!leader || player.coins > leader.coins)) {
        leader = player;
        leaderDotVisible = !tooSmall;
      }
      if (tooSmall) continue;

      if (dot.isSelf) {
        selfDot = { x: dot.x, y: dot.y, radius: dot.radius };
      } else {
        enemyCount++;
      }
    }

    if (enemyCount > 0) {
      graphics.fillStyle(0xff0000);
      graphics.lineStyle(1, 0x000000);
      graphics.beginPath();
      for (const [, dot] of this._dotPositions) {
        if (dot.isSelf || dot.radius < 1) continue;
        _tracePolyCircle(graphics, dot.x, dot.y, dot.radius);
      }
      graphics.fillPath();
      graphics.strokePath();
    }

    if (selfDot) {
      graphics.fillStyle(0xffffff);
      graphics.lineStyle(1, 0x000000);
      graphics.beginPath();
      _tracePolyCircle(graphics, selfDot.x, selfDot.y, selfDot.radius);
      graphics.fillPath();
      graphics.strokePath();
    }

    if (leader && leaderDotVisible) {
      this.updateCrown(leader, dt);
      if (this.crown) this.crown.setVisible(true);
    } else {
      if (this.crown) this.crown.setVisible(false);
    }
  }

  removeGlobalEntity(entity: GlobalEntity) {
    this.mapContainer?.remove(entity.container);
  }
}

export default Minimap;
