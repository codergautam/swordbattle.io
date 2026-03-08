import { BaseEntity } from './BaseEntity';
import { GetEntityClass } from '.';
import { EntityTypes } from '../Types';
import CaptureZone from './CaptureZone';

const bossTypes = new Set([
  EntityTypes.Yeti, EntityTypes.Roku, EntityTypes.Ancient,
  EntityTypes.IceSpirit, EntityTypes.Santa, EntityTypes.Chimera,
]);

class GlobalEntity extends BaseEntity {
  static stateFields = [...BaseEntity.stateFields, 'name', 'coins', 'angle', 'account'];
  minimapEntity?: BaseEntity;
  gameWorldEntity?: BaseEntity;
  private minimapGraphics?: Phaser.GameObjects.Graphics;

  createSprite() {
    if (this.type === EntityTypes.CaptureZone) {
      return this.createMinimapZoneSprite();
    }

    const EntityClass = GetEntityClass(this.type);
    this.minimapEntity = new EntityClass(this.game);
    this.minimapEntity.updateState(this);
    this.minimapEntity.createSprite();
    this.minimapEntity.setDepth();
    this.minimapEntity.healthBar?.destroy();
    this.container = this.minimapEntity.container;
    this.container.scale *= 3;
    return this.container;
  }

  createGameWorldVisual() {
    try {
      if (!this.game.add) return;
      if (this.type === EntityTypes.CaptureZone) {
        this.gameWorldEntity = new CaptureZone(this.game);
        this.gameWorldEntity.updateState(this);
        this.gameWorldEntity.createSprite();
        this.gameWorldEntity.container?.setDepth(0.5);
      } else if (bossTypes.has(this.type)) {
        const EntityClass = GetEntityClass(this.type);
        this.gameWorldEntity = new EntityClass(this.game);
        this.gameWorldEntity.updateState(this);
        this.gameWorldEntity.createSprite();
        this.gameWorldEntity.setDepth();
      }
    } catch (e) {
      console.warn('[GlobalEntity] Failed to create game world visual:', e);
    }
  }

  private createMinimapZoneSprite() {
    const radius = this.shape.radius;
    this.minimapGraphics = this.game.add.graphics();
    this.minimapGraphics.fillStyle(0xffd700, 0.45);
    this.minimapGraphics.fillCircle(0, 0, radius);
    this.minimapGraphics.lineStyle(radius * 0.15, 0xf5c842, 0.9);
    this.minimapGraphics.strokeCircle(0, 0, radius);
    this.minimapGraphics.lineStyle(radius * 0.06, 0xffffff, 0.5);
    this.minimapGraphics.strokeCircle(0, 0, radius * 0.7);

    this.container = this.game.add.container(this.shape.x, this.shape.y, [this.minimapGraphics]);
    return this.container;
  }

  afterStateUpdate(data: any): void {
    if (this.minimapEntity) {
      this.minimapEntity.updateState(data);
    }
    if (this.gameWorldEntity) {
      this.gameWorldEntity.updateState(data);
    }
  }

  update(dt: number): void {
    if (this.gameWorldEntity) {
      this.gameWorldEntity.update(dt);
    }
    if (this.minimapEntity) {
      this.minimapEntity.update(dt);
    }
  }

  remove() {
    this.game.hud.minimap.removeGlobalEntity(this);
    if (this.minimapGraphics) {
      this.minimapGraphics.destroy();
      this.minimapGraphics = undefined;
    }
    if (this.container) {
      this.container.destroy();
    }
    if (this.gameWorldEntity) {
      this.gameWorldEntity.remove();
      this.gameWorldEntity = undefined;
    }
    if (this.minimapEntity) {
      this.minimapEntity.remove();
    }
  }
}

export default GlobalEntity;
