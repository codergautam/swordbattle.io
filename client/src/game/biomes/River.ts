import Biome from './Biome';

class River extends Biome {
  zIndex = -2;

  static createTexture(scene: Phaser.Scene) {
    const size = 64;
    const texture = scene.textures.createCanvas('river', size, size);
    const ctx = texture!.getContext();
    ctx.fillStyle = '#4854a2';
    ctx.fillRect(0, 0, size, size);
    texture!.refresh();
  }
}

export default River;
