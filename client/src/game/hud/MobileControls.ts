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
    joystick?.setRadius(130 * this.scale);

    this.chatButton?.setScale(scale * 0.6);
    this.abilityButtonContainer?.setScale(scale);
    this.swordThrowButton?.setScale(scale * 0.5);

    this.resize();
  }

  resize() {
    const joystick = this.game.controls.joystick;

    joystick?.setPosition(150 * this.scale, this.game.scale.height / 1.5);
    this.chatButton?.setPosition(570 * this.chatButton.scaleX, 180 * this.chatButton.scaleY);
    this.abilityButtonContainer?.setPosition(350 * this.scale, this.game.scale.height - 150 * this.scale);
    this.swordThrowButton?.setPosition(this.game.scale.width - 380 * this.scale, this.game.scale.height - 150 * this.scale);
  }
}
