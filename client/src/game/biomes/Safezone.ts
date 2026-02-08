import Biome from './Biome';

class Safezone extends Biome {
  zIndex = -1;

  static createTexture(scene: Phaser.Scene) {
    const size = 64;
    const texture = scene.textures.createCanvas('safezone', size, size);
    const ctx = texture!.getContext();
    ctx.fillStyle = '#999999'; // Winter: 1d572e or 297941
    ctx.fillRect(0, 0, size, size);
    texture!.refresh();
  }
}

export default Safezone;
