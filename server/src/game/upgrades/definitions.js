const Upgrade = require('./Upgrade');
const Types = require('../Types');

const U = Types.Upgrade;
const E = Types.Evolution;
const defs = {};
function def(cls) { defs[cls.type] = cls; return cls; }

class Timerish {
  constructor(dur) { this.dur = dur; this.t = dur; }
  renew() { this.t = 0; }
  update(dt) { if (this.t < this.dur) this.t += dt; }
  get active() { return this.t < this.dur; }
}

const noRetaliate = { noRetaliate: true };

function angDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return d;
}

function nearestEnemyPlayer(player, maxDist) {
  const ents = player.game && player.game.entities;
  if (!ents) return null;
  let best = null, bestD2 = maxDist * maxDist;
  for (const e of ents.values()) {
    if (!e || e.removed || e === player) continue;
    if (e.type !== Types.Entity.Player || !e.shape) continue;
    const dx = e.shape.x - player.shape.x, dy = e.shape.y - player.shape.y;
    const d2 = dx * dx + dy * dy;
    if (d2 < bestD2) { bestD2 = d2; best = e; }
  }
  return best;
}

function enemiesInRadius(player, radius, cb, playersOnly) {
  const ents = player.game && player.game.entities;
  if (!ents) return;
  const r2 = radius * radius;
  for (const e of ents.values()) {
    if (!e || e.removed || e === player || !e.shape) continue;
    if (playersOnly && e.type !== Types.Entity.Player) continue;
    const isTarget = e.type === Types.Entity.Player
      || (Types.Groups && Types.Groups.Mobs && Types.Groups.Mobs.includes && Types.Groups.Mobs.includes(e.type));
    if (!isTarget) continue;
    const dx = e.shape.x - player.shape.x, dy = e.shape.y - player.shape.y;
    if (dx * dx + dy * dy <= r2) cb(e);
  }
}


def(class Toughened extends Upgrade {
  static type = U.Toughened; static owner = E.Basic; static tier = 0;
  update(dt) {
    this.player.health.max.multiplier *= 1.08;
    this.player.knockbackResistance.multiplier *= 1.12;
  }
});

def(class Footwork extends Upgrade {
  static type = U.Footwork; static owner = E.Basic; static tier = 0;
  constructor(p) { super(p); this.boost = new Timerish(2); }
  onHit(target, isFlying) {
    if (target && target.type === Types.Entity.Player) this.boost.renew();
  }
  update(dt) {
    this.boost.update(dt);
    if (this.boost.active) this.player.speed.multiplier *= 1.25;
  }
});

def(class ClasslessAbility extends Upgrade {
  static type = U.ClasslessAbility; static owner = E.Basic; static tier = 1;
  constructor(p) {
    super(p);
    const evo = p.evolutions && p.evolutions.evolutionEffect;
    if (evo && typeof evo.grantAbility === 'function') {
      evo.grantAbility({
        duration: 4,
        cooldown: 22,
        apply: (player) => {
          player.sword.swingDuration.multiplier['classability'] = 0.6;
          player.speed.multiplier *= 1.15;
          player.health.regen.multiplier *= 3;
          player.health.regenWait.multiplier *= 0.3;
        },
      });
    }
  }
  update(dt) {}
});

def(class Handling extends Upgrade {
  static type = U.Handling; static owner = E.Basic; static tier = 1;
  update(dt) {
    if (this.player.sword && this.player.sword.isFlying) {
      this.player.speed.multiplier *= 1.2;
      this.player.health.max.multiplier *= 1.15;
    }
  }
});

def(class Lavacopy extends Upgrade {
  static type = U.Lavacopy; static owner = E.Basic; static tier = 2;
  update(dt) {
    const ents = this.player.game && this.player.game.entities;
    if (!ents || !this.player.shape) return;
    const selfR = this.player.shape.radius || 100;
    const fieldR = selfR * 1.25;
    const dps = 15;
    for (const e of ents.values()) {
      if (!e || e.removed || e === this.player || !e.shape) continue;
      if (e.type !== Types.Entity.Player) continue;
      const dx = e.shape.x - this.player.shape.x, dy = e.shape.y - this.player.shape.y;
      const reach = fieldR + (e.shape.radius || 0);
      if (dx * dx + dy * dy > reach * reach) continue;
      if (typeof e.damaged === 'function') { try { e.damaged(dps * dt, this.player, false, noRetaliate); } catch (err) {} }
    }
  }
});

def(class Pacifist extends Upgrade {
  static type = U.Pacifist; static owner = E.Basic; static tier = 2;
  update(dt) {
    this.player.damageReduction *= 0.5;
    this.player.modifiers.pacifist = true;
  }
});

def(class Battler extends Upgrade {
  static type = U.Battler; static owner = E.Basic; static tier = 3;
  update(dt) { this.player.sword.damage.multiplier *= 1.5; }
});

def(class Battleswords extends Upgrade {
  static type = U.Battleswords; static owner = E.Basic; static tier = 3;
  update(dt) {
    this.player.sword.swingDuration.multiplier['bsword'] = 0.5;
    this.player.sword.damage.multiplier *= 0.5;
    this.player.sword.swingArc = -Math.PI / 3.6;
    this.player.sword.knockback.multiplier['bsword'] = 0.5;
    this.player.modifiers.battleswords = true;
    if (!this.player.offhandSword && typeof this.player.createOffhandSword === 'function') {
      this.player.createOffhandSword();
    }
  }
});


def(class Momentum extends Upgrade {
  static type = U.Momentum; static owner = E.Knight; static tier = 0;
  constructor(p) { super(p); this.stacks = 0; this.decay = new Timerish(2.0); }
  onHit(t, f) { if (t && t.type === Types.Entity.Player) { this.stacks = Math.min(4, this.stacks + 1); this.decay.renew(); } }
  update(dt) {
    this.decay.update(dt);
    if (!this.decay.active) this.stacks = 0;
    if (this.stacks > 0) this.player.sword.damage.multiplier *= 1 + 0.06 * this.stacks;
  }
});

def(class Gale extends Upgrade {
  static type = U.Gale; static owner = E.Knight; static tier = 0;
  constructor(p) { super(p); this.sinceHit = 0; }
  onDamaged(a) { this.sinceHit = 0; }
  update(dt) {
    this.sinceHit += dt;
    if (this.sinceHit >= 2) this.player.speed.multiplier *= 1.2;
  }
});

def(class Lunge extends Upgrade {
  static type = U.Lunge; static owner = E.Knight; static tier = 1;
  update(dt) { this.player.modifiers.lungeOnThrow = true; }
});

def(class Riposte extends Upgrade {
  static type = U.Riposte; static owner = E.Knight; static tier = 1;
  constructor(p) { super(p); this.window = new Timerish(1.5); this.window.t = this.window.dur; }
  onDamaged(a) { this.window.renew(); }
  update(dt) {
    this.window.update(dt);
    if (this.window.active) {
      this.player.sword.damage.multiplier *= 1.3;
      this.player.speed.multiplier *= 1.18;
    }
  }
});

def(class Striketwice extends Upgrade {
  static type = U.Striketwice; static owner = E.Knight; static tier = 2;
  update(dt) {
    this.player.modifiers.strikeTwice = true;
    this.player.sword.swingDuration.multiplier['striketwice'] = 3;
  }
});

def(class Twothrow extends Upgrade {
  static type = U.Twothrow; static owner = E.Knight; static tier = 2;
  update(dt) { this.player.modifiers.twinThrowUp = true; }
});


def(class Overrun extends Upgrade {
  static type = U.Overrun; static owner = E.Tank; static tier = 0;
  update(dt) { this.player.modifiers.overrun = true; }
});

def(class Charging extends Upgrade {
  static type = U.Charging; static owner = E.Tank; static tier = 0;
  constructor(p) { super(p); this.charge = 0; this.lastDir = null; }
  update(dt) {
    const md = this.player.movedDistance;
    const moving = (md.x * md.x + md.y * md.y) > 1;
    if (moving) {
      const dir = Math.atan2(md.y, md.x);
      if (this.lastDir !== null && Math.abs(angDiff(dir, this.lastDir)) < 0.5) {
        this.charge = Math.min(1, this.charge + dt * 0.5);
      } else {
        this.charge = 0;
      }
      this.lastDir = dir;
    } else {
      this.charge = Math.max(0, this.charge - dt);
    }
    if (this.charge > 0) {
      this.player.speed.multiplier *= 1 + 0.35 * this.charge;
      this.player.knockbackResistance.multiplier *= 1 + 1.5 * this.charge;
    }
  }
});

def(class Recovery extends Upgrade {
  static type = U.Recovery; static owner = E.Tank; static tier = 1;
  update(dt) {
    const md = this.player.movedDistance;
    const still = (md.x * md.x + md.y * md.y) < 1;
    if (still) this.player.health.regen.multiplier *= 2.0;
  }
});

def(class Blocker extends Upgrade {
  static type = U.Blocker; static owner = E.Tank; static tier = 1;
  update(dt) { this.player.modifiers.blockThrown = true; }
});

def(class Spikes extends Upgrade {
  static type = U.Spikes; static owner = E.Tank; static tier = 2;
  onDamaged(attacker, damage, isThrown) {
    if (attacker && attacker.type === Types.Entity.Player && typeof attacker.damaged === 'function' && damage > 0) {
      try { attacker.damaged(damage * 0.5, this.player, false, noRetaliate); } catch (e) {}
    }
  }
  update(dt) {}
});

def(class Kinesis extends Upgrade {
  static type = U.Kinesis; static owner = E.Tank; static tier = 2;
  onDamaged(attacker, damage, isThrown) {
    if (attacker && attacker.type === Types.Entity.Player && attacker.velocity && attacker.shape) {
      const power = attacker.sword ? Math.max(150, Math.min(400, attacker.sword.knockback.value)) : 250;
      const dx = attacker.shape.x - this.player.shape.x, dy = attacker.shape.y - this.player.shape.y;
      const d = Math.hypot(dx, dy) || 1;
      attacker.velocity.x = (dx / d) * power;
      attacker.velocity.y = (dy / d) * power;
    }
  }
  update(dt) {}
});


def(class Adapting extends Upgrade {
  static type = U.Adapting; static owner = E.Berserker; static tier = 0;
  update(dt) {
    if (this.player.health.percent < 0.5) {
      this.player.sword.damage.multiplier *= 0.85;
      this.player.damageReduction *= 0.8;
      this.player.health.regen.multiplier *= 1.5;
    }
  }
});

def(class Normalize extends Upgrade {
  static type = U.Normalize; static owner = E.Berserker; static tier = 0;
  update(dt) {
    const foe = nearestEnemyPlayer(this.player, 2200);
    if (!foe || !foe.health) return;
    const diff = foe.health.percent - this.player.health.percent;
    this.player.sword.damage.multiplier *= 1 + Math.max(-0.25, Math.min(0.25, diff));
  }
});

def(class Transfer extends Upgrade {
  static type = U.Transfer; static owner = E.Berserker; static tier = 1;
  update(dt) {
    this.player.speed.multiplier *= 0.85;
    this.player.sword.swingDuration.multiplier['transfer'] = 0.8;
  }
});

def(class Haste extends Upgrade {
  static type = U.Haste; static owner = E.Berserker; static tier = 1;
  constructor(p) { super(p); this.stacks = 0; this.decay = new Timerish(3.0); }
  onHit(t, f) { if (t && t.type === Types.Entity.Player && !t.isBot) { this.stacks = Math.min(3, this.stacks + 1); this.decay.renew(); } }
  update(dt) {
    this.decay.update(dt);
    if (!this.decay.active) this.stacks = 0;
    if (this.stacks > 0) this.player.speed.multiplier *= 1 + 0.10 * this.stacks;
  }
});


def(class Sanguine extends Upgrade {
  static type = U.Sanguine; static owner = E.Vampire; static tier = 0;
  onHit(t, f) {
    if (t && t.type !== Types.Entity.Player && this.player.sword) {
      this.player.health.gain(this.player.sword.damage.value * 0.3);
    }
  }
  update(dt) {}
});

def(class Lifetaker extends Upgrade {
  static type = U.Lifetaker; static owner = E.Vampire; static tier = 0;
  onHit(t, f) {
    const hasDeathsender = this.player.upgrades && this.player.upgrades.acquiredIds
      && this.player.upgrades.acquiredIds.includes(U.Deathsender);
    if (hasDeathsender) return;
    if (t && t.type === Types.Entity.Player && t.health && t.health.percent < 0.5 && this.player.sword) {
      this.player.health.gain(this.player.sword.damage.value * 0.5);
    }
  }
  update(dt) {}
});

def(class Deathsender extends Upgrade {
  static type = U.Deathsender; static owner = E.Vampire; static tier = 1;
  update(dt) { this.player.modifiers.leech = 0; this.player.modifiers.deathsender = true; }
  onDamaged(a) {
    if (a && a.type === Types.Entity.Player && typeof a.damaged === 'function') {
      let mult = 0.4;
      const hasLifetaker = this.player.upgrades && this.player.upgrades.acquiredIds
        && this.player.upgrades.acquiredIds.includes(U.Lifetaker);
      if (hasLifetaker && a.health && a.health.percent < 0.5) mult = 0.8;
      try { a.damaged(this.player.sword.damage.value * mult, this.player, false, noRetaliate); } catch (e) {}
    }
  }
});

def(class Vitality extends Upgrade {
  static type = U.Vitality; static owner = E.Vampire; static tier = 1;
  onHit(t, f) {
    if (t && t.type === Types.Entity.Player) this.player.health.lastDamage = 0;
  }
  update(dt) { this.player.health.regen.multiplier *= 0.85; }
});


def(class Ramming extends Upgrade {
  static type = U.Ramming; static owner = E.Rook; static tier = 0;
  constructor(p) { super(p); this.hitThisDash = new Set(); this.wasDashing = false; }
  update(dt) {
    const evo = this.player.evolutions.evolutionEffect;
    const dashing = !!(evo && evo.isAbilityActive);
    if (dashing && !this.wasDashing) this.hitThisDash.clear();
    this.wasDashing = dashing;
    if (!dashing) return;
    enemiesInRadius(this.player, (this.player.shape.radius || 100) + 90, (e) => {
      if (this.hitThisDash.has(e)) return;
      this.hitThisDash.add(e);
      if (typeof e.damaged === 'function') { try { e.damaged(this.player.sword.damage.value * 1.2, this.player); } catch (err) {} }
      if (e.velocity && e.shape) {
        const dx = e.shape.x - this.player.shape.x, dy = e.shape.y - this.player.shape.y;
        const d = Math.hypot(dx, dy) || 1;
        e.velocity.x += (dx / d) * 500; e.velocity.y += (dy / d) * 500;
      }
    });
  }
});

def(class Teleport extends Upgrade {
  static type = U.Teleport; static owner = E.Rook; static tier = 0;
  update(dt) { this.player.modifiers.dashTeleport = true; }
});

def(class KingRook extends Upgrade {
  static type = U.KingRook; static owner = E.Rook; static tier = 1;
  update(dt) { this.player.modifiers.disableDiagonalMovement = false; }
});

def(class Castle extends Upgrade {
  static type = U.Castle; static owner = E.Rook; static tier = 1;
  update(dt) { this.player.modifiers.dashDoubleCharge = true; }
});


def(class Iaido extends Upgrade {
  static type = U.Iaido; static owner = E.Samurai; static tier = 0;
  constructor(p) { super(p); this.idle = 0; this.charged = false; }
  onSwordSwing() { if (this.charged) { this.player.sword.damage.multiplier *= 1.6; this.charged = false; } this.idle = 0; }
  update(dt) { this.idle += dt; if (this.idle >= 1.5) this.charged = true; }
});

def(class Meditation extends Upgrade {
  static type = U.Meditation; static owner = E.Samurai; static tier = 0;
  constructor(p) { super(p); this.calm = 0; }
  onDamaged(a) { this.calm = 0; }
  update(dt) {
    this.calm += dt;
    const ramp = Math.min(2.5, 1 + this.calm * 0.15);
    this.player.health.regen.multiplier *= ramp;
  }
});

def(class Katana extends Upgrade {
  static type = U.Katana; static owner = E.Samurai; static tier = 1;
  update(dt) {
    this.player.sword.swingDuration.multiplier['katana'] = 0.65;
    this.player.sword.damage.multiplier *= 0.85;
    this.player.sword.knockback.multiplier['katana'] = 0.5;
    this.player.knockbackResistance.multiplier *= 0.6;
  }
});

def(class Kunais extends Upgrade {
  static type = U.Kunais; static owner = E.Samurai; static tier = 1;
  update(dt) { this.player.modifiers.kunais = true; }
});


def(class ArcherCombo extends Upgrade {
  static type = U.ArcherCombo; static owner = E.Archer; static tier = 0;
  constructor(p) { super(p); this.stacks = 0; this.decay = new Timerish(5); }
  onHit(t, isFlying) {
    if (isFlying && t && t.type === Types.Entity.Player) {
      this.stacks = Math.min(4, this.stacks + 1); this.decay.renew();
    }
  }
  update(dt) {
    this.decay.update(dt);
    if (!this.decay.active) this.stacks = 0;
    if (this.stacks > 0) this.player.flags.set(Types.Flags.ArcherCombo, this.stacks);
    if (this.stacks > 0) {
      if (this.player.modifiers.throwDamage) this.player.modifiers.throwDamage *= 1 + 0.15 * this.stacks;
      this.player.sword.flyCooldown.multiplier *= Math.max(0.5, 1 - 0.12 * this.stacks);
    }
  }
});
def(class Homing extends Upgrade {
  static type = U.Homing; static owner = E.Archer; static tier = 0;
  update(dt) { this.player.modifiers.homingThrow = true; this.player.sword.flySpeed.multiplier *= 1.25; }
});

def(class Deflect extends Upgrade {
  static type = U.Deflect; static owner = E.Warrior; static tier = 0;
  onDamaged(a) {
    if (a && a.type === Types.Entity.Player && a.velocity) {
      const dx = a.shape.x - this.player.shape.x, dy = a.shape.y - this.player.shape.y;
      const d = Math.hypot(dx, dy) || 1;
      const p = 150;
      a.velocity.x += (dx / d) * p; a.velocity.y += (dy / d) * p;
    }
  }
  update(dt) {}
});
def(class Pacing extends Upgrade {
  static type = U.Pacing; static owner = E.Warrior; static tier = 0;
  update(dt) {
    this.player.speed.multiplier *= 1.2;
    this.player.shape.setScale(1 / 1.1);
  }
});

def(class TwoBoost extends Upgrade {
  static type = U.TwoBoost; static owner = E.Fighter; static tier = 0;
  onHit(t, isFlying) {
    if (t && t.type === Types.Entity.Player && !t.isBot) {
      const evo = this.player.evolutions.evolutionEffect;
      if (evo && evo.boostTimer) { evo.boostTimer.renew(); this.player.modifiers.BoostOnDamage = true; }
    }
  }
  update(dt) {}
});
def(class Flighter extends Upgrade {
  static type = U.Flighter; static owner = E.Fighter; static tier = 0;
  update(dt) {
    const evo = this.player.evolutions.evolutionEffect;
    if (evo && evo.boostTimer && !evo.boostTimer.finished) {
      this.player.knockbackResistance.multiplier *= 1.5;
      this.player.damageReduction *= 0.75;
      this.player.health.regen.multiplier *= 1.8;
    }
  }
});

def(class Slam extends Upgrade {
  static type = U.Slam; static owner = E.Defender; static tier = 0;
  update(dt) {
    if (this.player.evolutions.evolutionEffect.isAbilityActive) {
      this.player.modifiers.noRestrictKnockback = true;
      this.player.sword.knockback.multiplier['slam'] = 15;
    }
  }
});
def(class Fortress extends Upgrade {
  static type = U.Fortress; static owner = E.Defender; static tier = 0;
  update(dt) {
    const md = this.player.movedDistance;
    if ((md.x * md.x + md.y * md.y) < 1) {
      this.player.modifiers.noKnockback = true;
      this.player.modifiers.immovable = true;
      this.player.knockbackResistance.multiplier *= 100000;
      this.player.sword.knockback.multiplier['fortress'] = 1.18;
    }
  }
});

def(class Blindness extends Upgrade {
  static type = U.Blindness; static owner = E.Stalker; static tier = 0;
  onHit(t, isFlying) {
    if (t && t.type === Types.Entity.Player && !t.isBot) {
      t._blindUntil = Date.now() + 2000;
    }
  }
  update(dt) {}
});
def(class Vision extends Upgrade {
  static type = U.Vision; static owner = E.Stalker; static tier = 0;
  update(dt) { if (this.player.evolutions.evolutionEffect.isAbilityActive) this.player.viewport.zoom.multiplier *= 0.5; }
});

def(class Sardines extends Upgrade {
  static type = U.Sardines; static owner = E.Fisherman; static tier = 0;
  constructor(p) { super(p); this.cooldown = 0; }
  update(dt) { if (this.cooldown > 0) this.cooldown -= dt; }
  onDamaged(attacker) {
    if (this.cooldown > 0 || !attacker || attacker.type !== Types.Entity.Player) return;
    if (this.player.biome !== Types.Biome.River) return;
    this.cooldown = 4;
    try {
      const AngryFish = require('../entities/mobs/AngryFish');
      const game = this.player.game;
      for (let i = 0; i < 6; i++) {
        const fish = new AngryFish(game, {
          position: [this.player.shape.x + (Math.random() - 0.5) * 160, this.player.shape.y + (Math.random() - 0.5) * 160],
        });
        fish.coinsDrop = 0;
        fish._isSardine = true;
        fish._sardineOwner = attacker;
        fish._spawnImmuneUntil = Date.now() + 500;
        fish._despawnAt = Date.now() + 30000;
        if (fish.health && fish.health.regen) fish.health.regen.baseValue = 0;
        fish.target = attacker;
        if (fish.angryTimer) fish.angryTimer.renew();
        game.addEntity(fish);
      }
    } catch (e) {  }
  }
});
def(class Brace extends Upgrade {
  static type = U.Brace; static owner = E.Fisherman; static tier = 0;
  constructor(p) { super(p); this.window = new Timerish(2.0); this.window.t = this.window.dur; }
  update(dt) {
    const evo = this.player.evolutions.evolutionEffect;
    if (evo && evo.isAbilityActive) this.window.renew();
    this.window.update(dt);
    if (this.window.active) this.player.damageReduction *= 0.25;
  }
});

def(class Hunter extends Upgrade {
  static type = U.Hunter; static owner = E.Lumberjack; static tier = 0;
  update(dt) { this.player.modifiers.mobPower = (this.player.modifiers.mobPower || 1) * 2.0; }
});
def(class Offense extends Upgrade {
  static type = U.Offense; static owner = E.Lumberjack; static tier = 0;
  constructor(p) { super(p); this.window = new Timerish(3.0); this.window.t = this.window.dur; }
  onDamaged(a) { if (a && a.type === Types.Entity.Player) this.window.renew(); }
  update(dt) {
    this.window.update(dt);
    if (this.window.active) {
      this.player.sword.damage.multiplier *= 1.4;
      this.player.knockbackResistance.multiplier *= 1.4;
      this.player.damageReduction *= 0.85;
    }
  }
});

module.exports = defs;
