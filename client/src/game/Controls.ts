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
  private _swingPointerId = -1;
  private _swingStartTime = 0;
  private _holdThrowTriggered = false;

  constructor(game: Game) {
    this.game = game;
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
      // Generate simple cartoony joystick textures (gray with black outline)
      const gfx = this.game.add.graphics();

      const baseRadius = 110;
      const baseSize = baseRadius * 2 + 4;
      gfx.fillStyle(0x3a3a3a, 0.5);
      gfx.fillCircle(baseSize / 2, baseSize / 2, baseRadius);
      gfx.lineStyle(5, 0x111111, 0.8);
      gfx.strokeCircle(baseSize / 2, baseSize / 2, baseRadius);
      gfx.generateTexture('joystickBase', baseSize, baseSize);

      const thumbRadius = 40;
      const thumbSize = thumbRadius * 2 + 4;
      gfx.clear();
      gfx.fillStyle(0x888888, 0.9);
      gfx.fillCircle(thumbSize / 2, thumbSize / 2, thumbRadius);
      gfx.fillStyle(0xaaaaaa, 0.3);
      gfx.fillCircle(thumbSize / 2 - 6, thumbSize / 2 - 6, thumbRadius * 0.45);
      gfx.lineStyle(4, 0x111111, 0.9);
      gfx.strokeCircle(thumbSize / 2, thumbSize / 2, thumbRadius);
      gfx.generateTexture('joystickThumb', thumbSize, thumbSize);
      gfx.destroy();

      const base = this.game.hud.scene.add.image(0, 0, 'joystickBase');
      const thumb = this.game.hud.scene.add.image(0, 0, 'joystickThumb');

      // @ts-ignore
      this.joystick = this.game.plugins.get('rexVirtualJoystick')?.add(this.game.hud.scene, {
        radius: 130,
        base,
        thumb,
      }) as VirtualJoyStick;

      // Disable the plugin's built-in input — we handle touch manually
      // to prevent it from hijacking button/UI touches
      this.joystick.setEnable(false);

      // Manual joystick touch handling: only accept touches in the bottom-left zone
      this.game.hud.scene.input.on('pointerdown', (pointer: any) => {
        if (this.joystickPointer) return;
        if (pointer.x > this.game.scale.width * 0.45) return;
        if (pointer.y < this.game.scale.height * 0.4) return;
        this.joystickPointer = pointer;
      });
      this.game.hud.scene.input.on('pointerup', (pointer: any) => {
        if (this.joystickPointer?.id === pointer.id) {
          this.joystickPointer = null;
        }
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

      if (this.game.isMobile) {
        // Don't swing when tapping on UI elements — use position-based checks
        const w = this.game.scale.width;
        const h = this.game.scale.height;
        const s = this.game.hud.scale;

        // Joystick zone (bottom-left)
        if (pointer.x < w * 0.4 && pointer.y > h * 0.5) return;

        // Button zones — check against actual button positions
        const mc = this.game.hud.mobileControls;
        const near = (obj: any, r: number) => {
          if (!obj) return false;
          const dx = pointer.x - obj.x;
          const dy = pointer.y - obj.y;
          return dx * dx + dy * dy < r * r;
        };
        if (near(mc.swordThrowButton, 100 * s)) return;
        if (near(mc.abilityButtonContainer, 120 * s)) return;
        if (near(mc.chatButton, 80 * s)) return;
      }

      if (pointer.leftButtonDown()) {
        this.inputDown(InputTypes.SwordSwing);
        if (this.game.isMobile) {
          this._swingPointerId = pointer.id;
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
      if (this.game.isMobile) {
        // Only release swing for the specific pointer that started it
        if (pointer.id === this._swingPointerId) {
          this.inputUp(InputTypes.SwordSwing);
          this._swingPointerId = -1;
        }
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
      const baseX = this.joystick.base?.x ?? 0;
      const baseY = this.joystick.base?.y ?? 0;
      const radius = 130 * (this.game.hud?.scale || 1);

      if (this.joystickPointer?.isDown) {
        const dx = this.joystickPointer.x - baseX;
        const dy = this.joystickPointer.y - baseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const clampedDist = Math.min(dist, radius);
        const angle = Math.atan2(dy, dx);

        // Move thumb (clamped to radius)
        if (this.joystick.thumb) {
          this.joystick.thumb.x = baseX + Math.cos(angle) * clampedDist;
          this.joystick.thumb.y = baseY + Math.sin(angle) * clampedDist;
        }

        if (dist > 15) {
          this.mouse.angle = angle;
          this.mouse.force += (clampedDist - this.mouse.force) * 0.3;
        } else {
          this.mouse.force = 0;
        }
      } else {
        // Ease thumb back to center when released
        if (this.joystick.thumb) {
          this.joystick.thumb.x += (baseX - this.joystick.thumb.x) * 0.3;
          this.joystick.thumb.y += (baseY - this.joystick.thumb.y) * 0.3;
        }
        this.mouse.force *= 0.7;
        if (this.mouse.force < 1) this.mouse.force = 0;
      }

      // Hold-to-throw: holding swing for 1s auto-throws in current direction
      if (this.isInputDown(InputTypes.SwordSwing) && !this._holdThrowTriggered && this._swingPointerId >= 0) {
        if (Date.now() - this._swingStartTime >= 1000) {
          this._holdThrowTriggered = true;
          // Keep swing active, add throw on top — release both after delay
          this.inputDown(InputTypes.SwordThrow);
          setTimeout(() => {
            this._swingPointerId = -1;
            this.inputUp(InputTypes.SwordThrow);
            this.inputUp(InputTypes.SwordSwing);
          }, 250);
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
    // Remove all Phaser input listeners to prevent stacking on game restart.
    // Without this, each restart adds duplicate keyboard/pointer listeners.
    const { input } = this.game;
    input.keyboard?.removeAllListeners();
    input.removeAllListeners();
    if (this.game.hud?.scene?.input) {
      this.game.hud.scene.input.removeAllListeners();
    }
  }
}
