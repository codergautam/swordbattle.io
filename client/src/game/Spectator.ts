import Game from './scenes/Game';

interface SpectatorData {
  x?: number;
  y?: number;
}

export class Spectator {
  game: Game;
  active = false;
  initialized = false;
  zoom = 0.5;

  constructor(game: Game) {
    this.game = game;
  }

  follow(data: SpectatorData) {
    const camera = this.game.cameras.main;
    if (data.x !== undefined || data.y !== undefined) {
      const x = data.x !== undefined ? data.x : camera.centerX;
      const y = data.y !== undefined ? data.y : camera.centerY;
      if (this.initialized) {
        camera.pan(x, y, 10000, Phaser.Math.Easing.Linear, true);
      } else {
        camera.centerOn(0, 0);
        camera.pan(x, y, 4000, Phaser.Math.Easing.Linear, true);
      }
      this.initialized = true;
    }
  }

  update(dt: number) {
    if (!this.active) return;
  }

  enable() {
    this.active = true;
    this.game.updateZoom(this.zoom, 2500);
    this.game.hud.setShow(false);
    this.game.controls.disable();
  }

  disable() {
    this.active = false;
    this.game.hud.setShow(true, false);
    this.game.controls.enable();
  }
}
