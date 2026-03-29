import Game from '../scenes/Game';
import Minimap from './Minimap';
import Stats from './Stats';
import ProgressBar from './ProgressBar';
import EvolutionSelect from './EvolutionSelect';
import CardSelect from './CardSelect';
import CardSummary from './CardSummary';
import UpgradeButton from './UpgradeButton';
import Chat from './Chat';
import MobileControls from './MobileControls';
import CoinCounter from './CoinCounter';
import TutorialOverlay from './TutorialOverlay';
import { Settings } from '../Settings';

class HUD {
  game: Game;
  scene!: Phaser.Scene;
  minimap: Minimap;
  stats: Stats;
  progressBar: ProgressBar;
  evolutionSelect: EvolutionSelect;
  cardSelect: CardSelect;
  cardSummary: CardSummary;
  upgradeButton: UpgradeButton;
  chat: Chat;
  mobileControls: MobileControls;
  coinCounter: CoinCounter;
  tutorialOverlay: TutorialOverlay;
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
    this.cardSelect = new CardSelect(this);
    this.cardSummary = new CardSummary(this);
    this.upgradeButton = new UpgradeButton(this);
    this.chat = new Chat(this);
    this.mobileControls = new MobileControls(this);
    this.coinCounter = new CoinCounter(this);
    this.tutorialOverlay = new TutorialOverlay(this);
    this.components = [this.minimap, this.stats, this.progressBar, this.evolutionSelect, this.cardSelect, this.cardSummary, this.upgradeButton, this.chat, this.mobileControls, this.coinCounter, this.tutorialOverlay];
  }

  initialize() {
    this.scene = this.game.scene.add('HUD', {}, true) as Phaser.Scene;
    this.components.forEach(component => component.initialize());

    this.applyCrazyGamesSettings();

    this._chatSettingHandler = (e: Event) => {
      const enabled = (e as CustomEvent).detail.enabled;
      let cgDisabled = false;
      try { cgDisabled = (window as any).CrazyGames?.SDK?.game?.settings?.disableChat === true; } catch (e) {}
      if (cgDisabled || !enabled) {
        this.chat.disable(cgDisabled);
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
    let cgDisabled = false;
    try {
      cgDisabled = (window as any).CrazyGames?.SDK?.game?.settings?.disableChat === true;
    } catch (error) {
      console.error('[HUD] Error applying settings:', error);
    }

    if (cgDisabled || !Settings.enableChat) {
      console.log('[HUD] Disabling chat - CG disableChat:', cgDisabled, 'user enableChat:', Settings.enableChat);
      this.chat.disable(cgDisabled);
    } else {
      console.log('[HUD] Chat enabled');
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

  showAnnouncement(text: string, color = '#f5c842', duration = 4000) {
    if (!this.scene) return;
    const { width, height } = this.game.scale;
    const announcementText = this.scene.add.text(width / 2, height * 0.2, text, {
      fontSize: `${Math.round(22 * this.scale)}px`,
      fontFamily: 'Ubuntu, sans-serif',
      color,
      stroke: '#000000',
      strokeThickness: 4,
      align: 'center',
    }).setOrigin(0.5).setDepth(90).setAlpha(0);

    this.scene.tweens.add({
      targets: announcementText,
      alpha: { from: 0, to: 1 },
      duration: 400,
      ease: 'Power2',
      onComplete: () => {
        this.scene.time.delayedCall(duration, () => {
          this.scene.tweens.add({
            targets: announcementText,
            alpha: 0,
            duration: 800,
            ease: 'Power2',
            onComplete: () => announcementText.destroy(),
          });
        });
      },
    });
  }

  cleanup() {
    if (this._chatSettingHandler) {
      window.removeEventListener('chatSettingChanged', this._chatSettingHandler);
      this._chatSettingHandler = null;
    }
  }
}

export default HUD;
