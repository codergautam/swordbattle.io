import { BaseEntity } from '../BaseEntity';
import { TreeShake, shake, ShakeConfig } from '../../effects/TreeShake';

const variantTextures: Record<number, string> = {
  1: 'bush',
  2: 'bushPine',
  3: 'bushPalm',
  4: 'bushMeadow',
  5: 'bushCactus',
  6: 'bushSavannaPalm',
};

const rotatingVariants = new Set<number>([3, 6]);

function shakePreset(skin: number): ShakeConfig {
  switch (skin) {
    case 2: return shake.pine;
    case 3: return shake.palm;
    case 5: return shake.stick;
    case 6: return shake.sav;
    default: return shake.leaf;
  }
}

class Bush extends BaseEntity {
  static stateFields = [...BaseEntity.stateFields, 'skin', 'angle'];
  private shake?: TreeShake;

  private variantKey(): string {
    const idx = (this.skin as number) || 1;
    const wanted = variantTextures[idx] || variantTextures[1];
    return this.game.textures.exists(wanted) ? wanted : 'bush';
  }

  createSprite() {
    if (this.container) {
      return this.container;
    }

    const key = this.variantKey();
    const skin = (this.skin as number) || 1;
    const isRotating = rotatingVariants.has(skin);

    const body = this.game.add.sprite(0, 0, key).setOrigin(0.5, 0.5);
    body.setScale((this.shape.radius * 2 * 1.5) / body.width);
    if (isRotating && typeof this.angle === 'number') body.setRotation(this.angle);

    const shadow = this.createOutlineShadow(key, 0.5, 0.5);
    this.syncOutlineShadow(shadow, body);

    this.container = this.game.add.container(this.shape.x, this.shape.y, [shadow, body]);
    this.shake = new TreeShake(this, body, shadow, shakePreset(skin));
    return this.container;
  }

  updateWorldDepth() {}

  updateRotation() {}

  update(dt: number) {
    super.update(dt);
    this.shake?.update(dt);
  }
}

export default Bush;
