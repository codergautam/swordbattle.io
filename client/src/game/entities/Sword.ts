import { random } from '../../helpers';
import { BaseEntity } from './BaseEntity';
import * as cosmetics from '../cosmetics.json';
const {skins} = cosmetics;

class Sword extends BaseEntity {
  static stateFields = [...BaseEntity.stateFields, 'size', 'isFlying', 'abilityActive', 'skin', 'skinName']

  createSprite() {
    if(this.skin) {
      const skinObj = Object.values(skins).find(skin => skin.id === this.skin)
      this.skinName = (skinObj?.name ?? 'player')+ 'Sword';
      if(!this.game.textures.exists(this.skinName)) {
        if(skinObj?.swordFileName) this.dynamicLoadSword(skinObj as {swordFileName: string}, this.skinName+'');
        this.skinName = 'playerSword';
      }
    } else {
      this.skinName = 'playerSword';
    }
    this.container = this.game.add.sprite(this.shape.x, this.shape.y, this.skinName)
      .setOrigin(-0.2, 0.5);
    return this.container;
  }

  dynamicLoadSword(skinObj:{swordFileName: string}, skinName: string) {
    return new Promise<void>((resolve, reject) => {
      if(this.game.gameState.failedSkinLoads[this.skin]) return resolve();

    const publicPath = process.env.PUBLIC_URL as string;
    const basePath =  `${publicPath}/assets/game/player/${skinObj.swordFileName}`;
    this.game.load.image(skinName, basePath);

    this.game.load.once(Phaser.Loader.Events.COMPLETE, () => {
      this.skinName = skinName;
      this.container.setTexture(this.skinName);
      resolve();
    });
    this.game.load.once(Phaser.Loader.Events.FILE_LOAD_ERROR, () => {
      // texture didnt load so use the placeholder
      this.game.gameState.failedSkinLoads[this.skin] = true;
      resolve();
    });

    this.game.load.start();

    });

  }

  addAbilityParticles() {
    const fps = this.game.game.loop.actualFps;
    if (fps < 5) return;

    const width = this.container.displayWidth;
    const height = this.container.displayHeight;
    const particles = this.game.add.particles(
      this.container.x - width * this.container.originX + random(-width, width) / 2,
      this.container.y - height * this.container.originY + random(-height, height) / 2,
      'starParticle',
      { scale: 0.05, speed: 200, maxParticles: 1 },
    );
    particles.setDepth(45);
  }

  update(dt: number) {
    super.update(dt);

    this.container.scale = (this.size * 3) / this.container.width;
    this.container.setVisible(this.isFlying);
    this.container.setRotation(this.shape.angle - Math.PI / 4);

    if (this.isFlying && this.abilityActive) {
      this.addAbilityParticles();
    }
  }
}

export default Sword;
