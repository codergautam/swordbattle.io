import { BaseEntity } from "../BaseEntity";
import { Health } from "../../components/Health";

class WolfMob extends BaseEntity {
  static stateFields = [...BaseEntity.stateFields, "angle", "isAngry"];
  static basicAngle = -Math.PI / 2;
  static removeTransition = 500;

  body!: Phaser.GameObjects.Sprite;

  get baseScale() {
    return (this.shape.radius * 3) / this.body.width;
  }

  createSprite() {
    this.body = this.game.add
      .sprite(0, 0, "wolfMobPassive")
      .setOrigin(0.5, 0.5);
    this.healthBar = new Health(this, {
      offsetY: -this.shape.radius * 1.3,
      width: this.shape.radius * 3,
      height: this.shape.radius / 5,
    });
    this.container = this.game.add
      .container(this.shape.x, this.shape.y, [this.body])
      .setScale(this.baseScale);
    return this.container;
  }

  afterStateUpdate(data: any): void {
    if (data.isAngry !== undefined) {
      this.updateSprite();
    }
  }

  updateSprite() {
    if (!this.body) return;

    const texture = this.isAngry ? "wolfMobAggressive" : "wolfMobPassive";
    this.body
      .setTexture(texture)
      .setScale((this.shape.radius * 6) / this.body.height);
  }
}

export default WolfMob;
