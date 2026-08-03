const Evolution = require('./BasicEvolution');
const Types = require('../Types');

module.exports = class IceSpike extends Evolution {
  static type = Types.Evolution.IceSpike;
  static level = 9999; // No winter evols now
  static previousEvol = Types.Evolution.Snowboarder;
  static abilityDuration = 5;
  static abilityCooldown = 65;
  static dashDistance = 300;
  static dashDuration = 0.15;

  constructor(player) {
    super(player);
    this.player.modifiers.bonusTokens = true;
    this.dashTimer = 0;
    this.dashStartPos = null;
    this.dashTargetPos = null;
  }

  // Passive trait: dash on every sword swing
  onSwordSwing() {
    // Get the direction the player is facing
    const angle = this.player.angle;
    const dashDistance = this.constructor.dashDistance;

    // Store start and target positions
    this.dashStartPos = {
      x: this.player.shape.x,
      y: this.player.shape.y
    };
    this.dashTargetPos = {
      x: this.player.shape.x + dashDistance * Math.cos(angle),
      y: this.player.shape.y + dashDistance * Math.sin(angle)
    };
    this.dashTimer = this.constructor.dashDuration;
  }

  applyAbilityEffects() {
    this.player.shape.setScale(0.95);
    this.player.speed.multiplier *= 0.8;
    this.player.sword.damage.multiplier *= 1;
    this.player.sword.knockback.multiplier['ability'] = 1.6;
    this.player.health.regenWait.multiplier = 0.75;
    this.player.sword.swingDuration.multiplier['ability'] = 0.5;
  }

  update(dt) {
    super.update(dt);
    this.player.modifiers.bonusTokens = true;
    this.player.sword.swingDuration.multiplier['default'] = 1.25;
    this.player.sword.knockback.multiplier['default'] = 1.3;
    this.player.knockbackResistance.multiplier *= 0.7;
    this.player.sword.damage.multiplier *= 0.9;
    this.player.health.regenWait.multiplier = 0.7;

    if (this.dashTimer > 0) {
      this.player.modifiers.dashAttack = true;

      const progress = 1 - (this.dashTimer / this.constructor.dashDuration);

      this.player.shape.x = this.dashStartPos.x + (this.dashTargetPos.x - this.dashStartPos.x) * progress;
      this.player.shape.y = this.dashStartPos.y + (this.dashTargetPos.y - this.dashStartPos.y) * progress;

      this.dashTimer -= dt;

      if (this.dashTimer <= 0) {
        this.player.shape.x = this.dashTargetPos.x;
        this.player.shape.y = this.dashTargetPos.y;
        this.dashStartPos = null;
        this.dashTargetPos = null;
      }
    } else {
      this.player.modifiers.dashAttack = false;
    }
  }
}
