import Player from './Player';

const textures: Record<number, { body: string; sword: string }> = {
  1: { body: 'realZombieBody', sword: 'realZombieSword' },
  2: { body: 'nightlurkerBody', sword: 'nightlurkerSword' },
  3: { body: 'bonedragonBody', sword: 'bonedragonSword' },
};

export default class Zombie extends Player {
  protected usesDedicatedEventTextures = true;

  createSprite() {
    const container = super.createSprite();
    const texture = textures[this.skin] || textures[1];
    this.bodyScale = 1;
    this.body.setTexture(texture.body);
    this.shadow.setTexture(this.createShadowTexture(texture.body));
    this.sword.setTexture(texture.sword);
    this.swordShadow.setTexture(this.createShadowTexture(texture.sword));
    return container;
  }
}
