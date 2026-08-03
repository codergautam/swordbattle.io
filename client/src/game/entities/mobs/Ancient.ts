import { BaseEntity } from '../BaseEntity';
import { Health } from '../../components/Health';

const ancientSkins: Record<number, { body: string, shadow: string }> = {
  0: { body: 'ancient',     shadow: 'ancientShadow' },
  2: { body: 'ancientDirt', shadow: 'ancientShadow' },
};

class AncientMob extends BaseEntity {
  static stateFields = [...BaseEntity.stateFields, 'angle', 'skin'];
  static basicAngle = -Math.PI / 2;
  static removeTransition = 500;

  body!: Phaser.GameObjects.Sprite;
  shadow!: Phaser.GameObjects.Sprite;

  get baseScale() {
    return (this.shape.radius * 3) / this.body.width * 1.25;
  }

  private pickTextures(): { body: string, shadow: string } {
    const idx = (this.skin as number) || 0;
    const t = ancientSkins[idx] || ancientSkins[0];
    return {
      body: this.game.textures.exists(t.body) ? t.body : 'ancient',
      shadow: this.game.textures.exists(t.shadow) ? t.shadow : 'ancientShadow',
    };
  }

  createSprite() {
    const tex = this.pickTextures();
    this.body = this.game.add.sprite(0, 0, tex.body).setOrigin(0.5, 0.5);
    this.shadow = this.createOutlineShadow(tex.body, 0.5, 0.5, { living: true });
    this.syncOutlineShadow(this.shadow, this.body);
    this.healthBar = new Health(this, {
      offsetY: -this.shape.radius * 1.25,
      width: this.shape.radius * 1.5,
      height: 50 * 1.25,
    });
    this.container = this.game.add.container(this.shape.x, this.shape.y, [this.shadow, this.body]).setScale(this.baseScale);
    return this.container;
  }

  updateRotation() {
    if (!this.body) return;
    super.updateRotation();
    this.syncOutlineShadow(this.shadow, this.body);
  }
}

export default AncientMob;
