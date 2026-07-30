import HudComponent from './HudComponent';
import { createChatOverlay, ChatOverlay } from '../../ui/game/ChatInput';
import { InputTypes } from '../Types';

class Chat extends HudComponent {
  ui!: ChatOverlay;
  isOpen = false;
  isDisabled = false;
  isPlatformDisabled = false;
  lastNoticeTime = 0;

  private onKey: ((e: KeyboardEvent) => void) | null = null;

  initialize() {
    this.ui = createChatOverlay();
    document.querySelectorAll('.sb-chat').forEach((el) => el.remove());
    document.body.appendChild(this.ui.root);

    this.onKey = (e: KeyboardEvent) => {
      if (!this.isOpen) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        this.close(true);
      } else if (e.key === 'Escape' || e.key === 'Delete') {
        e.preventDefault();
        e.stopPropagation();
        this.close(false);
      } else {
        e.stopPropagation();
      }
    };
    this.ui.input.addEventListener('keydown', this.onKey);

    this.ui.sendBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); this.close(true); });
    this.ui.cancelBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); this.close(false); });

    this.game.input.keyboard?.on('keydown-ENTER', () => {
      if (this.isOpen) return;
      if (this.game.gameState.self.entity?.following) this.open();
    });
    this.game.input.keyboard?.on('keydown-ESC', () => {
      if (this.isOpen) this.close(false);
    });

    this.container = this.hud.scene.add.container(0, 0, []);
    this.hud.add(this.container);
  }

  disable(platformForced = false) {
    this.isDisabled = true;
    this.isPlatformDisabled = platformForced;
    if (this.isOpen) this.close(false);
    this.ui.root.style.display = 'none';
    console.log('[Chat] Chat has been disabled', platformForced ? '(by platform)' : '(by user setting)');
  }

  enable() {
    this.isDisabled = false;
    this.isPlatformDisabled = false;
    this.ui.root.style.display = '';
    console.log('[Chat] Chat has been enabled');
  }

  showDisabledNotice() {
    const now = Date.now();
    if (now - this.lastNoticeTime < 3000) return;
    this.lastNoticeTime = now;
    this.hud?.showAnnouncement?.(
      'Chat is disabled. Enable it in settings from the main menu!', '#ff9900', 2000, 0.36, true,
    );
  }

  setShow(show: boolean, force?: boolean) {
    if (this.isDisabled && show) return;
    super.setShow(show, force);
    if (!show && this.isOpen) this.close(false);
  }

  open() {
    if (this.isDisabled) {
      if (!this.isPlatformDisabled) this.showDisabledNotice();
      return;
    }
    if (this.isOpen) return;
    this.isOpen = true;
    this.ui.root.classList.add('open');
    this.game.controls.disableKeys([InputTypes.SwordSwing, InputTypes.SwordThrow, InputTypes.Ability]);
    this.game.controls.setThrowArmed?.(false);
    this.ui.input.focus();
    try { this.ui.input.setSelectionRange(this.ui.input.value.length, this.ui.input.value.length); } catch (e) { }
  }

  close(send: boolean) {
    if (!this.isOpen) return;
    this.isOpen = false;
    const input = this.ui.input;
    const message = input.value.trim();
    if (send && message.length !== 0) this.game.gameState.chatMessage = message;
    input.value = '';
    input.blur();
    this.ui.root.classList.remove('open');
    this.game.controls.enableAllKeys();
  }

  toggle(send = true) {
    if (this.isOpen) this.close(send);
    else this.open();
  }

  destroy() {
    if (this.onKey) this.ui?.input.removeEventListener('keydown', this.onKey);
    this.onKey = null;
    try { this.ui?.root.remove(); } catch (e) { }
  }

  resize() { }
}

export default Chat;
