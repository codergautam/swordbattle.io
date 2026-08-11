const Types = require('../Types');

const DIRECTION_ANGLES = Object.freeze({
  [Types.Input.Up]: -Math.PI / 2,
  [Types.Input.Right]: 0,
  [Types.Input.Down]: Math.PI / 2,
  [Types.Input.Left]: Math.PI,
});

const DEFAULTS = Object.freeze({
  doubleTapWindowMs: 260,
  cooldownSeconds: 3,
  durationSeconds: 0.18,
  speedMultiplier: 2.15,
});

class DashSystem {
  constructor(player, options = {}) {
    this.player = player;
    this.config = { ...DEFAULTS, ...options };
    this.lastTapAt = new Map();
    this.cooldown = 0;
    this.remaining = 0;
    this.direction = null;
  }

  onDirectionInput(inputType, now = Date.now()) {
    if (!Object.prototype.hasOwnProperty.call(DIRECTION_ANGLES, inputType)) return false;

    const previousTap = this.lastTapAt.get(inputType) || 0;
    this.lastTapAt.set(inputType, now);

    if (now - previousTap > this.config.doubleTapWindowMs) return false;
    if (!this.canActivate()) return false;

    this.direction = DIRECTION_ANGLES[inputType];
    this.remaining = this.config.durationSeconds;
    this.cooldown = this.config.cooldownSeconds;
    this.lastTapAt.clear();
    return true;
  }

  canActivate() {
    const player = this.player;
    if (this.cooldown > 0 || this.remaining > 0) return false;
    if (!player || player.removed || player.inSafezone) return false;
    if (player.modifiers?.stunned || player.hypnotizedBy) return false;
    if (player.cards?.choosingCard && player.cards.instantSelect) return false;
    return true;
  }

  update(dt) {
    const safeDt = Number.isFinite(dt) && dt > 0 ? dt : 0;
    this.cooldown = Math.max(0, this.cooldown - safeDt);
    this.remaining = Math.max(0, this.remaining - safeDt);

    if (this.remaining <= 0 || this.direction === null) return;

    this.player.speed.multiplier *= this.config.speedMultiplier;
    this.player.movementDirection = this.direction;
    this.player.modifiers.dashNoclip = true;
    this.player.modifiers.dashDirection = this.direction;
  }

  interrupt() {
    this.remaining = 0;
    this.direction = null;
  }

  get status() {
    if (this.remaining > 0) return 'active';
    if (this.cooldown > 0) return `${this.cooldown.toFixed(1)}s`;
    return 'ready';
  }
}

DashSystem.DEFAULTS = DEFAULTS;
DashSystem.DIRECTION_ANGLES = DIRECTION_ANGLES;

module.exports = DashSystem;
