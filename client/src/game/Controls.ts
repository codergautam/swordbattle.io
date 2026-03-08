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
  disabledKeys: Set<number> = new Set();
  private _blurHandler: (() => void) | null = null;
  private _consumedPointers = new Set<number>();
  private _swingStartTime = 0;
  private _holdThrowTriggered = false;

  constructor(game: Game) {
    this.game = game;
  }

  consumePointer(pointerId: number) {
    this._consumedPointers.add(pointerId);
  }

  static inputKeybinds: Record<any, any> = {
    [InputTypes.Up]: ['W', 'UP'],
    [InputTypes.Left]: ['A', 'LEFT'],
    [InputTypes.Down]: ['S', 'DOWN'],
    [InputTypes.Right]: ['D', 'RIGHT'],
    [InputTypes.Ability]: ['G', 'Q'],
    [InputTypes.SwordThrow]: ['C', 'E', 'SHIFT'],
    [InputTypes.SwordSwing]: ['SPACE'],
  };

  initialize() {
    const { game: { input } } = this;
    if (this.game.isMobile) {
      const gfx = this.game.add.graphics();

      const baseRadius = 110;
      const baseSize = baseRadius * 2 + 4;
      gfx.fillStyle(0x111122, 0.35);
      gfx.fillCircle(baseSize / 2, baseSize / 2, baseRadius);
      gfx.lineStyle(3, 0xc8a84e, 0.5);
      gfx.strokeCircle(baseSize / 2, baseSize / 2, baseRadius);
      gfx.lineStyle(2, 0xc8a84e, 0.15);
      gfx.lineBetween(baseSize / 2, 20, baseSize / 2, baseSize - 20);
      gfx.lineBetween(20, baseSize / 2, baseSize - 20, baseSize / 2);
      const ad = baseRadius - 15;
      const as = 8;
      gfx.fillStyle(0xc8a84e, 0.25);
      gfx.fillTriangle(baseSize / 2, baseSize / 2 - ad, baseSize / 2 - as, baseSize / 2 - ad + as * 1.5, baseSize / 2 + as, baseSize / 2 - ad + as * 1.5);
      gfx.fillTriangle(baseSize / 2, baseSize / 2 + ad, baseSize / 2 - as, baseSize / 2 + ad - as * 1.5, baseSize / 2 + as, baseSize / 2 + ad - as * 1.5);
      gfx.fillTriangle(baseSize / 2 + ad, baseSize / 2, baseSize / 2 + ad - as * 1.5, baseSize / 2 - as, baseSize / 2 + ad - as * 1.5, baseSize / 2 + as);
      gfx.fillTriangle(baseSize / 2 - ad, baseSize / 2, baseSize / 2 - ad + as * 1.5, baseSize / 2 - as, baseSize / 2 - ad + as * 1.5, baseSize / 2 + as);
      gfx.generateTexture('joystickBase', baseSize, baseSize);

      const thumbRadius = 38;
      const thumbSize = thumbRadius * 2 + 4;
      gfx.clear();
      gfx.fillStyle(0x00cccc, 0.2);
      gfx.fillCircle(thumbSize / 2, thumbSize / 2, thumbRadius);
      gfx.fillStyle(0x00aacc, 0.65);
      gfx.fillCircle(thumbSize / 2, thumbSize / 2, thumbRadius - 5);
      gfx.fillStyle(0x00ddee, 0.85);
      gfx.fillCircle(thumbSize / 2, thumbSize / 2, thumbRadius - 14);
      gfx.lineStyle(2.5, 0xc8a84e, 0.6);
      gfx.strokeCircle(thumbSize / 2, thumbSize / 2, thumbRadius - 5);
      gfx.generateTexture('joystickThumb', thumbSize, thumbSize);
      gfx.destroy();

      const base = this.game.hud.scene.add.image(0, 0, 'joystickBase');
      const thumb = this.game.hud.scene.add.image(0, 0, 'joystickThumb');

      // @ts-ignore
      this.joystick = this.game.plugins.get('rexVirtualJoystick')?.add(this.game.hud.scene, {
        radius: 130,
        base,
        thumb,
        forceMin: 15,
      }) as VirtualJoyStick;

      try {
        const origPointerDown = this.joystick.onPointerDown;
        if (origPointerDown) {
          this.game.hud.scene.input.off('pointerdown', origPointerDown, this.joystick);
          this.game.hud.scene.input.on('pointerdown', (pointer: any) => {
            if (pointer.x > this.game.scale.width * 0.45) return;
            if (this._consumedPointers.has(pointer.id)) return;
            origPointerDown.call(this.joystick, pointer);
          });
        }
      } catch (e) {}

      this.joystick.on('pointerdown', (pointer: any) => {
        this.joystickPointer = pointer;
        this._consumedPointers.add(pointer.id);
      });
      this.joystick.on('pointerup', () => {
        if (this.joystickPointer) {
          this._consumedPointers.delete(this.joystickPointer.id);
        }
        this.joystickPointer = null;
      });
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
      if (this._consumedPointers.has(pointer.id)) return;
      if (pointer.leftButtonDown()) {
        this.inputDown(InputTypes.SwordSwing);
        if (this.game.isMobile) {
          this._swingStartTime = Date.now();
          this._holdThrowTriggered = false;
        }
      }
      if (pointer.rightButtonDown()) {
        this.inputDown(InputTypes.SwordThrow);
      }
    });
    input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      pointer.event.preventDefault();
      if (this._consumedPointers.has(pointer.id)) {
        this._consumedPointers.delete(pointer.id);
        return;
      }
      this.inputUp(InputTypes.SwordSwing);
      this.inputUp(InputTypes.SwordThrow);
    });


    this._blurHandler = () => this.clear();
    window.addEventListener('blur', this._blurHandler);
    this.disabledKeys = new Set();
  }

  update() {
    if (this.disabled) return;

    if (this.joystick) {
      const rawAngle = this.joystick.angle * (Math.PI / 180);
      const rawForce = this.joystick.force;

      if (rawForce > 0) {
        this.mouse.angle = rawAngle;
        this.mouse.force += (rawForce - this.mouse.force) * 0.3;
      } else {
        this.mouse.force *= 0.7;
        if (this.mouse.force < 1) this.mouse.force = 0;
      }

      if (this.isInputDown(InputTypes.SwordSwing) && !this._holdThrowTriggered) {
        if (Date.now() - this._swingStartTime >= 1000) {
          this._holdThrowTriggered = true;
          this.inputUp(InputTypes.SwordSwing);
          this.inputDown(InputTypes.SwordThrow);
          setTimeout(() => this.inputUp(InputTypes.SwordThrow), 150);
        }
      }
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

    // Normalize
    if (this.mouse.angle <= 0) {
      this.mouse.angle += Math.PI * 2;
    }
  }

  enable() {
    this.disabled = false;
  }

  disable() {
    this.disabled = true;
  }

  disableKeys(keys: number[], append = false) {
    if (!append) this.disabledKeys.clear();
    for (const key of keys) this.disabledKeys.add(key);
  }

  enableKeys(keys: number[]) {
    for (const key of keys) this.disabledKeys.delete(key);
  }

  enableAllKeys() {
    this.disabledKeys.clear();
  }

  isInputDown(inputType: InputTypes) {
    return this.downInputs.includes(inputType);
  }

  isInputUp(inputType: InputTypes) {
    return !this.isInputDown(inputType);
  }

  inputDown(inputType: InputTypes) {
    if (this.isInputDown(inputType) || this.disabled || this.disabledKeys.has(inputType)) {
      return;
    }
    this.downInputs.push(inputType);
  }

  inputUp(inputType: InputTypes) {
    if (this.isInputUp(inputType) || this.disabled || this.disabledKeys.has(inputType)) {
      return;
    }
    this.downInputs.splice(this.downInputs.indexOf(inputType), 1);
  }

  getChanges() {
    const difference: any = [];
    const prevSet = new Set(this.previousDownInputs);
    const currSet = new Set(this.downInputs);

    for (const input of this.downInputs) {
      if (!prevSet.has(input)) {
        difference.push({ inputType: input, inputDown: true });
      }
    }
    for (const input of this.previousDownInputs) {
      if (!currSet.has(input)) {
        difference.push({ inputType: input, inputDown: false });
      }
    }
    this.previousDownInputs = this.downInputs.slice();
    return difference;
  }

  clear() {
    this.downInputs = [];
  }

  cleanup() {
    if (this._blurHandler) {
      window.removeEventListener('blur', this._blurHandler);
      this._blurHandler = null;
    }
  }
}
