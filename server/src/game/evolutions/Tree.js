const Evolution = require('./BasicEvolution');
const Types = require('../Types');
const Bush = require('../entities/mapObjects/Bush');

module.exports = class Tree extends Evolution {
  static type = Types.Evolution.Tree;
  static level = 27;
  static previousEvol = Types.Evolution.CandyWalker;
  static abilityDuration = 9;
  static abilityCooldown = 45;

  constructor(player) {
    super(player);
    this.player.modifiers.bonusTokens = true;
    this.temporaryBush = null;
  }

  activateAbility() {
    super.activateAbility();

    // Spawn temporary bush at player position
    if (!this.temporaryBush) {
      const bushData = {
        position: [this.player.shape.x, this.player.shape.y],
        size: 1000
      };
      this.temporaryBush = new Bush(this.player.game, bushData);
      this.temporaryBush.isStatic = false;
      this.player.game.addEntity(this.temporaryBush);
    }
  }

  deactivateAbility() {
    super.deactivateAbility();

    if (this.temporaryBush) {
      this.player.game.removeEntity(this.temporaryBush);
      this.temporaryBush = null;
    }
  }

  applyAbilityEffects() {
    this.player.shape.setScale(1.1);
    this.player.sword.swingDuration.multiplier['ability'] = 0.6;
    this.player.health.regen.multiplier *= 3;
  }

  update(dt) {
    super.update(dt);
    this.player.modifiers.bonusTokens = true;

    const isUnderCover = this.player.effects.has('bush') || this.player.effects.has('iceMound');

    this.player.shape.setScale(1.075);
    this.player.sword.damage.multiplier *= 0.975;

    this.player.sword.knockback.multiplier['ability'] = 1.4;
    this.player.knockbackResistance.multiplier *= 0.6;

    this.player.health.max.multiplier *= 1.2;
    this.player.health.regenWait.multiplier *= 1.2;

    this.player.health.regen.multiplier *= 1;

    if (isUnderCover) {
      this.player.speed.multiplier *= 1.3;
      this.player.sword.damage.multiplier *= 1.225;
      this.player.health.regenWait.multiplier *= 0;
    }

    //TODO: Damagecooldown: 1.1
  }
}
