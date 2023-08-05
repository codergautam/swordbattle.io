import Game from '../scenes/Game';
import Level from './Level';
import Minimap from './Minimap';
import Stats from './Stats';

class HUD {
  game: Game;
  scene: Phaser.Scene | null = null;
  minimap: Minimap;
  stats: Stats;
  level: Level;
  
  constructor(game: Game) {
    this.game = game;
    this.minimap = new Minimap(this);
    this.stats = new Stats(this);
    this.level = new Level(this);
  }

  initialize() {
    this.scene = this.game.scene.add('HUD', {}, true) as Phaser.Scene;
    this.minimap.initialize();
    this.stats.initialize();
    this.level.initialize();
  }

  add(container: any) {
    if (!this.scene) return;
    this.scene.add.existing(container);
  }

  update() {
    this.minimap.update();
    this.stats.update();
    this.level.update();
  }

  resize() {
    this.minimap.resize();
    this.stats.resize();
    this.level.resize();
  }
}

export default HUD;
