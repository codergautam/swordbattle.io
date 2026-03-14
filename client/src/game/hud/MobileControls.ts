import HudComponent from './HudComponent';
import { InputTypes } from '../Types';

export default class MobileControls extends HudComponent {
  chatButton?: Phaser.GameObjects.Sprite;
  abilityButton!: Phaser.GameObjects.Sprite;
  abilityCooldown!: Phaser.GameObjects.Text;
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

    this.abilityButtonContainer = this.hud.scene.add.container(0, 0, [this.abilityButton, this.abilityCooldown]);

    this.container.add(this.abilityButtonContainer);

    if (this.game.isMobile) {
      this.chatButton = this.hud.scene.add.sprite(0, 0, 'chatButton')
        .setInteractive()
        .on('pointerdown', () => this.hud.chat.toggle(true));

      this.swordThrowButton = this.hud.scene.add.sprite(0, 0, 'swordThrowButton')
        .setInteractive()
        .on('pointerdown', () => this.game.controls.inputDown(InputTypes.SwordThrow))
        .on('pointerup', () => this.game.controls.inputUp(InputTypes.SwordThrow));

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
    this.abilityButton.setAlpha((isActivated || isCooldown) ? 0.5 : 1);

    const text = isCooldown ? self.abilityCooldown.toFixed(1)
      : (isActivated ? self.abilityDuration.toFixed(1) : '');
    this.abilityCooldown.text = text;
  }

  setShow(show: boolean, force?: boolean): void {
    super.setShow(show, force);
    this.game.controls.joystick?.setVisible(show);
  }

  setScale(scale: number): void {
    this.scale = scale;

    const joystick = this.game.controls.joystick;
    joystick?.thumb?.setScale(this.scale);
    joystick?.base?.setScale(this.scale);

    const targetPx = 100 * scale;
    if (this.swordThrowButton) {
      this.swordThrowButton.setScale(targetPx / this.swordThrowButton.texture.getSourceImage().width);
    }
    if (this.abilityButton) {
      this.abilityButtonContainer.setScale(targetPx / this.abilityButton.texture.getSourceImage().width);
    }
    if (this.chatButton) {
      this.chatButton.setScale(targetPx / this.chatButton.texture.getSourceImage().width);
    }

    this.resize();
  }

  resize() {
    const joystick = this.game.controls.joystick;
    const w = this.game.scale.width;
    const h = this.game.scale.height;
    const s = this.scale;
    const isPortrait = h > w;

    joystick?.setPosition(150 * s, h / 1.5);

    const spacing = 135 * s;
    const startX = 80 * s;

    if (isPortrait) {
      // Portrait: row above progress bar, left-aligned
      const btnY = h - 160 * s;
      this.swordThrowButton?.setPosition(startX, btnY);
      this.abilityButtonContainer?.setPosition(startX + spacing, btnY);
      this.chatButton?.setPosition(startX + spacing * 2, btnY);
    } else {
      // Landscape: bottom-left with padding
      const btnY = h - 60 * s;
      this.swordThrowButton?.setPosition(startX, btnY);
      this.abilityButtonContainer?.setPosition(startX + spacing, btnY);
      this.chatButton?.setPosition(startX + spacing * 2, btnY);
    }
  }
}
