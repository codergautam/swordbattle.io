import { BaseEntity } from '../BaseEntity';
import { windRotation } from '../../effects/Wind';

type Kind = 'shrub' | 'rock' | 'flower';

class AmbientShrub extends BaseEntity {
  static stateFields = [...BaseEntity.stateFields, 'size', 'skin', 'angle'];

  body!: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Sprite | null = null;
  private baseAngle = 0;
  private swaysInWind = false;

  private resolve(): { kind: Kind, key: string } {
    const skin = (this.skin as number) || 1;
    let kind: Kind, key: string;
    if (skin >= 20) { kind = 'flower'; key = `ambFlower${skin - 19}`; }
    else if (skin >= 13) { kind = 'rock'; key = `ambRock${skin - 12}desert`; }
    else if (skin >= 10) { kind = 'rock'; key = `ambRock${skin - 9}`; }
    else {
      kind = 'shrub';
      const idx = skin - 1;
      const style = ['Alpine', 'Grass', 'Meadow'][Math.floor(idx / 3)] || 'Alpine';
      key = `ambShrub${style}${(idx % 3) + 1}`;
    }
    if (!this.game.textures.exists(key)) {
      key = this.game.textures.exists('ambShrubAlpine1') ? 'ambShrubAlpine1' : key;
    }
    return { kind, key };
  }

  createSprite() {
    if (this.container) return this.container;

    const { kind, key } = this.resolve();
    this.body = this.game.add.sprite(0, 0, key).setOrigin(0.5, 0.5);
    const fill = kind === 'rock' ? 0.9 : 1.0;
    const scale = (this.shape.radius * 2 * fill) / this.body.width;
    this.body.setScale(scale);
    this.baseAngle = typeof this.angle === 'number' ? this.angle : 0;
    this.body.setRotation(this.baseAngle);
    this.swaysInWind = kind !== 'rock';

    const children: Phaser.GameObjects.GameObject[] = [];
    if (kind !== 'flower') {
      this.shadow = this.createOutlineShadow(key, 0.5, 0.5);
      this.shadow.setAlpha(BaseEntity.shadow.alpha * (kind === 'rock' ? 0.7 : 0.55));
      this.syncOutlineShadow(this.shadow, this.body);
      children.push(this.shadow);
    }
    children.push(this.body);

    this.container = this.game.add.container(this.shape.x, this.shape.y, children);
    return this.container;
  }

  updateWorldDepth() {}
  updateRotation() {}

  update(dt: number) {
    super.update(dt);
    if (this.container && this.container.visible === false) return;
    if (this.swaysInWind && this.body) {
      this.body.setRotation(this.baseAngle + windRotation(this.shape.x));
    }
  }
}

export default AmbientShrub;
