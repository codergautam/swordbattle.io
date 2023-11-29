import VirtualJoyStick from 'phaser3-rex-plugins/plugins/virtualjoystick';
import { InputTypes } from './Types';
import Game from './scenes/Game';

interface Mouse {
  angle: number;
  force: number;
}

export class Controls {
  game: Game;
  downInputs: InputTypes[] = [];
  previousDownInputs: InputTypes[] = [];
  mouse: Mouse = { angle: 0, force: 0 };
  disabled = true;

  joystick: any = null;
  joystickPointer: Phaser.Input.Pointer | null = null;

  constructor(game: Game) {
    this.game = game;
  }

  static inputKeybinds: Record<any, any> = {
    [InputTypes.Up]: ['W', 'UP'],
    [InputTypes.Left]: ['A', 'LEFT'],
    [InputTypes.Down]: ['S', 'DOWN'],
    [InputTypes.Right]: ['D', 'RIGHT'],
    [InputTypes.Ability]: ['G'],
    [InputTypes.SwordThrow]: ['C'],
    [InputTypes.SwordSwing]: ['SPACE'],
  };

  initialize() {
    const { game: { input } } = this;
    if (this.game.isMobile) {
      // @ts-ignore
      this.joystick = this.game.plugins.get('rexVirtualJoystick')?.add(this.game.hud.scene, {
        radius: 130,
      }) as VirtualJoyStick;
      this.joystick.on('pointerdown', (pointer: any) => {
        this.joystickPointer = pointer;
      });
      this.joystick.on('pointerup', () => {
        this.joystickPointer = null;
      })
      input.addPointer(2);
    }

    for (const inputType in Controls.inputKeybinds) {
      for (const key of Controls.inputKeybinds[inputType]) {
        input.keyboard?.on(`keydown-${key}`, () => this.inputDown(Number(inputType) as InputTypes));
        input.keyboard?.on(`keyup-${key}`, () => this.inputUp(Number(inputType) as InputTypes));
      }
    }

    input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      pointer.event.preventDefault();
      if (pointer.leftButtonDown()) {
        this.inputDown(InputTypes.SwordSwing);
      }
      if (pointer.rightButtonDown()) {
        this.inputDown(InputTypes.SwordThrow);
      }
    });
    input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      pointer.event.preventDefault();
      if (pointer.leftButtonReleased()) {
        this.inputUp(InputTypes.SwordSwing);
      }
      if (pointer.rightButtonReleased()) {
        this.inputUp(InputTypes.SwordThrow);
      }
    });

    window.addEventListener('blur', () => this.clear());
  }

  update() {
    if (this.disabled) return;

    if (this.joystick) {
      this.mouse.angle = this.joystick.angle * (Math.PI / 180);
      this.mouse.force = this.joystick.force;
    } else {
      const { activePointer } = this.game.input;
      const mousePos = {
        x: activePointer.x - this.game.scale.width / 2,
        y: activePointer.y - this.game.scale.height / 2,
      };
      const angle = Math.atan2(mousePos.y, mousePos.x);
      const force = Math.sqrt(mousePos.x ** 2 + mousePos.y ** 2);
      this.mouse.angle = angle;
      this.mouse.force = force;
    }
    // Round to 2 decimal places
    this.mouse.angle = Math.round(this.mouse.angle * 100) / 100;
  }

  enable() {
    this.disabled = false;
  }

  disable() {
    this.disabled = true;
  }

  isInputDown(inputType: InputTypes) {
    return this.downInputs.includes(inputType);
  }

  isInputUp(inputType: InputTypes) {
    return !this.isInputDown(inputType);
  }

  inputDown(inputType: InputTypes) {
    if (this.isInputDown(inputType) || this.disabled) {
      return;
    }
    this.downInputs.push(inputType);
  }

  inputUp(inputType: InputTypes) {
    if (this.isInputUp(inputType) || this.disabled) {
      return;
    }
    this.downInputs.splice(this.downInputs.indexOf(inputType), 1);
  }

  getChanges() {
    const difference: any = [];

    const newlyDown = this.downInputs.filter(i => this.previousDownInputs.indexOf(i) < 0);
    newlyDown.forEach(input => {
      difference.push({
        inputType: input,
        inputDown: true,
      });
    });

    const newlyUp = this.previousDownInputs.filter(i => this.downInputs.indexOf(i) < 0);
    newlyUp.forEach(input => {
      difference.push({
        inputType: input,
        inputDown: false,
      });
    });
    this.previousDownInputs = this.downInputs.slice();
    return difference;
  }

  clear() {
    this.downInputs = [];
  }
}
