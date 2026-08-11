const Player = require('./Player');
const ZombieBrain = require('../components/ZombieBrain');
const Types = require('../Types');

const VARIANTS = {
  1: { name: 'Real Zombie', health: 45, damage: 5, speed: 750, radius: 64 },
  2: { name: 'Nightlurker', health: 60, damage: 7, speed: 1050, radius: 68 },
  3: { name: 'Bone Dragon', health: 220, damage: 11, speed: 800, radius: 105 },
};

class Zombie extends Player {
  constructor(game, variant = 1, outbreakId = '') {
    const definition = VARIANTS[variant] || VARIANTS[1];
    super(game, definition.name);
    this.type = Types.Entity.Zombie;
    this.variant = variant;
    this.skin = variant;
    this.sword.skin = variant;
    this.isGlobal = false;
    this.isBot = true;
    this.isEventZombie = true;
    this.outbreakId = outbreakId;
    this.respawnable = false;
    this.shape.scaleRadius.baseValue = definition.radius;
    this.shape.collisionPoly.r = definition.radius;
    this.speed.baseValue = definition.speed;
    this.health.max.baseValue = definition.health;
    this.health.regen.baseValue = 0;
    this.sword.damage.baseValue = definition.damage;
    this.sword.targets.delete(Types.Entity.Zombie);
    this.sword.flyCooldown.baseValue = variant === 2 ? 3.2 : (variant === 3 ? 5.2 : 4.1);
    this.brain = new ZombieBrain(this);
  }

  createState() {
    const state = super.createState();
    state.account = null;
    state.valorCrests = 0;
    return state;
  }

  applyInputs(dt) {
    this.brain.update(dt);
    super.applyInputs(dt);
  }

  damaged(damage, entity = null, isThrown = false, opts = null) {
    const before = this.health.percent * this.health.max.value;
    const alive = !this.removed;
    super.damaged(damage, entity, isThrown, opts);
    const after = this.health.percent * this.health.max.value;
    const applied = Math.max(0, before - after);
    if (applied > 0 && entity?.type === Types.Entity.Player && !entity.isBot) {
      this.game.worldEventDirector?.recordContribution(entity, applied, alive && this.removed);
    }
  }

  shouldDropCurrencyOnRemove() {
    return false;
  }
}

Zombie.VARIANTS = VARIANTS;
module.exports = Zombie;
