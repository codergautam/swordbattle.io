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
    this.handSign = 1;
    this.autoOnly = false;
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
    this.flyCooldown = new Property(9.375); // 7.5 * 1.25 — throws are 25% slower to recharge
    this.playerSpeedBoost = new Property(1.15);

    this.swingTime = 0;
    this.swingProgress = 0;
    this.prevSwingProgress = 0;
    this.hitLandedThisSwing = false;
    this.isFlying = false;
    this.restrictFly = false;
    this.isAnimationFinished = true;
    this.flyTime = 0;
    this.flyCooldownTime = 0;
    this.flyLog = 0;
    this.skin = player.skin;

    this.inputHeldTime = 0;
    this.swingBufferPenalty = 0;
    this.lastSwingPressed = false;
    this.swingRequested = false;

    this.focusTime = 350;
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

  _baseRadius() {
    const r = this.player.shape.radius;
    const evo = this.player.evolutions && this.player.evolutions.evolutionEffect;
    if (evo && evo.isAbilityActive && evo.constructor.abilityScale) {
      return r / evo.constructor.abilityScale;
    }
    return r;
  }

  get size() {
    const r = this._baseRadius();
    return r * this.proportion;
  }

  canCollide(entity) {
    if (this.player.modifiers.attackLocked || entity.modifiers?.phaseImmune) return false;
    const canHit = this.isFlying || this.raiseAnimation || (this.doubleHitActive && this.decreaseAnimation);
    return canHit
      && !this.collidedEntities.has(entity)
      && this.player.depth === entity.depth;
  }

  canSwing() {
    const sequenced = this.autoOnly || this.player.modifiers.battleswords;
    const wantsSwing = sequenced
      ? this.swingRequested
      : (this.player.inputs.isInputDown(Types.Input.SwordSwing) || this.swingRequested);
    return !this.isFlying
      && wantsSwing
      && this.isAnimationFinished
      && this.player.modifiers.invisible == false
      && !this.player.modifiers.attackLocked
      && !this.player.modifiers.stunned
      && !this.player.modifiers.silenced
      && Date.now() >= (this.player._bsThrowUntil || 0)
      && !(this.player.cards.choosingCard && this.player.cards.instantSelect);
  }

  canFly() {
    return !this.autoOnly && !this.isFlying && !this.restrictFly
      && this.player.inputs.isInputDown(Types.Input.SwordThrow)
      && this.flyCooldownTime <= 0
      && this.player.modifiers.invisible == false
      && !this.player.modifiers.attackLocked
      && !this.player.modifiers.stunned
      && !this.player.modifiers.silenced
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
          if (this.player.modifiers.homingThrow && this.game && this.game.entities) {
            let best = null, bestD2 = 2200 * 2200;
            for (const e of this.game.entities.values()) {
              if (!e || e.removed || e === this.player || e.type !== Types.Entity.Player || !e.shape) continue;
              const dx = e.shape.x - this.shape.x, dy = e.shape.y - this.shape.y;
              const d2 = dx * dx + dy * dy;
              if (d2 < bestD2) { bestD2 = d2; best = e; }
            }
            if (best) {
              const desired = Math.atan2(best.shape.y - this.shape.y, best.shape.x - this.shape.x) + Math.PI / 2;
              let d = desired - this.shape.angle;
              while (d > Math.PI) d -= 2 * Math.PI;
              while (d < -Math.PI) d += 2 * Math.PI;
              this.shape.angle += Math.max(-0.055, Math.min(0.055, d));
            }
          }
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

    if (this.twinThrowPending) {
      this.twinThrowDelay -= dt;
      if (this.twinThrowDelay <= 0) {
        this.twinThrowPending = false;
        const a = this.player.angle;
        const r = this.player.shape.radius || 100;
        const px = this.player.shape.x + Math.cos(a) * r + Math.cos(a + Math.PI / 2) * r;
        const py = this.player.shape.y + Math.sin(a) * r + Math.sin(a + Math.PI / 2) * r;
        this._spawnThrownSwordAt(a, px, py);
        if (this.player.modifiers.lungeOnThrow && this.player.velocity) {
          const dash = 320;
          this.player.velocity.x += Math.cos(this.player.angle) * dash;
          this.player.velocity.y += Math.sin(this.player.angle) * dash;
        }
      }
    }

    this.shape.setScale(player.shape.scale);
  }

  _instantHitCheck() {
    const player = this.player;
    const game = player.game;
    if (!game || !game.entitiesQuadtree) return;

    const savedProgress = this.swingProgress;
    const reach = (this._baseRadius() || 200) + this.size * 3 + (player.shape.radius || 100);
    const boundary = {
      x: player.shape.x - reach,
      y: player.shape.y - reach,
      width: reach * 2,
      height: reach * 2,
    };
    const candidates = game.entitiesQuadtree.get(boundary);
    const response = new SAT.Response();

    const tryCollide = (entity) => {
      if (!entity || entity === player || entity === this) return;
      if (entity.removed) return;
      if (this.collidedEntities.has(entity)) return;
      if (!entity.shape || typeof entity.shape.collides !== 'function') return;
      response.clear();
      if (entity.shape.collides(this.shape, response)) {
        if (this.targets.has(entity.type)) {
          this.processTargetsCollision(entity);
        } else if (entity.targets && entity.targets.has && entity.targets.has(this.type)) {
          try { entity.processTargetsCollision(this, response); } catch (e) {}
        }
      }
    };

    this._positionMeleeCollision(player);
    for (const { entity } of candidates) tryCollide(entity);

    this.swingProgress = savedProgress;
    this._positionMeleeCollision(player);
  }

  _sweptHitCheck(fromP, toP) {
    const player = this.player, game = player.game;
    if (!game || !game.entitiesQuadtree) return;
    const savedProgress = this.swingProgress;
    const reach = (this._baseRadius() || 200) + this.size * 3 + (player.shape.radius || 100);
    const boundary = { x: player.shape.x - reach, y: player.shape.y - reach, width: reach * 2, height: reach * 2 };
    const candidates = game.entitiesQuadtree.get(boundary);
    const response = new SAT.Response();
    const tryCollide = (entity) => {
      if (!entity || entity === player || entity === this || entity.removed) return;
      if (this.collidedEntities.has(entity)) return;
      if (!entity.shape || typeof entity.shape.collides !== 'function') return;
      response.clear();
      if (entity.shape.collides(this.shape, response)) {
        if (this.targets.has(entity.type)) this.processTargetsCollision(entity);
        else if (entity.targets && entity.targets.has && entity.targets.has(this.type)) {
          try { entity.processTargetsCollision(this, response); } catch (e) {}
        }
      }
    };
    const arc = Math.abs(this.swingArc) * Math.abs(toP - fromP);
    const steps = Math.max(1, Math.ceil(arc / 0.12));
    for (let i = 0; i <= steps; i++) {
      this.swingProgress = fromP + (toP - fromP) * (i / steps);
      this._positionMeleeCollision(player);
      for (const { entity } of candidates) tryCollide(entity);
    }
    this.swingProgress = savedProgress;
    this._positionMeleeCollision(player);
  }

  _positionMeleeCollision(player) {
    let angle = player.angle + this.handSign * (this.angle + Math.PI / 2);
    if (this.player.modifiers.swingWide) {
      angle += this.handSign * Math.PI / 4;
    }
    const baseR = this._baseRadius();
    const offsetX = baseR - this.size / 2.5;
    const offsetY = (-baseR + this.size / 1.7) * this.handSign;
    if (!this._offsetVec) this._offsetVec = new SAT.Vector(0, 0);
    this._offsetVec.x = offsetX;
    this._offsetVec.y = offsetY;

    this.updateCollisionPoly();
    this.shape.collisionPoly.setAngle(angle);
    this.shape.collisionPoly.setOffset(this._offsetVec);
  }

  updateCollisionPoly() {
    const s = this.size;
    const h = this.handSign;
    const base = [
      [0, 0],
      [-0.14615384615384616 * s, -1.7769230769230768 * s],
      [0.34615384615384615 * s, -2.4923076923076923 * s],
      [0.8538461538461538 * s, -1.7769230769230768 * s],
      [0.7153846153846154 * s, -0.015384615384615385 * s],
    ];
    const verts = (h === 1)
      ? base
      : [base[0], base[4], base[3], base[2], base[1]].map(([x, y]) => [x, -y]);

    const poly = this.shape.collisionPoly;
    const points = poly.points;
    if (points.length === 5) {
      for (let i = 0; i < 5; i++) { points[i].x = verts[i][0]; points[i].y = verts[i][1]; }
      poly.pos.x = this.player.shape.x;
      poly.pos.y = this.player.shape.y;
      poly._recalc();
    } else {
      const pos = new SAT.Vector(this.player.shape.x, this.player.shape.y);
      this.shape.collisionPoly = new SAT.Polygon(pos, verts.map(([x, y]) => new SAT.Vector(x, y)));
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

    if (!this.autoOnly && !this.player.modifiers.battleswords) {
      const swingPressed = this.player.inputs.isInputDown(Types.Input.SwordSwing);

      if (swingPressed && !this.lastSwingPressed && !this.isAnimationFinished) {
        this.swingRequested = true;
      }
      this.lastSwingPressed = swingPressed;

      if (swingPressed && (!this.isAnimationFinished || this.isFlying)) {
        this.inputHeldTime += dt;
      } else if (!swingPressed) {
        this.inputHeldTime = 0;
      }
    }

    if (this.canSwing()) {
      this.isFlying = false;
      this.flyTime = 0;
      this.decreaseAnimation = false;
      this.swingTime = 0;
      this.swingProgress = 0;
      this.prevSwingProgress = 0;
      this.collidedEntities.clear();
      this.hitLandedThisSwing = false;
      this.raiseAnimation = true;
      this.isAnimationFinished = false;
      this.swingBufferPenalty = this.inputHeldTime;
      this.inputHeldTime = 0;
      this.swingRequested = false;
      if (!this.autoOnly) {
        this.player.flags.set(Types.Flags.SwordSwing, true);

        if (this.player.evolutions && this.player.evolutions.evolutionEffect && typeof this.player.evolutions.evolutionEffect.onSwordSwing === 'function') {
          try {
            this.player.evolutions.evolutionEffect.onSwordSwing();
          } catch (e) {
            //
          }
        }
        if (this.player.upgrades) this.player.upgrades.hook('onSwordSwing');
      }

      this._instantHitCheck();

      const hasDoubleHit = (this.player.cards && this.player.cards.hasMajor(102))
        || this.player.modifiers.strikeTwice;
      this.doubleHitActive = !!hasDoubleHit;
      this.doubleHitCleared = false;

      const elapsed = Date.now() - this.lastSwordSwing;
      const multiplier = elapsed / this.focusTime;
      this.focusDamageMultiplier = Math.max(0.4, Math.min(1.35, multiplier));
    }
    if (this.canFly()) {
      const hasSpareSword = this.player.cards && this.player.cards.hasMajor(106);

      if (this.player.modifiers.kunais) {
        const a = this.player.angle;
        const r = this.player.shape.radius || 100;
        const hx = this.player.shape.x + Math.cos(a) * r + Math.cos(a + Math.PI / 2) * r;
        const hy = this.player.shape.y + Math.sin(a) * r + Math.sin(a + Math.PI / 2) * r;
        for (const off of [-0.1, 0, 0.1]) {
          this._spawnThrownSwordAt(a + off, hx, hy, { sizeScale: 0.55, damageScale: 0.5, speedScale: 0.65, durationScale: 0.7 });
        }
        this.flyCooldownTime = this.flyCooldown.value;
        this.player.flags.set(Types.Flags.SwordThrow, true);
        this.player.inputs.inputUp(Types.Input.SwordThrow);
        this.player._bsThrowUntil = Date.now() + 900;
      } else if (hasSpareSword) {
        // Spare Sword (106)

        this._spawnThrownSword(0);
        this.flyCooldownTime = this.flyCooldown.value;
        this.player.flags.set(Types.Flags.SwordThrow, true);
        this.player.inputs.inputUp(Types.Input.SwordThrow);
      } else if (this.player.modifiers.battleswords) {
        const a = this.player.angle;
        const perp = a + Math.PI / 2;
        const off = (this.player.shape.radius || 100) * 0.9;
        const spd = this.flySpeed.value;
        for (const s of [-1, 1]) {
          const sx = this.player.shape.x + Math.cos(perp) * off * s;
          const sy = this.player.shape.y + Math.sin(perp) * off * s;
          const proj = this._spawnThrownSwordAt(a, sx, sy);
          if (proj && proj.shape) { proj.shape.x += spd * Math.cos(a); proj.shape.y += spd * Math.sin(a); }
        }
        this.flyCooldownTime = this.flyCooldown.value;
        this.player.flags.set(Types.Flags.SwordThrow, true);
        this.player.inputs.inputUp(Types.Input.SwordThrow);
        this.player._bsThrowUntil = Date.now() + 1400;
      } else {
        this.isFlying = true;
        this.shape.angle = this.player.angle + Math.PI / 2;
        {
          const s = this.size;
          this.updateCollisionPoly();
          this.shape.collisionPoly.setOffset(new SAT.Vector(-0.35 * s, 1.25 * s));
          this.shape.collisionPoly.setAngle(this.player.angle + Math.PI / 2);
        }
        {
          const a = this.player.angle;
          const r = this.player.shape.radius || 100;
          this.shape.x = this.player.shape.x + Math.cos(a) * r + Math.cos(a + Math.PI / 2) * r;
          this.shape.y = this.player.shape.y + Math.sin(a) * r + Math.sin(a + Math.PI / 2) * r;
        }
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

        if (this.player.modifiers.battleswords) {
          const a = this.player.angle;
          const perp = a - Math.PI / 2;
          const off = (this.player.shape.radius || 100) * 0.5;
          this._spawnThrownSwordAt(a, this.player.shape.x + Math.cos(perp) * off, this.player.shape.y + Math.sin(perp) * off);
        }

        if (this.player.modifiers.lungeOnThrow) {
          const a = this.player.angle;
          const dash = 320;
          this.player.velocity.x += Math.cos(a) * dash;
          this.player.velocity.y += Math.sin(a) * dash;
        }

        if ((this.player.cards && this.player.cards.hasMajor(104)) || this.player.modifiers.twinThrowUp) {
          this.twinThrowPending = true;
          this.twinThrowDelay = 0.3;
          this.twinThrowSavedAngle = this.player.angle;
          this.twinThrowSavedX = this.player.shape.x;
          this.twinThrowSavedY = this.player.shape.y;

        }
      }
    }

    if (!this.isAnimationFinished && !this.raiseAnimation
        && (!this.player.inputs.isInputDown(Types.Input.SwordSwing) || this.player.modifiers.battleswords)) {
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
      const fromP = this.prevSwingProgress;
      this.swingTime += dt;
      let ended = false;
      if (this.swingTime >= this.swingDuration.value) {
        this.swingTime = this.swingDuration.value;
        ended = true;
      }
      const toP = this.swingDuration.value > 0 ? this.swingTime / this.swingDuration.value : 1;
      this._sweptHitCheck(fromP, toP);
      this.prevSwingProgress = toP;
      if (ended) this.raiseAnimation = false;
    }
    if (this.decreaseAnimation) {
      this.swingTime -= dt;
      if (this.swingTime <= 0) {
        this.swingTime = 0;
        this.decreaseAnimation = false;
        this.collidedEntities.clear();
        this.isAnimationFinished = true;
        this.doubleHitActive = false;

        if (!this.autoOnly) {
          if (this.player.evolutions && this.player.evolutions.evolutionEffect && typeof this.player.evolutions.evolutionEffect.onSwingEnd === 'function') {
            try {
              this.player.evolutions.evolutionEffect.onSwingEnd(!this.hitLandedThisSwing);
            } catch (e) {
              //
            }
          }
          if (this.player.upgrades) this.player.upgrades.hook('onSwingEnd', !this.hitLandedThisSwing);
        }
        this.hitLandedThisSwing = false;
      }
    }

    this.swingProgress = this.swingTime / this.swingDuration.value;
    this.restrictFly = false;
  }
processTargetsCollision(entity) {
    if (entity === this.player) return;
    if (!this.canCollide(entity)) return;
    if (entity.cards && entity.cards.choosingCard && entity.cards.instantSelect) return;
    if (entity.cards && entity.cards.isTutorial && this.player.type === Types.Entity.Player && !this.player.isBot) return;
    if (this.player.cards && this.player.cards.isTutorial && entity.type === Types.Entity.Player) {
      if (!entity.isBot) {
        this.player.flags.set(Types.Flags.TutorialHitBlocked, true);
      }
      return;
    }
    
    // safezone
    if (this.player.modifiers.safe && entity.type === Types.Entity.Player && !this.player.isBot) return;
    if (entity.type === Types.Entity.Player && entity.modifiers.safe && !entity.isBot) return;

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

    const angle = Math.atan2(this.player.shape.y - entity.shape.y, this.player.shape.x - entity.shape.x);

    let power;
    if (isHumanVsHuman && targetRespawnShield) {
      power = this.knockback.value * 2;
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

    if (this.player.cards) {
      power *= this.player.cards.getKnockbackMultiplier(entity);
    }

    if (this.isFlying) {
      power *= 0.75;
    }

    if (entity.type === Types.Entity.Player && entity.modifiers && entity.modifiers.noKnockback) {
      power = 0;
    }

    const xComp = power * Math.cos(angle);
    const yComp = power * Math.sin(angle);
    // Boomerang (105)
    const knockbackDir = (this.boomerangReturning) ? 1 : -1;
    entity.velocity.x = knockbackDir * xComp;
    entity.velocity.y = knockbackDir * yComp;

    let damageApplied = false;
    if (!respawnShielded && ((this.isFlying && !this.raiseAnimation && !this.decreaseAnimation) ||
      (!this.isFlying && (this.raiseAnimation || this.decreaseAnimation)))) {
        damageApplied = true;

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

        if (!isThrown && this.swingBufferPenalty > 0.22) {
          const pen = Math.max(0.7, 1 - (this.swingBufferPenalty - 0.22) * 1.5);
          finalDamage *= pen;
        }

        if (this.player.modifiers.damageScale) {
          const bonus = 1 + 0.5 * (1 - this.player.health.percent);
          finalDamage *= bonus;
        }

        if (this.player.modifiers.pacifist && entity.type === Types.Entity.Player) {
          finalDamage *= 0.5;
        }

        if (this.player.cards) {
          finalDamage *= this.player.cards.onHitEntity(entity, finalDamage, isThrown);
          finalDamage *= this.player.cards.getDamageDealtMultiplier(entity);
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
    if (!this.isFlying) {
      this.hitLandedThisSwing = true;
    }
    this.player.flags.set(Types.Flags.EnemyHit, entity.id);

    if (damageApplied && this.player.evolutions && this.player.evolutions.evolutionEffect && typeof this.player.evolutions.evolutionEffect.onHit === 'function') {
      try {
        const fairnessMult = respawnFadeMult;
        this.player.evolutions.evolutionEffect.onHit(entity, this.isFlying, fairnessMult);
      } catch (e) {
        //
      }
    }
    if (damageApplied && this.player.upgrades) {
      this.player.upgrades.hook('onHit', entity, this.isFlying, respawnFadeMult);
    }

    if (entity.type === Types.Entity.Player && !entity.isBot) {
      if (this.player.evolutions && this.player.evolutions.evolutionEffect && typeof this.player.evolutions.evolutionEffect.onDamage === 'function') {
        try {
          this.player.evolutions.evolutionEffect.onDamage(entity, this.isFlying);
        } catch (e) {
          //
        }
      }
      if (this.player.upgrades) this.player.upgrades.hook('onDamage', entity, this.isFlying);
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

  _spawnThrownSwordAt(angle, x, y, opts = {}) {
    try {
      const ThrownSword = require('./ThrownSword');
      const sizeScale = opts.sizeScale || 1;
      const damageScale = opts.damageScale != null ? opts.damageScale : 0.7;
      const speedScale = opts.speedScale || 1;
      const durationScale = opts.durationScale || 1;
      const proj = new ThrownSword(this.game, {
        owner: this.player,
        size: this.size * sizeScale,
        angle: angle,
        speed: this.flySpeed.value * speedScale,
        damage: this.damage.value * damageScale,
        knockback: this.knockback.value * 0.45, // 0.6 * 0.75 — throws are 25% weaker on knockback
        duration: this.flyDuration.value * durationScale,
        skin: this.skin,
        x: x,
        y: y,
      });
      this.game.addEntity(proj);
      this.twinThrowProj = proj;
      return proj;
    } catch (e) {
      console.error('Failed to spawn ThrownSword:', e);
      return null;
    }
  }

  cleanup() {
    super.cleanup();

    [this.damage, this.knockback, this.swingDuration, this.flySpeed, this.flyDuration, this.flyCooldown].forEach(prop => prop.reset());
    this.swingArc = this.swingAngle;
  }
}

module.exports = Sword;
