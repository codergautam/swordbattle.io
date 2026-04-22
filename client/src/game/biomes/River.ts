import Biome, { riverFlowDrift, riverBottomDrift } from './Biome';

class River extends Biome {
  zIndex = -2;
  private topLayer: Phaser.GameObjects.TileSprite | null = null;

  protected tileDrift() {
    return riverBottomDrift(this.scene);
  }

  createSprite() {
    const result = super.createSprite();
    if (!this.maskGraphics) return result;

    const sharedMask = (this.container && (this.container as any).mask)
      || new Phaser.Display.Masks.GeometryMask(this.scene, this.maskGraphics);

    this.topLayer = this.scene.add.tileSprite(0, 0, 0, 0, 'riverTop')
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(this.zIndex + 0.04)
      .setAlpha(0.62)
      .setMask(sharedMask);

    this.resize();
    return result;
  }

  resize() {
    super.resize();
    const camera = this.scene.cameras.main;
    const l = this.topLayer;
    if (l) {
      l.setSize(camera.width, camera.height);
      l.setPosition(camera.width / 2, camera.height / 2);
    }
  }

  update() {
    super.update();
    const camera = this.scene.cameras.main;
    const inView = this.shape.isInViewport(camera);
    const l = this.topLayer;
    if (!l) return;
    l.setVisible(inView);
    if (!inView) return;
    const drift = riverFlowDrift(this.scene);
    l.setSize(camera.width, camera.height);
    l.setPosition(camera.width / 2, camera.height / 2);
    l.setDisplaySize(camera.displayWidth, camera.displayHeight);
    l.setTileScale(camera.zoom * this.tileScale);
    l.setTilePosition(
      (camera.scrollX - camera.displayWidth / 2) / this.tileScale + drift.x,
      (camera.scrollY - camera.displayHeight / 2) / this.tileScale + drift.y);
  }

  destroy() {
    if (this.topLayer) {
      this.topLayer.clearMask(false);
      this.topLayer.destroy();
      this.topLayer = null;
    }
    super.destroy();
  }
}

export default River;
