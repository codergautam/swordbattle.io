import Game from '../scenes/Game';
import HUD from './HUD';

class HudComponent {
  hud: HUD;
  game: Game;
  container!: Phaser.GameObjects.Container | Phaser.GameObjects.DOMElement;
  scale = 1;
  hidden = false;

  constructor(hud: HUD) {
    this.hud = hud;
    this.game = hud.game;
  }

  setScale(scale: number) {
    this.scale = scale;
    this.container.setScale(scale);
    this.resize();
  }

  setShow(show: boolean, force = true) {
    this.hidden = show;

    const alpha = show ? 1 : 0;
    if (force) {
      this.container?.setAlpha(alpha);
    } else {
      this.game.add.tween({
        targets: this.container,
        alpha,
        duration: 1000,
      });
    }
  }

  initialize() {}

  resize() {}

  update(dt: number) {}
}

export default HudComponent;
