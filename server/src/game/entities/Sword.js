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
    this.swingArc = -Math.PI / 3;
    this.raiseAnimation = false;
    this.decreaseAnimation = false;
    this.collidedEntities = new Set();

    // Double Hit (102)
    this.doubleHitActive = false;
    this.doubleHitCleared = false;

    // Boomerang (105)
    this.boomerangReturning = false;
    this.boomerangReturnTime = 0;
    this.boomerangOrigAngle = 0;
    this.boomerangOriginX = 0;
    this.boomerangOriginY = 0;

    // Twin Throw (104)
    this.twinThrowProj = null;
    this.twinThrowDelay = 0;
    this.twinThrowPending = false;
    this.twinThrowSavedAngle = 0;
    this.twinThrowSavedX = 0;
    this.twinThrowSavedY = 0;

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
    this.targets.add(Types.Entity.Player); for (const t of Types.Groups.Mobs) this.targets.add(t);
    this.pullbackParticles = false;
  }

  get angle() {
    return this.swingArc * this.swingProgress;
  }

  get size() {
    return this.player.shape.radius * this.proportion;
  }

  canCollide(entity) {
    const canHit = this.isFlying || this.raiseAnimation || (this.doubleHitActive && this.decreaseAnimation);
    return canHit
      && !this.collidedEntities.has(entity)
      && this.player.depth === entity.depth;
  }

  canSwing() {
    return !this.isFlying
      && this.player.inputs.isInputDown(Types.Input.SwordSwing)
      && this.isAnimationFinished
      && this.player.modifiers.invisible == false
      && !this.player.modifiers.stunned
      && !(this.player.cards.choosingCard && this.player.cards.instantSelect);
  }

  canFly() {
    return !this.isFlying && !this.restrictFly
      && this.player.inputs.isInputDown(Types.Input.SwordThrow)
      && this.flyCooldownTime <= 0
      && this.player.modifiers.invisible == false
      && !this.player.modifiers.stunned
      && !(this.player.cards.choosingCard && this.player.cards.instantSelect);
  }

  stopFly() {
    if (this.player.cards && this.player.cards.hasMajor(105) && !this.boomerangReturning && !this.player.modifiers.pullback) {
      this.boomerangReturning = true;
      this.boomerangReturnTime = 0;
      this.collidedEntities.clear();

      return;
    }

    this.isFlying = false;
    this.flyTime = 0;
    this.boomerangReturning = false;
    this.boomerangReturnTime = 0;
    this.collidedEntities.clear();

    if (this.twinThrowProj && !this.twinThrowProj.removed) {
      this.twinThrowProj.remove();
    }
    this.twinThrowProj = null;
  }

  createState() {
    const state = super.createState();
    state.size = this.size;
    state.isFlying = this.isFlying;
    state.abilityActive = this.player.evolutions.evolutionEffect.isAbilityActive;
    state.skin = this.skin;
    state.pullbackParticles = this.pullbackParticles;
    state.swordBoomerangReturning = this.boomerangReturning;
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
        this.boomerangReturning = false;
        this.stopFly(); // Archergod
      }

      if (this.player.modifiers.pullback) {
        this.pullbackParticles = true; // Fisherman
      } else {
        this.pullbackParticles = false;
      }

      player.speed.multiplier *= this.playerSpeedBoost.value;

      if (this.boomerangReturning) {
        const dx = this.boomerangOriginX - this.shape.x;
        const dy = this.boomerangOriginY - this.shape.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const returnAngle = Math.atan2(dy, dx);
        const speed = this.flySpeed.value * 1.1;

        this.shape.x += speed * Math.cos(returnAngle);
        this.shape.y += speed * Math.sin(returnAngle);

        this.boomerangReturnTime += dt;
        if (dist < player.shape.radius * 1.5 || this.boomerangReturnTime > this.flyLog * 1.5) {
          this.boomerangReturning = false;
          this.isFlying = false;
          this.flyTime = 0;
          this.collidedEntities.clear();
        }
      } else {
        const hasBoomerang = this.player.cards && this.player.cards.hasMajor(105);
        if (hasBoomerang) {
          this.shape.x += this.flySpeed.value * Math.cos(this.boomerangOrigAngle);
          this.shape.y += this.flySpeed.value * Math.sin(this.boomerangOrigAngle);
        } else {
          this.shape.x += this.flySpeed.value * Math.cos(this.shape.angle - Math.PI / 2);
          this.shape.y += this.flySpeed.value * Math.sin(this.shape.angle - Math.PI / 2);
        }

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
      }
    } else {
      this._positionMeleeCollision(player);
    }

    // Twin Throw (104)
    if (this.twinThrowPending) {
      this.twinThrowDelay -= dt;
      if (this.twinThrowDelay <= 0) {
        this.twinThrowPending = false;
        this._spawnThrownSwordAt(this.twinThrowSavedAngle, this.twinThrowSavedX, this.twinThrowSavedY);

      }
    }

    this.shape.setScale(player.shape.scale);
  }

  _positionMeleeCollision(player) {
    let angle = player.angle + this.angle + Math.PI / 2;
    if (this.player.modifiers.swingWide) {
      angle += Math.PI / 4;
    }
    const offsetX = player.shape.radius - this.size / 2.5;
    const offsetY = -player.shape.radius + this.size / 1.7;
    if (!this._offsetVec) this._offsetVec = new SAT.Vector(0, 0);
    this._offsetVec.x = offsetX;
    this._offsetVec.y = offsetY;

    this.updateCollisionPoly();
    this.shape.collisionPoly.setAngle(angle);
    this.shape.collisionPoly.setOffset(this._offsetVec);
  }

  updateCollisionPoly() {
    const s = this.size;
    const poly = this.shape.collisionPoly;
    const points = poly.points;

    // Reuse existing polygon points if already the right count, otherwise create new
    if (points.length === 5) {
      points[0].x = 0; points[0].y = 0;
      points[1].x = -0.14615384615384616 * s; points[1].y = -1.7769230769230768 * s;
      points[2].x = 0.34615384615384615 * s; points[2].y = -2.4923076923076923 * s;
      points[3].x = 0.8538461538461538 * s; points[3].y = -1.7769230769230768 * s;
      points[4].x = 0.7153846153846154 * s; points[4].y = -0.015384615384615385 * s;
      poly.pos.x = this.player.shape.x;
      poly.pos.y = this.player.shape.y;
      poly._recalc();
    } else {
      const newPoints = [
        new SAT.Vector(0, 0),
        new SAT.Vector(-0.14615384615384616 * s, -1.7769230769230768 * s),
        new SAT.Vector(0.34615384615384615 * s, -2.4923076923076923 * s),
        new SAT.Vector(0.8538461538461538 * s, -1.7769230769230768 * s),
        new SAT.Vector(0.7153846153846154 * s, -0.015384615384615385 * s),
      ];
      const pos = new SAT.Vector(this.player.shape.x, this.player.shape.y);
      this.shape.collisionPoly = new SAT.Polygon(pos, newPoints);
    }
  }

  updateFlags(dt) {
    // Double Hit (102)
    if (this.doubleHitActive && this.raiseAnimation && !this.doubleHitCleared) {
      if (this.swingTime >= this.swingDuration.value * 0.9) {
        this.collidedEntities.clear();
        this.doubleHitCleared = true;

      }
    }

    if (this.canSwing()) {
      this.isFlying = false;
      this.flyTime = 0;
      this.raiseAnimation = true;
      this.isAnimationFinished = false;
      this.player.flags.set(Types.Flags.SwordSwing, true);

      // Double Hit (102)
      const hasDoubleHit = this.player.cards && this.player.cards.hasMajor(102);
      this.doubleHitActive = !!hasDoubleHit;
      this.doubleHitCleared = false;

      const elapsed = Date.now() - this.lastSwordSwing;
      const multiplier = elapsed / this.focusTime;
      this.focusDamageMultiplier = Math.max(0.5, Math.min(1.2, multiplier));

      if (this.player.evolutions && this.player.evolutions.evolutionEffect && typeof this.player.evolutions.evolutionEffect.onSwordSwing === 'function') {
        try {
          this.player.evolutions.evolutionEffect.onSwordSwing();
        } catch (e) {
          //
        }
      }
    }
    if (this.canFly()) {
      const hasSpareSword = this.player.cards && this.player.cards.hasMajor(106);

      if (hasSpareSword) {
        // Spare Sword (106)

        this._spawnThrownSword(0);
        this.flyCooldownTime = this.flyCooldown.value;
        this.player.flags.set(Types.Flags.SwordThrow, true);
        this.player.inputs.inputUp(Types.Input.SwordThrow);
      } else {
        this.isFlying = true;
        this.boomerangReturning = false;
        this.boomerangReturnTime = 0;
        this.boomerangOrigAngle = this.player.angle;
        this.boomerangOriginX = this.player.shape.x;
        this.boomerangOriginY = this.player.shape.y;
        if (this.player.modifiers.ramAbility) {
          this.flyCooldownTime = this.flyCooldown.value / 5;
        } else if (this.player.modifiers.ramThrow) {
          this.flyCooldownTime = this.flyCooldown.value / 1.5;
        } else {
          this.flyCooldownTime = this.flyCooldown.value;
        }
        this.player.flags.set(Types.Flags.SwordThrow, true);
        this.player.inputs.inputUp(Types.Input.SwordThrow);

        // Twin Throw (104)
        if (this.player.cards && this.player.cards.hasMajor(104)) {
          this.twinThrowPending = true;
          this.twinThrowDelay = 0.3;
          this.twinThrowSavedAngle = this.player.angle;
          this.twinThrowSavedX = this.player.shape.x;
          this.twinThrowSavedY = this.player.shape.y;

        }
      }
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
        this.doubleHitActive = false;
      }
    }

    this.swingProgress = this.swingTime / this.swingDuration.value;
    this.restrictFly = false;
  }
processTargetsCollision(entity) {
    if (entity === this.player) return;
    if (!this.canCollide(entity)) return;
    if (entity.cards && entity.cards.choosingCard && entity.cards.instantSelect) return;
    if (entity.cards && entity.cards.isTutorial && this.player.type === Types.Entity.Player) return;
    if (this.player.cards && this.player.cards.isTutorial && entity.type === Types.Entity.Player) {
      if (!entity.isBot) {
        this.player.flags.set(Types.Flags.TutorialHitBlocked, true);
      }
      return;
    }
    
    // safezone
    if (this.player.modifiers.safe && entity.type === Types.Entity.Player && !this.player.isBot) return;
    if (entity.type === Types.Entity.Player && entity.modifiers.safe && !entity.isBot) return;

    const attackerCoins = (this.player.levels && typeof this.player.levels.coins === 'number') ? this.player.levels.coins : 0;
    const targetCoins = (entity.levels && typeof entity.levels.coins === 'number') ? entity.levels.coins : 0;
    const attackerRespawnShield = this.player.respawnShieldActive;
    const targetRespawnShield = entity.respawnShieldActive === true;
    const attackerFading = this.player.respawnShieldFadeActive === true;
    const targetFading = entity.respawnShieldFadeActive === true;
    const isHumanVsHuman = entity.type === Types.Entity.Player && !entity.isBot && !this.player.isBot;
    const respawnShielded = isHumanVsHuman && (attackerRespawnShield || targetRespawnShield);
    const respawnFading = isHumanVsHuman && !respawnShielded && (attackerFading || targetFading);
    const respawnFadeMult = respawnFading ? Math.min(
      attackerFading ? this.player.respawnShieldFadeMult : 1,
      targetFading ? entity.respawnShieldFadeMult : 1
    ) : 1;

    let coinShieldMult = 1;
    let coinShieldFullBlock = false;
    if (isHumanVsHuman && !respawnShielded) {
      const lowerCoins = Math.min(attackerCoins, targetCoins);
      if (lowerCoins < 500) {
        coinShieldFullBlock = true;
        coinShieldMult = 0;
      } else if (lowerCoins < 2000) {
        coinShieldMult = 0.5;
      } else if (lowerCoins < 5000) {
        coinShieldMult = 0.75;
      }
    }
    const shielded = isHumanVsHuman && (coinShieldMult < 1 || attackerRespawnShield || targetRespawnShield);

    let antiTeamMult = 1;
    if (isHumanVsHuman) {
      const attacker = this.player;
      const defender = entity;
      const ALLIANCE_RATIO = 0.3;
      const MIN_DAMAGE_THRESHOLD = 10;

      const fighterIds = new Set();
      for (const id of attacker.combatLog.keys()) fighterIds.add(id);
      for (const id of defender.combatLog.keys()) fighterIds.add(id);
      fighterIds.delete(attacker.id);
      fighterIds.delete(defender.id);

      let attackerAllies = 0;
      let defenderAllies = 0;

      for (const fighterId of fighterIds) {
        const fighter = this.game.entities.get(fighterId);
        if (!fighter || fighter.removed || fighter.type !== Types.Entity.Player || fighter.isBot) continue;
        if (!fighter.combatLog) continue;

        const fDmgToDefender = fighter.combatLog.get(defender.id)?.damageDealt || 0;
        const fDmgToAttacker = fighter.combatLog.get(attacker.id)?.damageDealt || 0;

        if (fDmgToDefender > MIN_DAMAGE_THRESHOLD && fDmgToAttacker < fDmgToDefender * ALLIANCE_RATIO) {
          attackerAllies++;
        }
        if (fDmgToAttacker > MIN_DAMAGE_THRESHOLD && fDmgToDefender < fDmgToAttacker * ALLIANCE_RATIO) {
          defenderAllies++;
        }
      }

      const attackerTeam = 1 + attackerAllies;
      const defenderTeam = 1 + defenderAllies;

      antiTeamMult = Math.min(1.0, defenderTeam / attackerTeam);

      if (attackerTeam > defenderTeam) {
        const now = Date.now();
        const newRatio = attackerTeam / defenderTeam;
        const oldRatio = defender.teamDisadvantage ? defender.teamDisadvantage.enemyTeam / defender.teamDisadvantage.myTeam : 0;
        if (!defender.teamDisadvantage || now > defender.teamDisadvantage.expiry || newRatio >= oldRatio) {
          defender.teamDisadvantage = { enemyTeam: attackerTeam, myTeam: defenderTeam, expiry: now + 5000 };
        }
      }
    }

    let coinDisparityMult = 1;
    if (isHumanVsHuman && !shielded) {
      const bigger = Math.max(attackerCoins, targetCoins);
      const smaller = Math.max(Math.min(attackerCoins, targetCoins), 1);
      const coinRatio = bigger / smaller;

      if (coinRatio > 1.5) {
        let boost = Math.min(Math.log2(coinRatio) * 0.03, 0.25);

        const smallerPlayer = attackerCoins <= targetCoins ? this.player : entity;
        const biggerPlayer = attackerCoins <= targetCoins ? entity : this.player;
        const smallerLog = smallerPlayer.combatLog.get(biggerPlayer.id);
        const smallerDealt = smallerLog?.damageDealt || 0;
        const smallerReceived = smallerLog?.damageReceived || 0;
        const totalDmg = smallerDealt + smallerReceived;
        if (totalDmg > 0) {
          boost *= 1 - (smallerDealt / totalDmg);
        }

        if (attackerCoins > targetCoins) {
          coinDisparityMult = 1 - boost;
        } else {
          coinDisparityMult = 1 + boost * 0.5;
        }
      }
    }

    const angle = Math.atan2(this.player.shape.y - entity.shape.y, this.player.shape.x - entity.shape.x);

    let power;
    if (isHumanVsHuman && targetRespawnShield) {
      power = this.knockback.value * 2;
    } else if (isHumanVsHuman && coinShieldFullBlock) {
      power = this.knockback.value * 0.1;
    } else if (isHumanVsHuman && coinShieldMult < 1) {
      power = this.knockback.value * coinShieldMult;
    } else {
      power = (this.knockback.value / (entity.knockbackResistance?.value || 1));
    }

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
    power *= antiTeamMult * coinDisparityMult;

    if (this.player.cards) {
      power *= this.player.cards.getKnockbackMultiplier(entity);
    }

    const xComp = power * Math.cos(angle);
    const yComp = power * Math.sin(angle);
    // Boomerang (105)
    const knockbackDir = (this.boomerangReturning) ? 1 : -1;
    entity.velocity.x = knockbackDir * xComp;
    entity.velocity.y = knockbackDir * yComp;

    if (!respawnShielded && !coinShieldFullBlock && ((this.isFlying && !this.raiseAnimation && !this.decreaseAnimation) ||
      (!this.isFlying && (this.raiseAnimation || this.decreaseAnimation)))) {

        const base = this.damage.value;
        const throwMult = this.player.modifiers.throwDamage || 1;
        const cardThrowMult = this.player.throwDamageMultiplier || 1;
        const isThrown = this.isFlying;
        let finalDamage = base;

        if (this.player.modifiers.scaleThrow && isThrown) {
          finalDamage = base * ((this.flyLog + 1) * 1.45) * throwMult * cardThrowMult;
        } else if (isThrown) {
          finalDamage = base * throwMult * cardThrowMult;
        } else {
          finalDamage = base;
        }

        if (this.doubleHitActive) {
          finalDamage *= 0.60;
        }

        if (this.player.modifiers.damageScale) {
          const bonus = 1 + 0.5 * (1 - this.player.health.percent);
          finalDamage *= bonus;
        }

        if (this.player.cards) {
          finalDamage *= this.player.cards.onHitEntity(entity, finalDamage, isThrown);
          finalDamage *= this.player.cards.getDamageDealtMultiplier(entity);
        }


        finalDamage *= antiTeamMult * coinDisparityMult;

        if (coinShieldMult < 1) {
          finalDamage *= coinShieldMult;
        }

        if (respawnFadeMult < 1) {
          finalDamage *= respawnFadeMult;
        }

        if (this.player.modifiers.poisonDamage) {
          const immediate = finalDamage * 0.5;
          const poisonTotal = finalDamage * 0.5;

          // 50% now
          entity.damaged(immediate, this.player, isThrown);

          // 50% poison
          if (entity.type === Types.Entity.Player && typeof entity.addEffect === 'function') {
            const poisonPerSecond = poisonTotal;
            const effectId = `poison_${Date.now()}_${Math.random()}`;
            try {
              entity.addEffect(Types.Effect.Burning, effectId, { damage: poisonPerSecond, duration: 1, attacker: this.player });
            } catch (e) {
              entity.damaged(poisonTotal, this.player, isThrown);
            }
          } else {
            entity.damaged(poisonTotal, this.player, isThrown);
          }
        } else {
          entity.damaged(finalDamage, this.player, isThrown);
        }
    }

    if(!respawnShielded && this.player.modifiers.leech && entity.type === Types.Entity.Player) {
      this.player.health.gain(this.damage.value * this.player.modifiers.leech);
    }

    this.collidedEntities.add(entity);
    this.player.flags.set(Types.Flags.EnemyHit, entity.id);

    if (entity.type === Types.Entity.Player && !entity.isBot) {
      if (this.player.evolutions && this.player.evolutions.evolutionEffect && typeof this.player.evolutions.evolutionEffect.onDamage === 'function') {
        try {
          this.player.evolutions.evolutionEffect.onDamage(entity, this.isFlying);
        } catch (e) {
          //
        }
      }
    }

    if (entity.type === Types.Entity.Player && this.player.modifiers.chainDamage && !entity.isBot) {
      try { entity.flags.set(Types.Flags.ChainDamaged, entity.id); } catch (err) { /* */ }

      const findClosestPlayer = (center, radius, excludeSet) => {
        let closest = null;
        let minDistSq = radius * radius;
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
            !excludeSet.has(candidate) &&
            !candidate.isBot
          ) {
            const dx = candidate.shape.x - center.x;
            const dy = candidate.shape.y - center.y;
            const distSq = dx * dx + dy * dy;
            if (distSq < minDistSq) {
              minDistSq = distSq;
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
      const firstSplash = findClosestPlayer(entity.shape, 3250, new Set([entity, this.player]));
      if (firstSplash && !firstSplash.isBot) {
        firstSplash.damaged(this.damage.value * m1, this.player);
        try { firstSplash.flags.set(Types.Flags.Damaged, firstSplash.id); } catch (e) {}
        try { firstSplash.flags.set(Types.Flags.ChainDamaged, firstSplash.id); } catch (e) {}

        // 2nd
        const secondSplash = findClosestPlayer(firstSplash.shape, 3250, new Set([entity, this.player, firstSplash]));
        if (secondSplash && !secondSplash.isBot) {
          secondSplash.damaged(this.damage.value * m2, this.player);
          try { secondSplash.flags.set(Types.Flags.Damaged, secondSplash.id); } catch (e) {}
          try { secondSplash.flags.set(Types.Flags.ChainDamaged, secondSplash.id); } catch (e) {}

          // 3rd
          const thirdSplash = findClosestPlayer(secondSplash.shape, 3250, new Set([entity, this.player, firstSplash, secondSplash]));
          if (thirdSplash && !thirdSplash.isBot) {
            thirdSplash.damaged(this.damage.value * m3, this.player);
            try { thirdSplash.flags.set(Types.Flags.Damaged, thirdSplash.id); } catch (e) {}
            try { thirdSplash.flags.set(Types.Flags.ChainDamaged, thirdSplash.id); } catch (e) {}
          }
        }
      }
    }

    if (entity.type === Types.Entity.Player) {
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

  _spawnThrownSword(angleOffset = 0) {
    this._spawnThrownSwordAt(this.player.angle + angleOffset, this.player.shape.x, this.player.shape.y);
  }

  _spawnThrownSwordAt(angle, x, y) {
    try {
      const ThrownSword = require('./ThrownSword');
      const proj = new ThrownSword(this.game, {
        owner: this.player,
        size: this.size,
        angle: angle,
        speed: this.flySpeed.value,
        damage: this.damage.value * 0.7,
        knockback: this.knockback.value * 0.6,
        duration: this.flyDuration.value,
        skin: this.skin,
        x: x,
        y: y,
      });
      this.game.addEntity(proj);
      this.twinThrowProj = proj;
    } catch (e) {
      console.error('Failed to spawn ThrownSword:', e);
    }
  }

  cleanup() {
    super.cleanup();

    [this.damage, this.knockback, this.swingDuration, this.flySpeed, this.flyDuration, this.flyCooldown].forEach(prop => prop.reset());
    this.swingArc = this.swingAngle;
  }
}

module.exports = Sword;
