import { BaseEntity } from '../BaseEntity';
import { Health } from '../../components/Health';

const bunnySkins: Record<number, { body: string, shadow: string }> = {
  0: { body: 'bunny',       shadow: 'bunnyShadow' },
  1: { body: 'desertBunny', shadow: 'desertBunnyShadow' },
};

class BunnyMob extends BaseEntity {
  static stateFields = [...BaseEntity.stateFields, 'angle', 'isAngry', 'skin'];
  static basicAngle = -Math.PI / 2;
  static removeTransition = 500;

  body!: Phaser.GameObjects.Sprite;
  shadow!: Phaser.GameObjects.Sprite;

  private pickTextures(): { body: string, shadow: string } {
    const idx = (this.skin as number) || 0;
    const t = bunnySkins[idx] || bunnySkins[0];
    return {
      body: this.game.textures.exists(t.body) ? t.body : 'bunny',
      shadow: this.game.textures.exists(t.shadow) ? t.shadow : 'bunnyShadow',
    };
  }

  createSprite() {
    const tex = this.pickTextures();
    this.body = this.game.add.sprite(0, 0, tex.body).setOrigin(0.48, 0.65);
    const scale = (this.shape.radius * 4) / this.body.height;
    this.body.setScale(scale);
    this.shadow = this.createOutlineShadow(tex.body, 0.48, 0.65, { living: true });
    this.syncOutlineShadow(this.shadow, this.body);
    this.healthBar = new Health(this, { offsetY: -this.shape.radius - 40 });
    this.container = this.game.add.container(this.shape.x, this.shape.y, [this.shadow, this.body]);
    return this.container;
  }

  updateRotation() {
    if (!this.body) return;
    super.updateRotation();
    this.syncOutlineShadow(this.shadow, this.body);
  }
}

export default BunnyMob;
