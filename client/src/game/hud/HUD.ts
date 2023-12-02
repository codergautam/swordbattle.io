import Game from '../scenes/Game';
import Minimap from './Minimap';
import Stats from './Stats';
import ProgressBar from './ProgressBar';
import EvolutionSelect from './EvolutionSelect';
import BuffsSelect from './BuffsSelect';
import Chat from './Chat';
import MobileControls from './MobileControls';
import CoinCounter from './CoinCounter';

class HUD {
  game: Game;
  scene!: Phaser.Scene;
  minimap: Minimap;
  stats: Stats;
  progressBar: ProgressBar;
  evolutionSelect: EvolutionSelect;
  buffsSelect: BuffsSelect;
  chat: Chat;
  mobileControls: MobileControls;
  coinCounter: CoinCounter;
  components: any[];
  scale = 1;
  hidden = false;

  constructor(game: Game) {
    this.game = game;
    this.minimap = new Minimap(this);
    this.stats = new Stats(this);
    this.progressBar = new ProgressBar(this);
    this.evolutionSelect = new EvolutionSelect(this);
    this.buffsSelect = new BuffsSelect(this);
    this.chat = new Chat(this);
    this.mobileControls = new MobileControls(this);
    this.coinCounter = new CoinCounter(this);
    this.components = [this.minimap, this.stats, this.progressBar, this.evolutionSelect, this.buffsSelect, this.chat, this.mobileControls, this.coinCounter];
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

  setShow(show: boolean, force?: boolean) {
    this.components.forEach(component => component.setShow(show, force));
  }

  resize() {
    this.scale = Math.max(this.game.scale.width, this.game.scale.height) / 1400;
    this.components.forEach(component => component.setScale(this.scale));
  }
}

export default HUD;
