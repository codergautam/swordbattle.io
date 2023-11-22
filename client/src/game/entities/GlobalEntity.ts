import { BaseEntity } from './BaseEntity';
import { GetEntityClass } from '.';

class GlobalEntity extends BaseEntity {
  static stateFields = [...BaseEntity.stateFields, 'name', 'coins', 'angle', 'account'];
  minimapEntity?: BaseEntity;

  createSprite() {
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

  afterStateUpdate(data: any): void {
    if (!this.minimapEntity) return;
    this.minimapEntity.updateState(data);
  }

  update(dt: number): void {
    if (!this.minimapEntity) return;
    this.minimapEntity.update(dt);
  }

  remove() {
    if (!this.minimapEntity) return;
    this.game.hud.minimap.removeGlobalEntity(this);
    this.minimapEntity.remove();
  }
}

export default GlobalEntity;
