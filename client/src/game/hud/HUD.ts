import Game from '../scenes/Game';
import Minimap from './Minimap';
import Stats from './Stats';
import ProgressBar from './ProgressBar';
import EvolutionSelect from './EvolutionSelect';
import BuffsSelect from './BuffsSelect';
import Chat from './Chat';

class HUD {
  game: Game;
  scene!: Phaser.Scene;
  minimap: Minimap;
  stats: Stats;
  progressBar: ProgressBar;
  evolutionSelect: EvolutionSelect;
  buffsSelect: BuffsSelect;
  chat: Chat;
  components: any[];
  
  constructor(game: Game) {
    this.game = game;
    this.minimap = new Minimap(this);
    this.stats = new Stats(this);
    this.progressBar = new ProgressBar(this);
    this.evolutionSelect = new EvolutionSelect(this);
    this.buffsSelect = new BuffsSelect(this);
    this.chat = new Chat(this);
    this.components = [this.minimap, this.stats, this.progressBar, this.evolutionSelect, this.buffsSelect, this.chat];
  }

  initialize() {
    this.scene = this.game.scene.add('HUD', {}, true) as Phaser.Scene;
    this.components.forEach(component => component.initialize());
  }

  add(container: any) {
    if (!this.scene) return;
    this.scene.add.existing(container);
  }

  update(dt: number) {
    this.components.forEach(component => component.update(dt));
  }

  resize() {
    this.components.forEach(component => component.resize());
  }
}

export default HUD;
