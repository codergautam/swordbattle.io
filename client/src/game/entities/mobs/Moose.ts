import { BaseEntity } from '../BaseEntity';
import { Health } from '../../components/Health';

const mooseSkins: Record<number, { passive: string, angry: string, shadow: string }> = {
  0: { passive: 'moose',         angry: 'moose',         shadow: 'mooseShadow' },
  1: { passive: 'camelPassive',  angry: 'camelAngry',    shadow: 'camelShadow' },
};

class MooseMob extends BaseEntity {
  static stateFields = [...BaseEntity.stateFields, 'angle', 'isAngry', 'skin'];
  static basicAngle = -Math.PI / 2;
  static removeTransition = 500;

  body!: Phaser.GameObjects.Sprite;
  shadow!: Phaser.GameObjects.Sprite;

  private skinSet() {
    const idx = (this.skin as number) || 0;
    return mooseSkins[idx] || mooseSkins[0];
  }

  private pickBody(): string {
    const set = this.skinSet();
    const wanted = this.isAngry ? set.angry : set.passive;
    if (this.game.textures.exists(wanted)) return wanted;
    if (this.game.textures.exists(set.passive)) return set.passive;
    return 'moose';
  }

  createSprite() {
    this.body = this.game.add.sprite(0, 0, this.pickBody()).setOrigin(0.5, 0.5);
    const scale = (this.shape.radius * 5) / this.body.height;
    this.body.setScale(scale);
    this.shadow = this.createOutlineShadow(this.body.texture.key, 0.5, 0.5, { living: true });
    this.syncOutlineShadow(this.shadow, this.body);
    this.healthBar = new Health(this, { offsetY: -this.shape.radius - 40 });
    this.container = this.game.add.container(this.shape.x, this.shape.y, [this.shadow, this.body]);
    return this.container;
  }

  afterStateUpdate(data: any): void {
    if (!this.body) return;
    if (data.isAngry !== undefined || data.skin !== undefined) {
      this.body.setTexture(this.pickBody());
      const scale = (this.shape.radius * 5) / this.body.height;
      this.body.setScale(scale);
      this.refreshBodyShadow(this.shadow, this.body);
    }
  }

  updateRotation() {
    if (!this.body) return;
    super.updateRotation();
    this.syncOutlineShadow(this.shadow, this.body);
  }
}

export default MooseMob;
