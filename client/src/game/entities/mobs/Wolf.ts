import { BaseEntity } from '../BaseEntity';
import { Health } from '../../components/Health';

const wolfSkins: Record<number, { passive: string, aggressive: string, shadow: string }> = {
  0: { passive: 'wolfMobPassive', aggressive: 'wolfMobAggressive', shadow: 'wolfShadow' },
  1: { passive: 'scorpion',       aggressive: 'scorpionAngry',     shadow: 'scorpionShadow' },
};

class WolfMob extends BaseEntity {
  static stateFields = [...BaseEntity.stateFields, 'angle', 'isAngry', 'skin'];
  static basicAngle = -Math.PI / 2;
  static removeTransition = 500;

  body!: Phaser.GameObjects.Sprite;
  shadow!: Phaser.GameObjects.Sprite;

  private skinSet() {
    const idx = (this.skin as number) || 0;
    return wolfSkins[idx] || wolfSkins[0];
  }

  createSprite() {
    this.body = this.game.add.sprite(0, 0, '').setOrigin(0.48, 0.52);
    const seed = this.game.textures.exists(this.skinSet().passive) ? this.skinSet().passive : 'wolfMobPassive';
    this.shadow = this.createOutlineShadow(seed, 0.48, 0.52, { living: true });
    this.updateSprite();
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

    const set = this.skinSet();
    const wantedAngry = set.aggressive;
    const wantedPassive = set.passive;
    let texture: string;
    if (this.isAngry && this.game.textures.exists(wantedAngry)) {
      texture = wantedAngry;
    } else if (this.game.textures.exists(wantedPassive)) {
      texture = wantedPassive;
    } else {
      texture = this.isAngry ? 'wolfMobAggressive' : 'wolfMobPassive';
    }
    this.body.setTexture(texture);
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

export default WolfMob;
