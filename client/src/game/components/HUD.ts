import Game from '../scenes/Game';
import Minimap from './Minimap';
import Stats from './Stats';

class HUD {
  game: Game;
  scene: Phaser.Scene | null = null;
  minimap: Minimap;
  stats: Stats;
  
  constructor(game: Game) {
    this.game = game;
    this.minimap = new Minimap(this);
    this.stats = new Stats(this);
  }

  initialize() {
    this.scene = this.game.scene.add('HUD', {}, true) as Phaser.Scene;
    this.minimap.initialize();
    this.stats.initalize();
  }

  add(container: any) {
    if (!this.scene) return;
    this.scene.add.existing(container);
  }

  update() {
    this.minimap.update();
    this.stats.update();
  }

  resize() {
    this.minimap.resize();
    this.stats.resize();
  }
}

export default HUD;
