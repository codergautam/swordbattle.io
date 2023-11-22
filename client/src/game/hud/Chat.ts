import HudComponent from './HudComponent';
import ChatInput from '../../ui/game/ChatInput';

class Chat extends HudComponent {
  input!: Phaser.GameObjects.DOMElement;
  isOpen = false;

  initialize() {
    this.input = this.hud.scene.add.dom(0, 0, ChatInput)
      .setOrigin(0.5, 1)
      .setAlpha(0);

    this.game.input.keyboard?.on('keydown-ENTER', () => this.toggle());
    this.game.input.keyboard?.on('keydown-ESC', () => {
      if (this.isOpen) this.toggle(false);
    });

    this.container = this.hud.scene.add.container(0, 0, [this.input]);
    this.hud.add(this.container);
  }

  toggle(send = true) {
    const input = this.input.node as HTMLInputElement;
    if (this.isOpen) {
      const message = input.value;
      if (message.length !== 0 && send) {
        this.game.gameState.chatMessage = message;
      }
      input.value = '';
      this.game.controls.enable();
    } else {
      this.game.controls.disable();
    }

    this.isOpen = !this.isOpen;

    this.game.tweens.add({
      targets: this.input,
      alpha: this.isOpen ? 1 : 0,
      duration: 100,
      onUpdate: (tween: Phaser.Tweens.Tween) => {
        if (tween.progress > 0) {
          if (this.isOpen) input.focus();
          else input.blur();
        }
      }
    });
  }

  resize() {
    this.container.setPosition(
      this.game.scale.width / 2,
      this.game.scale.height / 2 - 105 * this.scale,
    );
  }
}

export default Chat;
