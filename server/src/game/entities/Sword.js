const SAT = require('sat');
const Entity = require('./Entity');
const Polygon = require('../shapes/Polygon');
const Property = require('../components/Property');
const Types = require('../Types');
const config = require('../../config');

class Sword extends Entity {
  constructor(player) {
    super(player.game, Types.Entity.Sword);
    this.player = player;
    this.swingAngle = -Math.PI / 3;
    this.raiseAnimation = false;
    this.decreaseAnimation = false;
    this.collidedEntities = new Set();

    const { initialSwingDuration, damage, knockback } = config.sword;
    this.swingDuration = new Property(initialSwingDuration, true);
    this.damage = new Property(damage);
    this.knockback = new Property(knockback, true);
    this.flySpeed = new Property(95);
    this.flyDuration = new Property(1.5);
    this.flyCooldown = new Property(6);
    this.playerSpeedBoost = new Property(1.3);

    this.swingTime = 0;
    this.swingProgress = 0;
    this.isFlying = false;
    this.restrictFly = false;
    this.isAnimationFinished = true;
    this.flyTime = 0;
    this.flyCooldownTime = 0;
    this.flyLog = 0;
    this.skin = player.skin;

    this.focusTime = 200;
    this.focusDamageMultiplier = 1;
    this.lastSwordSwing = Date.now();

    this.proportion = 0.7;
    this.shape = new Polygon(0, 0, [[0, 0]]);
    this.targets.push(Types.Entity.Player, ...Types.Groups.Mobs);
    this.pullbackParticles = false;
  }

  get angle() {
    return this.swingAngle * this.swingProgress;
  }

  get size() {
    return this.player.shape.radius * this.proportion;
  }

  canCollide(entity) {
    return (this.isFlying || this.raiseAnimation)
      && !this.collidedEntities.has(entity)
      && this.player.depth === entity.depth;
  }

  canSwing() {
    return !this.isFlying
      && this.player.inputs.isInputDown(Types.Input.SwordSwing)
      && this.isAnimationFinished
      && this.player.modifiers.invisible == false;
  }

  canFly() {
    if (this.canSwing()) return false;
    return !this.isFlying && !this.restrictFly
      && this.player.inputs.isInputDown(Types.Input.SwordThrow)
      && this.flyCooldownTime <= 0
      && this.player.modifiers.invisible == false;
  }

  stopFly() {
    this.isFlying = false;
    this.flyTime = 0;
    this.collidedEntities.clear();
  }

  createState() {
    const state = super.createState();
    state.size = this.size;
    state.isFlying = this.isFlying;
    state.abilityActive = this.player.evolutions.evolutionEffect.isAbilityActive;
    state.skin = this.skin;
    state.pullbackParticles = this.pullbackParticles;
    return state;
  }

  update(dt) {
    const { player } = this;

    this.updateFlags(dt);

    if (this.player.modifiers.cancelThrow) {
        this.flyCooldownTime = 0.2;
      }
    
    if (this.isFlying) {

      if (this.player.modifiers.cancelThrow) {
        this.stopFly(); // Archergod
      }

      if (this.player.modifiers.pullback) {
        this.pullbackParticles = true; // Fisherman
      } else {
        this.pullbackParticles = false;
      }

      player.speed.multiplier *= this.playerSpeedBoost.value;
      this.shape.x += this.flySpeed.value * Math.cos(this.shape.angle - Math.PI / 2);
      this.shape.y += this.flySpeed.value * Math.sin(this.shape.angle - Math.PI / 2);

      if (this.player.modifiers.ramThrow) {
        this.player.shape.x = this.shape.x;
        this.player.shape.y = this.shape.y;
        this.player.shape.angle = this.shape.angle;
        this.player.angle = this.shape.angle;
      }

      this.flyTime += dt;
      this.flyLog = this.flyTime;
      if (this.flyTime >= this.flyDuration.value) {
        this.stopFly();
      }
    } else {
      let angle = player.angle + this.angle + Math.PI / 2;
      if (this.player.modifiers.swingWide) {
        angle += Math.PI / 4;
      }
      const offsetX = player.shape.radius - this.size / 2.5;
      const offsetY = -player.shape.radius + this.size / 1.7;
      const offset = new SAT.Vector(offsetX, offsetY);

      this.updateCollisionPoly();
      this.shape.collisionPoly.setAngle(angle);
      this.shape.collisionPoly.setOffset(offset);
    }

    this.shape.setScale(player.shape.scale);
  }

  updateCollisionPoly() {
    const points = [
      [0, 0],
      [-0.14615384615384616 * this.size, -1.7769230769230768 * this.size],
      [0.34615384615384615 * this.size, -2.4923076923076923 * this.size],
      [0.8538461538461538 * this.size, -1.7769230769230768 * this.size],
      [0.7153846153846154 * this.size, -0.015384615384615385 * this.size],
    ].map(([x, y]) => new SAT.Vector(x, y));

    const pos = new SAT.Vector(this.player.shape.x, this.player.shape.y);
    this.shape.collisionPoly = new SAT.Polygon(pos, points);
  }

  updateFlags(dt) {
    if (this.canSwing()) {
      this.isFlying = false;
      this.flyTime = 0;
      this.raiseAnimation = true;
      this.isAnimationFinished = false;
      this.player.flags.set(Types.Flags.SwordSwing, true);

      const elapsed = Date.now() - this.lastSwordSwing;
      const multiplier = elapsed / this.focusTime;
      this.focusDamageMultiplier = Math.max(0.5, Math.min(1.2, multiplier));
    }
    if (this.canFly()) {
      this.isFlying = true;
      if (this.player.modifiers.ramAbility) {
        this.flyCooldownTime = this.flyCooldown.value / 5;
      } else if (this.player.modifiers.ramThrow) {
        this.flyCooldownTime = this.flyCooldown.value / 1.5;
      } else {
        this.flyCooldownTime = this.flyCooldown.value;
      }
      this.player.flags.set(Types.Flags.SwordThrow, true);
      this.player.inputs.inputUp(Types.Input.SwordThrow);
    }

    if (!this.isAnimationFinished && !this.raiseAnimation && !this.player.inputs.isInputDown(Types.Input.SwordSwing)) {
      this.decreaseAnimation = true;
      this.focusDamageMultiplier = 1;
      this.lastSwordSwing = Date.now();
    }
    this.damage.multiplier *= this.focusDamageMultiplier;

    this.flyCooldownTime -= dt;
    if (this.flyCooldownTime < 0) {
      this.flyCooldownTime = 0;
    }

    if (this.raiseAnimation) {
      this.isFlying = false;
      this.flyTime = 0;
      this.swingTime += dt;
      if (this.swingTime >= this.swingDuration.value) {
        this.swingTime = this.swingDuration.value;
        this.raiseAnimation = false;
      }
    }
    if (this.decreaseAnimation) {
      this.swingTime -= dt;
      if (this.swingTime <= 0) {
        this.swingTime = 0;
        this.decreaseAnimation = false;
        this.collidedEntities.clear();
        this.isAnimationFinished = true;
      }
    }

    this.swingProgress = this.swingTime / this.swingDuration.value;
    this.restrictFly = false;
  }
processTargetsCollision(entity) {
    if (entity === this.player) return;
    if (!this.canCollide(entity)) return;
    
    // safezone
    if (this.player.modifiers.safe && entity.type === Types.Entity.Player && !this.player.isBot) return;
    if (entity.type === Types.Entity.Player && entity.modifiers.safe && !entity.isBot) return;

    // under 500
    let skipDamageDueToCoins = false;
    if (entity.type === Types.Entity.Player && !entity.isBot && !this.player.isBot) {
      const attackerCoins = (this.player.levels && typeof this.player.levels.coins === 'number') ? this.player.levels.coins : 0;
      const targetCoins = (entity.levels && typeof entity.levels.coins === 'number') ? entity.levels.coins : 0;
      if (attackerCoins < this.player.coinShield || targetCoins < this.player.coinShield) {
        this.collidedEntities.add(entity);
        skipDamageDueToCoins = true;
      }
    }

    const angle = Math.atan2(this.player.shape.y - entity.shape.y, this.player.shape.x - entity.shape.x);

    let power = (this.knockback.value / (entity.knockbackResistance?.value || 1));

    if (entity.type === Types.Entity.Player && this.player.modifiers.noRestrictKnockback) {
       power = (this.knockback.value);
    }

    if (this.player.modifiers.pullAll) {
      power = Math.max(Math.min(power, 400), 100);
      power = 0 - power
    } else if (this.player.modifiers.pullback === true) {
      if (this.isFlying) {
        this.isAnimationFinished = true;
        this.flyTime = this.flyDuration.value;
        power = Math.max(Math.min(power, 400), 100);
        power = 0 - (power / (this.flyDuration.value / this.flyLog));
      } else {
        if (!this.player.evolutions.evolutionEffect.isAbilityActive) {
        power = (Math.max(Math.min(power, 400), 100)) * 0.25;
        }
      }
      if (entity.type === Types.Entity.Player) {
        power *= 4;
      }
      } else if (entity.type === Types.Entity.Player && this.player.modifiers.noRestrictKnockback) {
      power *= 4
      } else {
      power = Math.max(Math.min(power, 400), 100);
      }
    const xComp = power * Math.cos(angle);
    const yComp = power * Math.sin(angle);
    entity.velocity.x = -1*xComp;
    entity.velocity.y =  -1*yComp;

    if (!skipDamageDueToCoins && ((this.isFlying && !this.raiseAnimation && !this.decreaseAnimation) || 
      (!this.isFlying && (this.raiseAnimation || this.decreaseAnimation)))) {

        const base = this.damage.value;
        const throwMult = this.player.modifiers.throwDamage || 1;
        let finalDamage = base;

        if (this.player.modifiers.scaleThrow && this.isFlying) {
          finalDamage = base * ((this.flyLog + 1) * 1.45) * throwMult;
        } else if (this.player.modifiers.throwDamage && this.isFlying) {
          finalDamage = base * throwMult;
        } else {
          finalDamage = base;
        }

        // 50% now 50%  1s poison 
        if (this.player.modifiers.poisonDamage) {
          const immediate = finalDamage * 0.5;
          const poisonTotal = finalDamage * 0.5;

          // 50% now
          entity.damaged(immediate, this.player);

          // 50% poison
          if (entity.type === Types.Entity.Player && typeof entity.addEffect === 'function') {
            const poisonPerSecond = poisonTotal;
            const effectId = `poison_${Date.now()}_${Math.random()}`;
            try {
              entity.addEffect(Types.Effect.Burning, effectId, { damage: poisonPerSecond, duration: 1, attacker: this.player });
            } catch (e) {
              entity.damaged(poisonTotal, this.player);
            }
          } else {
            entity.damaged(poisonTotal, this.player);
          }
        } else {
          entity.damaged(finalDamage, this.player);
        }
    }

    if(this.player.modifiers.leech && !skipDamageDueToCoins) {
      this.player.health.gain(this.damage.value * this.player.modifiers.leech);
    }

    this.collidedEntities.add(entity);
    this.player.flags.set(Types.Flags.EnemyHit, entity.id);

    if (entity.type === Types.Entity.Player && !skipDamageDueToCoins && this.player.modifiers.chainDamage) {
      try { entity.flags.set(Types.Flags.ChainDamaged, entity.id); } catch (err) { /* */ }

      const findClosestPlayer = (center, radius, excludeSet = new Set()) => {
        let closest = null;
        let minDist = Infinity;
        const candidates = this.game.entitiesQuadtree
          ? this.game.entitiesQuadtree.get({
              x: center.x - radius,
              y: center.y - radius,
              width: radius * 2,
              height: radius * 2
            })
          : Array.from(this.game.entities.values()).map(entity => ({ entity }));

        for (const { entity: candidate } of candidates) {
          if (
            candidate &&
            candidate.type === Types.Entity.Player &&
            candidate !== this.player &&
            !candidate.removed &&
            !excludeSet.has(candidate)
          ) {
            const dx = candidate.shape.x - center.x;
            const dy = candidate.shape.y - center.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < radius && dist < minDist) {
              minDist = dist;
              closest = candidate;
            }
          }
        }
        return closest;
      };

      const lossless = !!this.player.modifiers.losslessChainDamage;
      const m1 = lossless ? 1.0 : 0.75;
      const m2 = lossless ? 1.0 : 0.5;
      const m3 = lossless ? 1.0 : 0.25;

      // 1st
      const firstSplash = findClosestPlayer(entity.shape, 2500, new Set([entity, this.player]));
      if (firstSplash) {
        firstSplash.damaged(this.damage.value * m1, this.player);
        try { firstSplash.flags.set(Types.Flags.Damaged, firstSplash.id); } catch (e) {}
        try { firstSplash.flags.set(Types.Flags.ChainDamaged, firstSplash.id); } catch (e) {}

        // 2nd
        const secondSplash = findClosestPlayer(firstSplash.shape, 2500, new Set([entity, this.player, firstSplash]));
        if (secondSplash) {
          secondSplash.damaged(this.damage.value * m2, this.player);
          try { secondSplash.flags.set(Types.Flags.Damaged, secondSplash.id); } catch (e) {}
          try { secondSplash.flags.set(Types.Flags.ChainDamaged, secondSplash.id); } catch (e) {}

          // 3rd
          const thirdSplash = findClosestPlayer(secondSplash.shape, 2500, new Set([entity, this.player, firstSplash, secondSplash]));
          if (thirdSplash) {
            thirdSplash.damaged(this.damage.value * m3, this.player);
            try { thirdSplash.flags.set(Types.Flags.Damaged, thirdSplash.id); } catch (e) {}
            try { thirdSplash.flags.set(Types.Flags.ChainDamaged, thirdSplash.id); } catch (e) {}
          }
        }
      }
    }

    if (entity.type === Types.Entity.Player) {
      if (!skipDamageDueToCoins) {
        if (entity.removed) {
          // now done in Player.damaged
        } else {
          entity.flags.set(Types.Flags.Damaged, entity.id);
          [...this.player.tamedEntities].forEach(wolf => {
            const wolfObj = this.game.entities.get(wolf);
            if(wolfObj && !wolfObj.removed) {
              wolfObj.target = entity;
              wolfObj.angryTimer.renew();
          }
        });
      }
    }
}
}

  cleanup() {
    super.cleanup();

    [this.damage, this.knockback, this.swingDuration, this.flySpeed, this.flyDuration].forEach(prop => prop.reset());
  }
}

module.exports = Sword;
