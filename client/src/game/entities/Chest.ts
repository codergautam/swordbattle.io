import { BaseEntity } from './BaseEntity';
import { Health } from '../components/Health';

class Chest extends BaseEntity {
  static stateFields = [...BaseEntity.stateFields, 'size', 'rarity'];
  static removeTransition = 250;

  sprite: Phaser.GameObjects.Sprite | null = null;
  shadow: Phaser.GameObjects.Sprite | null = null;
  private shadowBaseX = 0;
  private shadowBaseY = 0;
  private hitTween: Phaser.Tweens.Tween | null = null;
  private lastHealth: number | undefined = undefined;

  createSprite() {
    let texture = 'chest' + (this.rarity + 1);
    this.sprite = this.game.add.sprite(0, 0, texture).setOrigin(0);
    this.shadow = this.createOutlineShadow(texture, 0.5, 0.5);
    this.shadow.setScale(BaseEntity.shadow.scaleMul);
    this.shadowBaseX = this.sprite.width / 2;
    this.shadowBaseY = this.sprite.height / 2 + this.sprite.height * BaseEntity.shadow.shiftRatio;
    this.shadow.setPosition(this.shadowBaseX, this.shadowBaseY);
    const tier = (this.rarity as number) + 1;
    this.healthBar = new Health(this, {
      hideWhenFull: false,
      width: this.sprite.width,
      height: this.sprite.width / 17.6,
      offsetX: this.sprite.width / 2,
      offsetY: -30,
      alwaysHide: this.rarity === 0,
      tierLabel: this.rarity === 0 ? null : `Tier ${tier} Chest`,
    });

    this.container = this.game.add.container(this.shape.x, this.shape.y, [this.shadow, this.sprite])
      .setScale(this.size / this.sprite.width);

    return this.container;
  }

  afterStateUpdate(data: any) {
    if (data.healthPercent !== undefined) {
      if (this.lastHealth !== undefined && data.healthPercent < this.lastHealth - 0.0001) {
        this.playHitAnim();
      }
      this.lastHealth = data.healthPercent;
    }
  }

  private playHitAnim() {
    if (!this.sprite) return;
    if (this.hitTween) {
      this.hitTween.stop();
      this.hitTween = null;
    }
    this.sprite.x = 0;
    this.sprite.y = 0;
    const baseScale = this.container ? this.container.scale : 1;
    const amp = Math.min(8, 4 / Math.max(1, baseScale * 0.5));
    const self = this.game.gameState?.self?.entity as any;
    let angle: number;
    if (self && self.container) {
      angle = Math.atan2(this.container.y - self.container.y, this.container.x - self.container.x);
    } else {
      angle = Math.random() * Math.PI * 2;
    }
    const localAngle = angle - (this.container?.rotation || 0);
    this.hitTween = this.game.tweens.add({
      targets: this.sprite,
      x: Math.cos(localAngle) * amp,
      y: Math.sin(localAngle) * amp,
      duration: 70,
      yoyo: true,
      ease: 'Sine.easeOut',
      onUpdate: () => {
        if (this.shadow && this.sprite) {
          this.shadow.setPosition(this.shadowBaseX + this.sprite.x, this.shadowBaseY + this.sprite.y);
        }
      },
      onComplete: () => {
        if (this.sprite) { this.sprite.x = 0; this.sprite.y = 0; }
        if (this.shadow) this.shadow.setPosition(this.shadowBaseX, this.shadowBaseY);
        this.hitTween = null;
      },
    });
  }

  remove() {
    if (this.hitTween) {
      this.hitTween.stop();
      this.hitTween = null;
    }
    if (this.sprite && this.game.tweens) {
      this.game.tweens.killTweensOf(this.sprite);
    }
    super.remove();
  }
}

export default Chest;
