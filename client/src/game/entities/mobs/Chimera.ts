import { BaseEntity } from '../BaseEntity';
import { Health } from '../../components/Health';

class Chimera extends BaseEntity {
  static stateFields = [
    ...BaseEntity.stateFields,
    'angle',
    'isAngry',
    'altitude',
    'state',
    'isFlying',
  ];
  static basicAngle = -Math.PI / 2;
  static removeTransition = 500;
  static shadowOffsetX = 20;
  static shadowOffsetY = 20;
  static maxAltitude = 120;

  body!: Phaser.GameObjects.Sprite;
  shadow!: Phaser.GameObjects.Sprite;

  altitude: number = 0;

  get baseScale() {
    return (this.shape.radius * 6) / this.body.height;
  }

  createSprite() {
    this.body = this.game.add
      .sprite(0, 0, 'chimera')
      .setOrigin(0.5, 0.5);

    const initialScale = this.baseScale;
    this.body.setScale(initialScale);

    this.shadow = this.game.add
      .sprite(
        Chimera.shadowOffsetX,
        Chimera.shadowOffsetY,
        'chimeraShadow'
      )
      .setOrigin(0.5, 0.5);

    this.shadow.setScale(initialScale);
    this.shadow.setAlpha(0.15);

    this.healthBar = new Health(this, {
      offsetY: -this.shape.radius - 300,
    });

    this.container = this.game.add.container(this.shape.x, this.shape.y, [
      this.shadow,
      this.body,
    ]);

    return this.container;
  }

  updateAltitudeVisual() {
    if (!this.container || !this.shadow || !this.body) return;

    this.container.x = this.shape.x;
    this.container.y = this.shape.y - this.altitude;

    const t = Phaser.Math.Clamp(
      this.altitude / Chimera.maxAltitude,
      0,
      1
    );

    const baseScale = this.baseScale;

    const bodyScale = baseScale * (1 * t);
    this.body.setScale(bodyScale);

    const shadowScale = baseScale * (1 + 1.1 * t);
    const shadowAlpha = 0.18 - 0.08 * t;

    this.shadow.setScale(shadowScale);
    this.shadow.setAlpha(Phaser.Math.Clamp(shadowAlpha, 0.06, 0.18));
  }

  afterStateUpdate(data: any): void {
    if (data.altitude !== undefined) {
      this.altitude = data.altitude;
      this.updateAltitudeVisual();
    }
  }

  updateRotation() {
    if (!this.body) return;
    super.updateRotation();
    if (this.shadow) {
      this.shadow.setRotation(this.body.rotation);
    }
  }
}

export default Chimera;
