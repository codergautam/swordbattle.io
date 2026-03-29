import { BaseEntity } from './BaseEntity';
import { Settings } from '../Settings';
import * as cosmetics from '../cosmetics.json';
const { skins } = cosmetics;

class ThrownSword extends BaseEntity {
  static stateFields = [...BaseEntity.stateFields, 'size', 'angle', 'skin']

  body!: Phaser.GameObjects.Sprite;
  shadow!: Phaser.GameObjects.Sprite;

  static shadowOffsetX = 10;
  static shadowOffsetY = 10;

  createSprite() {
    let skinName = 'playerSword';
    if (this.skin && !Settings.unloadSkins) {
      const skinObj = Object.values(skins).find((s: any) => s.id === this.skin);
      const name = ((skinObj as any)?.name ?? 'player') + 'Sword';
      if (this.game.textures.exists(name)) {
        skinName = name;
      }
    }

    this.body = this.game.add.sprite(0, 0, skinName).setOrigin(-0.2, 0.5);
    const shadowKey = this.createShadowTexture(skinName);
    this.shadow = this.game.add.sprite(ThrownSword.shadowOffsetX, ThrownSword.shadowOffsetY, shadowKey).setOrigin(-0.2, 0.5);
    this.shadow.setAlpha(0.075);

    const x = this.shape ? this.shape.x : 0;
    const y = this.shape ? this.shape.y : 0;
    this.container = this.game.add.container(x, y, [this.shadow, this.body]);
    return this.container;
  }

  updateRotation() {}

  update(dt: number) {
    super.update(dt);
    if (!this.container || !this.body) return;

    this.container.setRotation(0);

    const scale = ((this.size || 50) * 3) / this.body.width;
    this.body.setScale(scale);
    this.shadow.setScale(scale);

    const rotation = (this.angle || 0) + Math.PI / 4;
    this.body.setRotation(rotation);
    this.shadow.setRotation(rotation);
  }
}

export default ThrownSword;
