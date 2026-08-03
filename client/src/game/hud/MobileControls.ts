import HudComponent from './HudComponent';
import { InputTypes } from '../Types';
import { Controls } from '../Controls';

export default class MobileControls extends HudComponent {
  chatButton?: Phaser.GameObjects.Sprite;
  abilityButton!: Phaser.GameObjects.Sprite;
  abilityCooldown!: Phaser.GameObjects.Text;
  abilityCharges!: Phaser.GameObjects.Text;
  abilityButtonContainer!: Phaser.GameObjects.Container;
  swordThrowButton?: Phaser.GameObjects.Sprite;

  initialize() {
    this.container = this.game.add.container(0, 0);

    this.abilityCooldown = this.hud.scene.add.text(0, 0, '', {
      fontSize: 30,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);
    this.abilityButton = this.hud.scene.add.sprite(0, 0, 'abilityButton')
      .setInteractive()
      .on('pointerdown', () => this.game.controls.inputDown(InputTypes.Ability))
      .on('pointerup', () => this.game.controls.inputUp(InputTypes.Ability));

    this.abilityCharges = this.hud.scene.add.text(0, 0, '', {
      fontSize: 26,
      fontStyle: 'bold',
      color: '#ffe38a',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setPosition(42, -42);

    this.abilityButtonContainer = this.hud.scene.add.container(0, 0, [this.abilityButton, this.abilityCooldown, this.abilityCharges]);

    this.container.add(this.abilityButtonContainer);

    if (this.game.isMobile) {
      this.chatButton = this.hud.scene.add.sprite(0, 0, 'chatButton')
        .setInteractive()
        .on('pointerdown', () => this.hud.chat.toggle(true));

      this.swordThrowButton = this.hud.scene.add.sprite(0, 0, 'swordThrowButton')
        .setInteractive()
        .on('pointerdown', () => this.game.controls.armThrow());

      this.container.add([this.chatButton, this.swordThrowButton]);
    }
    this.hud.add(this.container);
  }

  update() {
    const self = this.game.gameState.self.entity;
    if (!self) return;

    this.abilityButtonContainer.setVisible(self.isAbilityAvailable);
    if (!self.isAbilityAvailable) return;

    const isCooldown = self.abilityCooldown !== 0;
    const isActivated = self.abilityActive;

    const charges = (self as any).abilityCharges;
    const hasCharges = typeof charges === 'number' && charges >= 0;
    const noCastleDash = hasCharges && charges === 0;
    this.abilityButton.setAlpha((isActivated || isCooldown || noCastleDash) ? 0.5 : 1);

    const text = isCooldown ? self.abilityCooldown.toFixed(1)
      : (isActivated ? self.abilityDuration.toFixed(1) : '');
    this.abilityCooldown.text = text;

    if (hasCharges) {
      this.abilityCharges.setText(String(charges)).setVisible(true);
    } else {
      this.abilityCharges.setVisible(false);
    }
  }

  setShow(show: boolean, force?: boolean): void {
    super.setShow(show, force);
    this.game.controls.joystick?.setVisible(show);
    this.game.controls.aimJoystick?.setVisible(show);
    this.game.controls.aimIcon?.setVisible(show);
    if (!show) this.game.controls.setThrowArmed(false);
  }

  setScale(scale: number): void {
    this.scale = scale;

    if (this.game.isMobile) {
      const mul = Controls.stickMul(this.game.scale.height > this.game.scale.width);
      const joystick = this.game.controls.joystick;
      joystick?.thumb?.setScale(this.scale * mul);
      joystick?.base?.setScale(this.scale * mul);
      const aimJoystick = this.game.controls.aimJoystick;
      aimJoystick?.thumb?.setScale(this.scale * mul);
      aimJoystick?.base?.setScale(this.scale * mul);
      this.game.controls.refreshAimIcon();

      const targetPx = 100 * scale;
      if (this.chatButton) {
        this.chatButton.setScale(targetPx / ((this.chatButton.texture as any).width || 100));
      }
      if (this.abilityButton) {
        this.abilityButtonContainer.setScale(targetPx / ((this.abilityButton.texture as any).width || 100));
      }
      if (this.swordThrowButton) {
        this.swordThrowButton.setScale(targetPx / ((this.swordThrowButton.texture as any).width || 100));
      }
    } else {
      this.abilityButtonContainer?.setScale(scale);
    }

    this.resize();
  }

  resize() {
    const w = this.game.scale.width;
    const h = this.game.scale.height;
    const s = this.scale;

    if (!this.game.isMobile) {
      this.abilityButtonContainer?.setPosition(175 * s, h * 0.825);
      return;
    }

    const joystick = this.game.controls.joystick;
    const aimJoystick = this.game.controls.aimJoystick;
    const isPortrait = h > w;

    let stickX: number, stickY: number;
    if (isPortrait) {
      stickX = 165 * s;
      stickY = h - 290 * s;
    } else {
      stickX = 210 * s;
      stickY = h - 200 * s;
    }
    this.game.controls.setMoveRest?.(stickX, stickY);
    aimJoystick?.setPosition(w - stickX, stickY);
    this.game.controls.aimIcon?.setPosition(w - stickX, stickY);

    const off = (isPortrait ? 116 : 128) * s;
    this.swordThrowButton?.setPosition(w - stickX - off, stickY - off);
    this.abilityButtonContainer?.setPosition(w - stickX - off, stickY + off);
    this.chatButton?.setPosition(80 * s, isPortrait ? h - 160 * s : h - 60 * s);
  }
}
