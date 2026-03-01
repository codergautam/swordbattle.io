import HudComponent from './HudComponent';
import ChatInput from '../../ui/game/ChatInput';
import { InputTypes } from '../Types';

class Chat extends HudComponent {
  input!: Phaser.GameObjects.DOMElement;
  isOpen = false;
  sendButton: Phaser.GameObjects.DOMElement;
  isDisabled = false;
  disabledNotice: Phaser.GameObjects.DOMElement | null = null;
  lastNoticeTime = 0;

  initialize() {
    this.input = this.hud.scene.add.dom(0, 0, ChatInput.input)
      .setOrigin(0.5, 1)
      .setAlpha(0);
    this.sendButton = this.hud.scene.add.dom(0, 0, ChatInput.sendButton).setAlpha(0);
    this.sendButton.y = -this.input.height-10;

    this.sendButton.addListener('click');
    this.sendButton.on('click', () => {
      this.toggle();
    });

    this.game.input.keyboard?.on('keydown-ENTER', () => {
      if(this.game.gameState.self.entity?.following) this.toggle();
    });
    this.game.input.keyboard?.on('keydown-ESC', () => {
      if (this.isOpen) this.toggle(false);
    });

    this.container = this.hud.scene.add.container(0, 0, [this.input, this.sendButton]);
    this.hud.add(this.container);
  }

  /* Disable chat (called when CrazyGames disableChat setting is true) */
  disable() {
    this.isDisabled = true;
    if (this.isOpen) {
      this.toggle(false);
    }
    // Hide chat UI
    this.container.setVisible(false);
    console.log('[Chat] Chat has been disabled by CrazyGames settings');
  }

  /* Enable chat */
  enable() {
    this.isDisabled = false;
    this.container.setVisible(true);
    console.log('[Chat] Chat has been enabled');
  }

  showDisabledNotice() {
    const now = Date.now();
    if (now - this.lastNoticeTime < 3000) return;
    this.lastNoticeTime = now;

    const el = document.createElement('div');
    el.innerText = 'Chat is currently disabled. Go to the main menu to enable it in settings!';
    el.style.cssText = 'background:rgba(0,0,0,0.85);color:#ff9900;font-size:18px;font-family:Franklin Gothic Medium,Arial,sans-serif;padding:10px 20px;border-radius:8px;border:2px solid #ff9900;white-space:nowrap;pointer-events:none;';

    const dom = this.hud.scene.add.dom(
      this.game.scale.width / 2,
      this.game.scale.height / 2.75,
      el
    ).setOrigin(0.5, 0.5).setAlpha(0);
    this.hud.add(dom);

    this.game.tweens.add({
      targets: dom,
      alpha: 1,
      duration: 200,
      onComplete: () => {
        this.game.tweens.add({
          targets: dom,
          alpha: 0,
          delay: 2000,
          duration: 500,
          onComplete: () => dom.destroy(),
        });
      },
    });
  }

  toggle(send = true) {
    // Don't allow toggling if chat is disabled
    if (this.isDisabled) {
      this.showDisabledNotice();
      return;
    }

    const input = this.input.node as HTMLInputElement;
    if (this.isOpen) {
      const message = input.value;
      if (message.length !== 0 && send) {
        this.game.gameState.chatMessage = message;
      }
      input.value = '';
      this.game.controls.enableAllKeys();
    } else {
      this.game.controls.disableKeys([InputTypes.SwordSwing, InputTypes.SwordThrow, InputTypes.Ability]);
    }

    this.isOpen = !this.isOpen;

    this.game.tweens.add({
      targets: [this.input, this.sendButton],
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
