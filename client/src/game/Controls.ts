import VirtualJoyStick from './VirtualJoystick';
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
  aim: Mouse = { angle: 0, force: 0 };
  disabled = true;

  joystick: any = null;
  aimJoystick: any = null;
  joystickPointer: Phaser.Input.Pointer | null = null;
  disabledKeys: Set<number> = new Set();
  private _blurHandler: (() => void) | null = null;
  private _swingPointerId = -1;

  private _movePointer: any = null;
  private _moveId = -1;
  private _moveOrigin = { x: 0, y: 0 };
  private _moveRest = { x: 0, y: 0 };
  private _aimPointer: any = null;
  private _aimId = -1;
  private _aimOrigin = { x: 0, y: 0 };
  private _aimRest = { x: 0, y: 0 };
  static readonly STICK_RADIUS = 130;
  static stickMul(isPortrait: boolean): number { return isPortrait ? 0.85 : 1; }
  stickRadius(): number { return this._stickRadius(); }
  private _stickRadius(): number {
    const portrait = this.game.scale.height > this.game.scale.width;
    return Controls.STICK_RADIUS * Controls.stickMul(portrait) * (this.game.hud?.scale || 1);
  }
  private static readonly claimBox = 1.45;
  private static readonly holdHintMs = 5000;
  private static readonly aimActivateMs = 100;
  aimIcon: any = null;
  throwArmed = false;
  private _aimPressAt = 0;
  private _hintShown = false;
  private _pulses: Array<{ input: InputTypes; until: number; force: boolean }> = [];

  private _pulse(input: InputTypes, ms = 140, force = false): void {
    this.inputDown(input, force);
    this._pulses.push({ input, until: performance.now() + ms, force });
  }

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

  private _onHudButton(pointer: any): boolean {
    const hud: any = this.game.hud;
    const mc = hud && hud.mobileControls;
    if (!mc) return false;
    const s = hud.scale || 1;
    const near = (obj: any, r: number) => {
      if (!obj) return false;
      if (obj.visible === false) return false;
      const dx = pointer.x - obj.x;
      const dy = pointer.y - obj.y;
      return dx * dx + dy * dy < r * r;
    };
    return near(mc.swordThrowButton, 68 * s) || near(mc.abilityButtonContainer, 72 * s) || near(mc.chatButton, 68 * s);
  }

  initialize() {
    const { game: { input } } = this;
    if (this.game.isMobile) {
      const gfx = this.game.add.graphics();

      const baseRadius = 110;
      const baseSize = baseRadius * 2 + 8;
      const bc = baseSize / 2;

      gfx.fillStyle(0x122c47, 0.5);
      gfx.fillCircle(bc, bc, baseRadius);
      gfx.lineStyle(6, 0x5bc0ff, 0.9);
      gfx.strokeCircle(bc, bc, baseRadius);
      gfx.lineStyle(3, 0x9fe0ff, 0.25);
      gfx.strokeCircle(bc, bc, baseRadius * 0.66);
      gfx.fillStyle(0x9fe0ff, 0.5);
      {
        const a = baseRadius * 0.74, w = baseRadius * 0.17, h = baseRadius * 0.22;
        gfx.fillTriangle(bc, bc - a, bc - w, bc - a + h, bc + w, bc - a + h);
        gfx.fillTriangle(bc, bc + a, bc - w, bc + a - h, bc + w, bc + a - h);
        gfx.fillTriangle(bc - a, bc, bc - a + h, bc - w, bc - a + h, bc + w);
        gfx.fillTriangle(bc + a, bc, bc + a - h, bc - w, bc + a - h, bc + w);
      }
      gfx.generateTexture('joystickBase', baseSize, baseSize);

      gfx.clear();
      gfx.fillStyle(0x4a1414, 0.5);
      gfx.fillCircle(bc, bc, baseRadius);
      gfx.lineStyle(6, 0xff6b6b, 0.9);
      gfx.strokeCircle(bc, bc, baseRadius);
      gfx.lineStyle(3, 0xffb3b3, 0.25);
      gfx.strokeCircle(bc, bc, baseRadius * 0.66);
      gfx.generateTexture('joystickBaseAim', baseSize, baseSize);

      gfx.clear();
      gfx.fillStyle(0x16340a, 0.5);
      gfx.fillCircle(bc, bc, baseRadius);
      gfx.lineStyle(6, 0x60ee29, 0.9);
      gfx.strokeCircle(bc, bc, baseRadius);
      gfx.lineStyle(3, 0xc4f9a8, 0.25);
      gfx.strokeCircle(bc, bc, baseRadius * 0.66);
      gfx.generateTexture('joystickBaseAimArmed', baseSize, baseSize);

      const thumbRadius = 40;
      const thumbSize = thumbRadius * 2 + 6;
      const tc = thumbSize / 2;

      gfx.clear();
      gfx.fillStyle(0x5bc0ff, 0.95);
      gfx.fillCircle(tc, tc, thumbRadius);
      gfx.fillStyle(0xd6f2ff, 0.45);
      gfx.fillCircle(tc - 7, tc - 7, thumbRadius * 0.45);
      gfx.lineStyle(4, 0x06263d, 0.95);
      gfx.strokeCircle(tc, tc, thumbRadius);
      gfx.generateTexture('joystickThumb', thumbSize, thumbSize);

      gfx.clear();
      gfx.fillStyle(0xff6b6b, 0.95);
      gfx.fillCircle(tc, tc, thumbRadius);
      gfx.fillStyle(0xffe0e0, 0.45);
      gfx.fillCircle(tc - 7, tc - 7, thumbRadius * 0.45);
      gfx.lineStyle(4, 0x3d0606, 0.95);
      gfx.strokeCircle(tc, tc, thumbRadius);
      gfx.generateTexture('joystickThumbAim', thumbSize, thumbSize);

      gfx.clear();
      gfx.fillStyle(0x60ee29, 0.95);
      gfx.fillCircle(tc, tc, thumbRadius);
      gfx.fillStyle(0xe2ffd1, 0.45);
      gfx.fillCircle(tc - 7, tc - 7, thumbRadius * 0.45);
      gfx.lineStyle(4, 0x143305, 0.95);
      gfx.strokeCircle(tc, tc, thumbRadius);
      gfx.generateTexture('joystickThumbAimArmed', thumbSize, thumbSize);
      gfx.destroy();

      const base = this.game.hud.scene.add.image(0, 0, 'joystickBase');
      const thumb = this.game.hud.scene.add.image(0, 0, 'joystickThumb');
      this.joystick = new VirtualJoyStick(this.game.hud.scene, { radius: Controls.STICK_RADIUS, base, thumb });
      this.joystick.setEnable(false);

      const aimBase = this.game.hud.scene.add.image(0, 0, 'joystickBaseAim');
      this.aimIcon = this.game.hud.scene.add.image(0, 0, 'mobileAttack');
      this.aimIcon.setVisible(false);
      const aimThumb = this.game.hud.scene.add.image(0, 0, 'joystickThumbAim');
      this.aimJoystick = new VirtualJoyStick(this.game.hud.scene, { radius: Controls.STICK_RADIUS, base: aimBase, thumb: aimThumb });
      this.aimJoystick.setEnable(false);

      input.on('pointerdown', (pointer: any) => {
        if (this.disabled) return;
        if (this._onHudButton(pointer)) return;
        if (this._moveId === -1 && this._inMoveField(pointer)) {
          this._moveId = pointer.id;
          this._movePointer = pointer;
          this.joystickPointer = pointer;
          this.joystick?.setPosition(pointer.x, pointer.y);
          this._moveOrigin.x = pointer.x;
          this._moveOrigin.y = pointer.y;
          return;
        }
        if (this._aimId === -1 && this._inStickBox(this.aimJoystick, pointer)) {
          this._aimId = pointer.id;
          this._aimPointer = pointer;
          this._aimOrigin.x = this.aimJoystick.base.x;
          this._aimOrigin.y = this.aimJoystick.base.y;
          this._aimPressAt = performance.now();
          this._hintShown = false;
        }
      });

      input.on('pointerup', (pointer: any) => {
        if (pointer.id === this._moveId) {
          this._moveId = -1; this._movePointer = null; this.joystickPointer = null;
          this.joystick?.setPosition(this._moveRest.x, this._moveRest.y);
          this.mouse.force = 0;
        }
        if (pointer.id === this._aimId) {
          this._aimId = -1; this._aimPointer = null;
          this._resetThumb(this.aimJoystick, this._aimOrigin);
          if (this.throwArmed) {
            this._pulse(InputTypes.SwordThrow, 140, true);
            this.setThrowArmed(false);
          } else {
            this._pulse(InputTypes.SwordSwing);
          }
          this._hintShown = false;
          this.aim.force = 0;
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
      if (this.game.isMobile) return;
      if (pointer.leftButtonDown()) this.inputDown(InputTypes.SwordSwing);
      if (pointer.rightButtonDown()) this.inputDown(InputTypes.SwordThrow);
    });

    input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      pointer.event.preventDefault();
      if (this.game.isMobile) return;
      this.inputUp(InputTypes.SwordSwing);
      this.inputUp(InputTypes.SwordThrow);
    });

    this._blurHandler = () => this.clear();
    window.addEventListener('blur', this._blurHandler);
    this.disabledKeys = new Set();
  }

  armThrow(): void {
    if (this.disabled) return;
    if (this.game.hud?.chat?.isOpen) return;
    const self: any = this.game.gameState?.self?.entity;
    const onCooldown = !!self && (!!self.swordFlying || (self.swordFlyingCooldown ?? 0) > 0);
    if (onCooldown) {
      this.game.hud?.showAnnouncement?.('Throw is on cooldown', '#53e08a', 1400, 0.36);
      return;
    }
    if (this.throwArmed) {
      this.game.hud?.showAnnouncement?.('Throw is already activated', '#f5c842', 1400, 0.36);
      return;
    }
    this.setThrowArmed(true);
  }

  setThrowArmed(armed: boolean): void {
    if (this.throwArmed === armed) return;
    this.throwArmed = armed;
    try {
      this.aimJoystick?.base?.setTexture?.(armed ? 'joystickBaseAimArmed' : 'joystickBaseAim');
      this.aimJoystick?.thumb?.setTexture?.(armed ? 'joystickThumbAimArmed' : 'joystickThumbAim');
      this.aimIcon?.setTexture?.(armed ? 'mobileThrow' : 'mobileAttack');
      this.refreshAimIcon();
    } catch (e) { /* noop */ }
  }

  refreshAimIcon(): void {
    const icon = this.aimIcon;
    if (!icon) return;
    const portrait = this.game.scale.height > this.game.scale.width;
    const mul = Controls.stickMul(portrait);
    const s = this.game.hud?.scale || 1;
    const iw = (icon.texture as any)?.width || 100;
    icon.setScale((Controls.STICK_RADIUS * 1.1 * s * mul) / iw);
  }

  private _inStickBox(stick: any, pointer: any): boolean {
    if (!stick || !stick.base) return false;
    const r = this._stickRadius() * Controls.claimBox;
    return Math.abs(pointer.x - stick.base.x) <= r && Math.abs(pointer.y - stick.base.y) <= r;
  }

  private _inMoveField(pointer: any): boolean {
    const w = this.game.scale.width;
    const h = this.game.scale.height;
    return pointer.x < w * 0.4 && pointer.y > h * 0.35;
  }

  setMoveRest(x: number, y: number): void {
    this._moveRest.x = x;
    this._moveRest.y = y;
    if (this._moveId === -1) this.joystick?.setPosition(x, y);
  }

  private _resetThumb(stick: any, origin: { x: number; y: number }): void {
    if (!stick || !stick.thumb) return;
    stick.thumb.x = origin.x;
    stick.thumb.y = origin.y;
  }

  private _readStick(pointer: any, id: number, origin: { x: number; y: number }, stick: any, out: Mouse): number {
    const radius = this._stickRadius();
    if (!pointer || !pointer.isDown || pointer.id !== id) return 0;
    const dx = pointer.x - origin.x;
    const dy = pointer.y - origin.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const clamped = Math.min(dist, radius);
    const angle = Math.atan2(dy, dx);
    if (stick?.thumb) {
      stick.thumb.x = origin.x + Math.cos(angle) * clamped;
      stick.thumb.y = origin.y + Math.sin(angle) * clamped;
    }
    if (dist <= 12) return 0;
    out.angle = angle;
    return clamped / radius;
  }

  update() {
    if (this.disabled) return;

    if (this._pulses.length) {
      const now = performance.now();
      for (let i = this._pulses.length - 1; i >= 0; i--) {
        if (now >= this._pulses[i].until) {
          this.inputUp(this._pulses[i].input);
          this._pulses.splice(i, 1);
        }
      }
    }

    if (this.throwArmed) {
      const self: any = this.game.gameState?.self?.entity;
      if (!self || self.swordFlying) this.setThrowArmed(false);
    }

    if (this.game.isMobile) {
      const moveDefl = this._readStick(this._movePointer, this._moveId, this._moveOrigin, this.joystick, this.mouse);
      if (moveDefl > 0) {
        const fullForce = Math.min(this.game.scale.width, this.game.scale.height) / 2;
        const target = moveDefl * fullForce;
        this.mouse.force += (target - this.mouse.force) * 0.3;
      } else {
        this.mouse.force *= 0.7;
        if (this.mouse.force < 1) this.mouse.force = 0;
      }

      this.aim.force = this._readStick(this._aimPointer, this._aimId, this._aimOrigin, this.aimJoystick, this.aim);

      if (this._aimId !== -1 && performance.now() - this._aimPressAt < Controls.aimActivateMs) {
        this.aim.force = 0;
      }

      if (this._aimId !== -1 && !this._hintShown
          && performance.now() - this._aimPressAt >= Controls.holdHintMs) {
        this._hintShown = true;
        this.game.hud?.showAnnouncement?.('Release to use attack', '#8fd8ff', 1400, 0.36);
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

  inputDown(inputType: InputTypes, force = false) {
    if (this.isInputDown(inputType) || this.disabled || (!force && this.disabledKeys.has(inputType))) {
      return;
    }
    this.downInputs.push(inputType);
    this.flushIfCombat(inputType);
  }

  inputUp(inputType: InputTypes) {
    if (this.isInputUp(inputType) || this.disabled) {
      return;
    }
    this.downInputs.splice(this.downInputs.indexOf(inputType), 1);
    this.flushIfCombat(inputType);
  }

  private static readonly immediateSendInputs = new Set<InputTypes>([
    InputTypes.SwordSwing, InputTypes.SwordThrow, InputTypes.Ability,
  ]);
  private flushIfCombat(inputType: InputTypes) {
    if (!Controls.immediateSendInputs.has(inputType)) return;
    this.game.gameState?.flushCombatInputs?.();
  }

  getChanges() {
    const difference: any = [];
    for (const input of this.downInputs) {
      if (!this.previousDownInputs.includes(input)) {
        difference.push({ inputType: input, inputDown: true });
      }
    }
    for (const input of this.previousDownInputs) {
      if (!this.downInputs.includes(input)) {
        difference.push({ inputType: input, inputDown: false });
      }
    }
    this.previousDownInputs.length = 0;
    for (let i = 0; i < this.downInputs.length; i++) this.previousDownInputs.push(this.downInputs[i]);
    return difference;
  }

  clear() {
    this.downInputs = [];
    this._moveId = -1; this._movePointer = null; this.joystickPointer = null;
    this._aimId = -1; this._aimPointer = null;
    this.mouse.force = 0;
    this.aim.force = 0;
    this.setThrowArmed(false);
  }

  cleanup() {
    if (this._blurHandler) {
      window.removeEventListener('blur', this._blurHandler);
      this._blurHandler = null;
    }
    const { input } = this.game;
    input.keyboard?.removeAllListeners();
    input.removeAllListeners();
    if (this.game.hud?.scene?.input) {
      this.game.hud.scene.input.removeAllListeners();
    }
  }
}
