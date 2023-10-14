import { BaseEntity } from '../BaseEntity';

class House1 extends BaseEntity {
  static stateFields = [...BaseEntity.stateFields, 'width', 'height'];

  houseSprite: Phaser.GameObjects.Sprite | null = null;
  roofSprite: Phaser.GameObjects.Sprite | null = null;
  roofTransparent: boolean = false;

  createSprite() {
    this.houseSprite = this.game.physics.add.sprite(0, 0, 'house1');
    this.houseSprite.setOrigin(0);
    this.houseSprite.setDepth(9);

    this.roofSprite = this.game.physics.add.sprite(0, 0, 'house1roof');
    this.roofSprite.setOrigin(0);
    this.roofSprite.setDepth(11);
    this.game.physics.world.enableBody(this.roofSprite);

    this.houseSprite.x = this.roofSprite.x = this.shape.x;
    this.houseSprite.y = this.roofSprite.y = this.shape.y;
    this.houseSprite.displayWidth = this.roofSprite.displayWidth = this.width;
    this.houseSprite.displayHeight = this.roofSprite.displayHeight = this.height;
  }

  update() {
    const players = this.game.gameState.getPlayers();

    let roofTransparent = false;
    for (const player of players) {
      let isInBuilding = false;
      this.game.physics.collide(player.container, this.roofSprite as any, () => {
        const isSelf = player.id === this.game.gameState.self.id;
        isInBuilding = true;
        if (isSelf) roofTransparent = true;
      });
      player.isInBuilding = isInBuilding;
      player.buildingId = isInBuilding ? this.id : null;
    }

    if (roofTransparent !== this.roofTransparent) {
      this.game.tweens.add({
        targets: this.roofSprite,
        alpha: roofTransparent ? 0 : 1,
        duration: 500,
      });
      this.roofTransparent = roofTransparent;
    }
  }

  remove() {
    this.roofSprite?.destroy();
    this.houseSprite?.destroy();
  }
}

export default House1;
