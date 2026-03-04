import Game from '../scenes/Game';
import Minimap from './Minimap';
import Stats from './Stats';
import ProgressBar from './ProgressBar';
import EvolutionSelect from './EvolutionSelect';
import BuffsSelect from './BuffsSelect';
import Chat from './Chat';
import MobileControls from './MobileControls';
import CoinCounter from './CoinCounter';
import { Settings } from '../Settings';

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
  scale = 0.8;
  hidden = false;
  private _chatSettingHandler: ((e: Event) => void) | null = null;

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

    this.applyCrazyGamesSettings();

    this._chatSettingHandler = (e: Event) => {
      const enabled = (e as CustomEvent).detail.enabled;
      const cgDisabled = (window as any).CrazyGames?.SDK?.game?.settings?.disableChat === true;
      if (cgDisabled || !enabled) {
        this.chat.disable();
        for (const id in this.game.gameState.entities) {
          const entity = this.game.gameState.entities[id] as any;
          if (entity?.messageText) {
            entity.messageText.setAlpha(0);
            entity.messageText.text = '';
          }
        }
      } else {
        this.chat.enable();
      }
    };
    window.addEventListener('chatSettingChanged', this._chatSettingHandler);
  }

  applyCrazyGamesSettings() {
    try {
      const cgDisabled = (window as any).CrazyGames?.SDK?.game?.settings?.disableChat === true;

      if (cgDisabled || !Settings.enableChat) {
        console.log('[HUD] Disabling chat - CG disableChat:', cgDisabled, 'user enableChat:', Settings.enableChat);
        this.chat.disable();
      } else {
        console.log('[HUD] Chat enabled');
      }
    } catch (error) {
      console.error('[HUD] Error applying settings:', error);
    }
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

  cleanup() {
    if (this._chatSettingHandler) {
      window.removeEventListener('chatSettingChanged', this._chatSettingHandler);
      this._chatSettingHandler = null;
    }
  }
}

export default HUD;
