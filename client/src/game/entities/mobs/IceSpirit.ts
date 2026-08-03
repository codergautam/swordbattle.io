import { BaseEntity } from '../BaseEntity';
import { Health } from '../../components/Health';

const spiritSkins: Record<number, { body: string, shadow: string }> = {
  0: { body: 'iceSpirit',  shadow: 'iceSpiritShadow' },
  1: { body: 'fireSpirit', shadow: 'fireSpiritShadow' },
};

class IceSpiritMob extends BaseEntity {
  static stateFields = [...BaseEntity.stateFields, 'angle', 'isAngry', 'skin'];
  static basicAngle = -Math.PI / 2;
  static removeTransition = 500;

  body!: Phaser.GameObjects.Sprite;
  shadow!: Phaser.GameObjects.Sprite;

  private pickTextures(): { body: string, shadow: string } {
    const idx = (this.skin as number) || 0;
    const t = spiritSkins[idx] || spiritSkins[0];
    return {
      body: this.game.textures.exists(t.body) ? t.body : 'iceSpirit',
      shadow: this.game.textures.exists(t.shadow) ? t.shadow : 'iceSpiritShadow',
    };
  }

  createSprite() {
    this.body = this.game.add.sprite(0, 0, '').setOrigin(0.48, 0.6);
    this.updateSprite();
    this.shadow = this.createOutlineShadow(this.body.texture.key, 0.48, 0.6, { living: true });
    this.syncOutlineShadow(this.shadow, this.body);
    this.healthBar = new Health(this, { offsetY: -this.shape.radius - 40 });
    this.container = this.game.add.container(this.shape.x, this.shape.y, [this.shadow, this.body]);
    return this.container;
  }

  afterStateUpdate(data: any): void {
    if (data.isAngry !== undefined || data.skin !== undefined) {
      this.updateSprite();
    }
  }

  updateSprite() {
    if (!this.body) return;

    const tex = this.pickTextures();
    this.body.setTexture(tex.body);
    const scale = (this.shape.radius * 6) / this.body.height;
    this.body.setScale(scale);
    this.refreshBodyShadow(this.shadow, this.body);
  }

  updateRotation() {
    if (!this.body) return;
    super.updateRotation();
    this.syncOutlineShadow(this.shadow, this.body);
  }
}

export default IceSpiritMob;
