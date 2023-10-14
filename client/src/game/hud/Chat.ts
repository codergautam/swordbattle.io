import Game from '../scenes/Game';
import ChatInput from '../../ui/game/ChatInput';
import HUD from './HUD';

class Chat {
  hud: HUD;
  game: Game;
  container!: Phaser.GameObjects.DOMElement;
  hidden = true;

  constructor(hud: HUD) {
    this.hud = hud;
    this.game = hud.game;
  }

  initialize() {
    this.container = this.hud.scene.add.dom(0, 0, ChatInput)
      .setOrigin(0.5, 1)
      .setAlpha(0);

    this.game.input.keyboard?.on('keydown-ENTER', () => this.toggle());
    this.hud.add(this.container);
  }

  toggle() {
    this.hidden = !this.hidden;

    const input = this.container.node as HTMLInputElement;
    if (this.hidden) {
      const message = input.value;
      if (message.length !== 0) {
        this.game.gameState.chatMessage = message;
      }
      input.value = '';
    }

    this.game.tweens.add({
      targets: this.container,
      alpha: this.hidden ? 0 : 1,
      duration: 200,
      onUpdate: (tween: Phaser.Tweens.Tween) => {
        if (tween.progress > 0) {
          if (!this.hidden) input.focus();
          else input.blur();
        }
      }
    })
  }

  resize() {
    this.container.setPosition(this.game.scale.width / 2, this.game.scale.height / 2 - 105);
  }

  update() {}
}

export default Chat;
