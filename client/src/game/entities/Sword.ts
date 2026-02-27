import { random } from '../../helpers';
import { BaseEntity } from './BaseEntity';
import * as cosmetics from '../cosmetics.json';
const {skins} = cosmetics;

class Sword extends BaseEntity {
  static stateFields = [...BaseEntity.stateFields, 'size', 'isFlying', 'abilityActive', 'skin', 'skinName', 'pullbackParticles']

  body!: Phaser.GameObjects.Sprite;
  shadow!: Phaser.GameObjects.Sprite;

  static shadowOffsetX = 10;
  static shadowOffsetY = 10;

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
    this.body = this.game.add.sprite(0, 0, this.skinName).setOrigin(-0.2, 0.5);
    const shadowKey = this.createShadowTexture(this.skinName);
    this.shadow = this.game.add.sprite(Sword.shadowOffsetX, Sword.shadowOffsetY, shadowKey).setOrigin(-0.2, 0.5);
    this.shadow.setAlpha(0.075);
    this.container = this.game.add.container(this.shape.x, this.shape.y, [this.shadow, this.body]);
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
      this.body.setTexture(this.skinName);
      if (this.shadow) {
        this.shadow.setTexture(this.createShadowTexture(this.skinName));
      }
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

  updateRotation() {
  }

  abilityParticlesLast: number = 0;
  pullbackParticlesLast: number = 0;

  addAbilityParticles() {
    const fps = this.game.game.loop.actualFps;
    if (fps < 5) return;
    const now = Date.now();
    if (now - this.abilityParticlesLast < 100) return;
    this.abilityParticlesLast = now;

    const width = this.body.displayWidth;
    const height = this.body.displayHeight;
    const particles = this.game.add.particles(
      this.container.x - width * this.body.originX + random(-width, width) / 2,
      this.container.y - height * this.body.originY + random(-height, height) / 2,
      'starParticle',
      { scale: 0.05, speed: 200, maxParticles: 1 },
    );
    particles.setDepth(45);
    particles.once('complete', () => particles.destroy());
  }

  addPullbackParticles() {
    const fps = this.game.game.loop.actualFps;
    if (fps < 5) return;
    const now = Date.now();
    if (now - this.pullbackParticlesLast < 100) return;
    this.pullbackParticlesLast = now;

    const width = this.body.displayWidth;
    const height = this.body.displayHeight;
    const particles = this.game.add.particles(
      this.container.x - (width * this.body.originX + random(-width, width)) / 4,
      this.container.y - (height * this.body.originY + random(-height, height)) / 4,
      'arrowParticle',
      { scale: 0.05,
        speed: 100,
        maxParticles: 1,
        rotate: {
          onEmit: () => {
              return Phaser.Math.FloatBetween(0, 360); // Random rotation in degrees
          }
      },},
    );
    particles.setDepth(45);
    particles.once('complete', () => particles.destroy());
  }

  update(dt: number) {
    super.update(dt);
    this.container.setRotation(0);

    const scale = (this.size * 3) / this.body.width;
    this.body.setScale(scale);
    this.shadow.setScale(scale);
    this.container.setVisible(this.isFlying);
    const rotation = this.shape.angle - Math.PI / 4;
    this.body.setRotation(rotation);
    this.shadow.setRotation(rotation);

    if (this.isFlying && this.abilityActive) {
      this.addAbilityParticles();
    }
    if (this.isFlying && this.pullbackParticles) {
      this.addPullbackParticles();
    }
  }
}

export default Sword;

