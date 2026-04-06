const SAT = require('sat');
const Inputs = require('../components/Inputs');
const Entity = require('./Entity');
const Circle = require('../shapes/Circle');
const Sword = require('./Sword');
const Effect = require('../effects/Effect');
const SpeedEffect = require('../effects/SpeedEffect');
const SlippingEffect = require('../effects/SlippingEffect');
const BurningEffect = require('../effects/BurningEffect');
const SlidingKnockbackEffect = require('../effects/SlidingKnockbackEffect');
const StunEffect = require('../effects/StunEffect');
const SlowEffect = require('../effects/SlowEffect');
const LevelSystem = require('../components/LevelSystem');
const Property = require('../components/Property');
const Viewport = require('../components/Viewport');
const Health = require('../components/Health');
const Timer = require('../components/Timer');
const EvolutionSystem = require('../evolutions');
const CardSystem = require('../components/CardSystem');
const Types = require('../Types');
const config = require('../../config');
const { clamp, calculateGemsXP, filterChatMessage } = require('../../helpers');
const { skins } = require('../../cosmetics.json');
const api = require('../../network/api');

// Check if any duplicate ids in cosmetics.json
function checkForDuplicates() {
  const ids = new Set();
  for (const skin of Object.values(skins)) {
    ids.add(skin.id);
  }
  if (ids.size !== Object.keys(skins).length) {
    console.error('Duplicate skin ids found in cosmetics.json');

    // Find specific duplicates
    const duplicates = {};
    for (const skin of Object.values(skins)) {
      if (duplicates[skin.id]) {
        duplicates[skin.id].push(skin);
      } else {
        duplicates[skin.id] = [skin];
      }
    }
    for (const id in duplicates) {
      if (duplicates[id].length > 1) {
        console.error(`Duplicate id: ${id}`);
        for (const skin of duplicates[id]) {
          console.error(`  ${skin.name}`);
        }
      }
    }
    process.exit(1);
  }
}

checkForDuplicates();

const filter = null;

class Player extends Entity {
  constructor(game, name) {
    super(game, Types.Entity.Player);
    this.name = name;
    this.isGlobal = true;
    this.client = null;
    this.movedDistance = new SAT.Vector(0, 0);
    this.movementDirection = 0;
    this.angle = 0;
    this.inputs = new Inputs();
    this.lastDirectionInput = 3; // down
    this.mouse = null;
    this.targets.add(Types.Entity.Player);
    this.skin = skins.player.id;
    this.coinShield = 500;

    const { speed, radius, maxHealth, regeneration, viewport } = config.player;
    this.shape = Circle.create(0, 0, radius);
    if (this.name === "Update Testing Account") {
      this.speed = new Property(1000);
    } else {
      this.speed = new Property(speed);
    }
    this.health = new Health(maxHealth, regeneration);
    this.friction = new Property(1);
    this.regeneration = new Property(regeneration);
    this.knockbackResistance = new Property(1);

    this.startTimestamp = Date.now();
    this.kills = 0;
    this.biome = 0;
    this.inSafezone = true;

    this.viewport = new Viewport(this, viewport.width, viewport.height, viewport.zoom);
    this.viewportEntityIds = [];
    this.effects = new Map();
    this.flags = new Map();
    this.sword = new Sword(this);
    this.game.addEntity(this.sword);
    this.levels = new LevelSystem(this);
    this.evolutions = new EvolutionSystem(this);
    this.tamedEntities = new Set();

    this.cards = new CardSystem(this);
    this.throwDamageMultiplier = 1;
    this.coinMultiplier = 1;
    this.damageReduction = 1;        // <1 = takes less damage, >1 = takes more
    this.chestDamageMultiplier = 1;  // PvE Master card

    this.modifiers = {};
    this.wideSwing = false;
    this.isFirstLife = false;

    this.respawnShieldActive = false;
    this.respawnShieldTimer = 0;
    this.respawnShieldFadeActive = false;
    this.respawnShieldFadeTimer = 0;
    this.respawnShieldFadeMult = 1;
    this.respawnedAt = 0;
    this.respawnKillerName = null;
    this.killerEntity = null;

    this.chatMessage = '';
    this.chatMessageTimer = new Timer(0, 3);

    this.combatLog = new Map();
    this.teamDisadvantage = null;

    this.hypnotizedBy = null;
  }

  get playtime() {
    return Math.round((Date.now() - this.startTimestamp) / 1000);
  }

  createState() {
    const state = super.createState();
    state.name = this.name;
    state.account = this.client && this.client.account;
    state.angle = this.angle;
    state.kills = this.kills;
    state.flags = {};
    for (const flag of Object.values(Types.Flags)) {
      state.flags[flag] = this.flags.has(flag) ? this.flags.get(flag) : false;
    }

    state.biome = this.biome;
    state.level = this.levels.level;
    state.coins = this.levels.coins;
    state.tokens = this.levels.tokens;
    state.nextLevelCoins = this.levels.nextLevelCoins;
    state.previousLevelCoins = this.levels.previousLevelCoins;
    state.upgradePoints = this.levels.upgradePoints;
    state.skin = this.skin;

    state.buffs = structuredClone(this.levels.buffs);

    state.cardOffers = this.cards.cardOffers.length > 0 ? [...this.cards.cardOffers] : [];
    state.chosenCards = [...this.cards.chosenCards];
    state.choosingCard = this.cards.choosingCard;
    state.cardTimer = this.cards.cardTimer;
    state.cardPickNumber = this.cards.cardPickNumber;
    state.availableUpgrades = this.cards.availableUpgrades;
    state.rerollsAvailable = this.cards.rerollsAvailable;
    state.pendingPicks = this.cards.pendingPicks;
    state.skipResults = this.cards.lastSkipResults.length > 0 ? [...this.cards.lastSkipResults] : [];
    state.isTutorial = this.cards.isTutorial;

    state.evolution = this.evolutions.evolution;
    state.possibleEvolutions = {};
    this.evolutions.possibleEvols.forEach(evol => state.possibleEvolutions[evol] = true);

    state.isAbilityAvailable = this.evolutions.evolutionEffect.isAbilityAvailable;
    state.abilityActive = this.evolutions.evolutionEffect.isAbilityActive;
    state.abilityDuration = this.evolutions.evolutionEffect.durationTime;
    state.abilityCooldown = this.evolutions.evolutionEffect.cooldownTime;

    state.viewportZoom = this.viewport.zoom.value;
    state.chatMessage = this.chatMessage;

    state.swordSwingAngle = this.sword.swingAngle;
    state.swordSwingArc = this.sword.swingArc;
    state.swordSwingProgress = this.sword.swingProgress;
    state.swordSwingDuration = this.sword.swingDuration.value;
    state.swordRaising = this.sword.raiseAnimation;
    state.swordDecreasing = this.sword.decreaseAnimation;
    state.swordFlying = this.sword.isFlying;
    state.swordFlyingCooldown = this.sword.flyCooldownTime;
    state.swordBoomerangReturning = this.sword.boomerangReturning;
    state.wideSwing = this.wideSwing;
    state.coinShield = this.coinShield;
    if (this.removed && this.client) {
      state.disconnectReasonMessage = this.client.disconnectReason.message;
      state.disconnectReasonType = this.client.disconnectReason.type;
    }
    return state;
  }

  update(dt) {
    this.applyBiomeEffects();

    if (this.respawnShieldTimer > 0) {
      this.respawnShieldTimer -= dt;
      this.respawnShieldActive = true;
      this.respawnShieldFadeMult = 0;
      this.flags.set(Types.Flags.RespawnShield, 1);
      if (this.respawnShieldTimer <= 0) {
        this.respawnShieldTimer = 0;
        this.respawnShieldActive = false;
        this.respawnShieldFadeActive = true;
        this.respawnShieldFadeTimer = 5;
      }
    } else if (this.respawnShieldFadeActive) {
      this.respawnShieldFadeTimer -= dt;
      this.respawnShieldFadeMult = 1 - Math.max(0, this.respawnShieldFadeTimer / 5);
      this.flags.set(Types.Flags.RespawnShield, 2);
      if (this.respawnShieldFadeTimer <= 0) {
        this.respawnShieldFadeTimer = 0;
        this.respawnShieldFadeActive = false;
        this.respawnShieldFadeMult = 1;
      }
    } else if (this.respawnShieldActive) {
      this.respawnShieldActive = false;
    }

    for (const [id, log] of this.combatLog) {
      const decay = Math.max(0, 1 - dt * 0.1);
      log.damageDealt *= decay;
      log.damageReceived *= decay;
      if (log.damageDealt < 1 && log.damageReceived < 1) {
        this.combatLog.delete(id);
      }
    }

    const now = Date.now();
    if (this.teamDisadvantage && now < this.teamDisadvantage.expiry && !this.isBot) {
      const encoded = this.teamDisadvantage.enemyTeam * 10 + this.teamDisadvantage.myTeam;
      this.flags.set(Types.Flags.AntiTeamActive, encoded);
    }

    this.levels.applyBuffs();
    this.cards.update(dt);
    this.cards.applyCardEffects();

    if (this.teamDisadvantage && now < this.teamDisadvantage.expiry && !this.isBot) {
      const regenMult = Math.max(0.25, this.teamDisadvantage.myTeam / this.teamDisadvantage.enemyTeam);
      this.health.regenWait.multiplier *= regenMult;
    }

    this.effects.forEach(effect => effect.update(dt));
    if (!this.cards.choosingCard || !this.cards.instantSelect) {
      this.health.update(dt);
    }
    this.applyInputs(dt);
    this.sword.flySpeed.value = clamp(this.speed.value / 10, 100, 200);
    this.sword.update(dt);

    if (this.inputs.isInputDown(Types.Input.Ability) && this.evolutions.evolutionEffect.canActivateAbility && !this.modifiers.stunned) {
      this.evolutions.evolutionEffect.activateAbility();
    }

    this.viewport.zoom.multiplier /= this.shape.scaleRadius.multiplier;

    if (this.chatMessage && (!this.cards.choosingCard || !this.cards.instantSelect)) {
      this.chatMessageTimer.update(dt);
      if (this.chatMessageTimer.finished) {
        this.chatMessage = '';
      }
    }
  }

  tameWolf(wolf) {
    this.tamedEntities.add(wolf.id);
  }

  applyBiomeEffects() {
    const response = new SAT.Response();
    let topBiome = null;
    let topZIndex = -Infinity;
    let foundSafezone = false;

    const appliedBiomeTypes = new Set();

    for (const biome of this.game.map.biomes) {
      if (biome.shape.collides(this.shape, response)) {
        biome.collides(this, response);

        if (biome.type === Types.Biome.Safezone) {
          foundSafezone = true;
          if (!this.inSafezone) continue;
        }

        if (!appliedBiomeTypes.has(biome.type)) {
          appliedBiomeTypes.add(biome.type);
          biome.applyEffects(this, response);
        }

        if (biome.zIndex > topZIndex) {
          topZIndex = biome.zIndex;
          topBiome = biome;
        }
      }
    }

    if (topBiome) {
      this.biome = topBiome.type;
    }

    if (!foundSafezone) {
      this.inSafezone = false;
    }
  }

  processTargetsCollision(entity, response) {
    if (this.cards.choosingCard && this.cards.instantSelect) return;

    if (this.modifiers.ramThrow && this.sword.isFlying) {
      return
    } else {
      const selfWeight = this.weight;
      const targetWeight = entity.weight;
      const totalWeight = selfWeight + targetWeight;

      const mtv = this.shape.getCollisionOverlap(response);
      const selfMtv = mtv.clone().scale(targetWeight / totalWeight);
      const targetMtv = mtv.clone().scale(selfWeight / totalWeight * -1);

      this.shape.applyCollision(selfMtv);
      entity.shape.applyCollision(targetMtv);
    }
  }

  applyInputs(dt) {
    if (this.cards.choosingCard && this.cards.instantSelect && !this.cards.isTutorial) {
      this.velocity.x = 0;
      this.velocity.y = 0;
      return;
    }

    // If stunned, prevent all movement
    if (this.modifiers.stunned) {
      return;
    }

    if (this.hypnotizedBy && !this.hypnotizedBy.removed) {
      const target = this.hypnotizedBy;
      const angle = Math.atan2(target.shape.y - this.shape.y, target.shape.x - this.shape.x);
      this.angle = angle;
      const speed = this.speed.value;

      this.shape.x += this.velocity.x;
      this.shape.y += this.velocity.y;
      const velocityDecay = this.modifiers.slidingKnockback || 0.6;
      this.velocity.scale(velocityDecay);

      this.shape.x += speed * Math.cos(angle) * dt;
      this.shape.y += speed * Math.sin(angle) * dt;

      this.shape.x = clamp(this.shape.x, -this.game.map.width / 2, this.game.map.width / 2);
      this.shape.y = clamp(this.shape.y, -this.game.map.height / 2, this.game.map.height / 2);

      this.movedDistance.x = speed * Math.cos(angle);
      this.movedDistance.y = speed * Math.sin(angle);
      return;
    }

    const isMouseMovement = this.mouse !== null;

    let speed = this.speed.value;
    let dx = 0;
    let dy = 0;

    if (isMouseMovement) {
      const mouseDistanceFullStrength = 150;
      const mouseAngle = this.mouse.angle;
      const mouseDistance = Math.min(this.mouse.force, mouseDistanceFullStrength);
      speed *= mouseDistance / mouseDistanceFullStrength;
      this.movementDirection = mouseAngle;
      dx = speed * Math.cos(this.movementDirection);
      dy = speed * Math.sin(this.movementDirection);

      if(this.modifiers.disableDiagonalMovement) {
        if (Math.abs(dx) > Math.abs(dy)) {
          dy = 0;
          dx = dx > 0 ? speed : -speed;
        } else {
          dx = 0;
          dy = dy > 0 ? speed : -speed;
        }
      }
    } else {
      let directionX = 0;
      let directionY = 0;

      if (this.inputs.isInputDown(Types.Input.Up)) {
        directionY = -1;
        this.lastDirectionInput = 1;
      } else if (this.inputs.isInputDown(Types.Input.Down)) {
        directionY = 1;
        this.lastDirectionInput = 3;
      }

      if (this.inputs.isInputDown(Types.Input.Right)) {
        directionX = 1;
        this.lastDirectionInput = 2;
      } else if (this.inputs.isInputDown(Types.Input.Left)) {
        directionX = -1;
        this.lastDirectionInput = 4;
      }

      if (directionX !== 0 || directionY !== 0) {
        this.movementDirection = Math.atan2(directionY, directionX);
        dx = speed * Math.cos(this.movementDirection);
        dy = speed * Math.sin(this.movementDirection);

        if(this.modifiers.disableDiagonalMovement) {
          if (directionX !== 0 && directionY !== 0) {
            dy = directionY * speed;
            dx = 0;
          }
        }
      } else {
        this.movementDirection = 0;
      }
    }

    if (isNaN(this.velocity.x) || isNaN(this.velocity.y)) {
      console.error(`[VELOCITY_NAN] Player "${this.name}" (id=${this.id}) velocity is NaN! vx=${this.velocity.x}, vy=${this.velocity.y}, pos=(${this.shape.x},${this.shape.y}), effects=[${[...this.effects.keys()]}]`);
      this.velocity.x = 0;
      this.velocity.y = 0;
    }

    this.shape.x += this.velocity.x;
    this.shape.y += this.velocity.y;

    // Use higher decay for sliding knockback effect (slower deceleration = longer slide)
    const velocityDecay = this.modifiers.slidingKnockback || 0.6;
    this.velocity.scale(velocityDecay);

    const slide = this.movedDistance;
    const friction = 1 - this.friction.value;
    if (isNaN(friction)) {
      console.error(`[FRICTION_NAN] Player "${this.name}" (id=${this.id}) friction is NaN! friction.value=${this.friction.value}, base=${this.friction.baseValue}, mult=${this.friction.multiplier}, boost=${this.friction.boost}`);
      slide.x = 0;
      slide.y = 0;
    } else {
      slide.scale(friction);
    }

    dx += slide.x;
    dy += slide.y;

    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (absDx > speed) {
      dx *= speed / absDx;
    }
    if (absDy > speed) {
      dy *= speed / absDy;
    }

    if (isNaN(dx) || isNaN(dy)) {
      if (!this._nanLogged) {
        console.error(`[POSITION_NAN] Player "${this.name}" (id=${this.id}) dx/dy became NaN! dx=${dx}, dy=${dy}, dt=${dt}, speed=${speed}, mouse=${JSON.stringify(this.mouse)}, velocity=${JSON.stringify(this.velocity)}, friction=${this.friction.value}, pos=(${this.shape.x},${this.shape.y})`);
        this._nanLogged = true;
      }
      dx = isNaN(dx) ? 0 : dx;
      dy = isNaN(dy) ? 0 : dy;
      this.velocity.x = 0;
      this.velocity.y = 0;
    } else {
      this._nanLogged = false;
    }

    this.shape.x += dx * dt;
    this.shape.y += dy * dt;

    this.movedDistance.x = dx;
    this.movedDistance.y = dy;

    this.shape.x = clamp(this.shape.x, -this.game.map.width / 2, this.game.map.width / 2);
    this.shape.y = clamp(this.shape.y, -this.game.map.height / 2, this.game.map.height / 2);
  }

  damaged(damage, entity = null, isThrown = false) {
    if (this.cards.choosingCard && this.cards.instantSelect && !this.cards.isTutorial) return;
    if (this.removed) return;

    const origDamage = damage;
    damage *= this.damageReduction;

    const cardDmgMult = this.cards.onDamaged(damage, entity);
    damage *= cardDmgMult;

    damage *= this.cards.getDamageTakenMultiplier(entity, isThrown);

    if (isNaN(damage) || !isFinite(damage)) {
      console.error(`[DAMAGE_BUG] "${this.name}" received NaN/Inf damage! orig=${origDamage}, dmgReduction=${this.damageReduction}, cardMult=${cardDmgMult}, entity=${entity?.type}`);
      return;
    }


    if (entity && entity.type === Types.Entity.Player && !this.isBot && !entity.isBot) {
      const attackerCoins = (entity.levels && typeof entity.levels.coins === 'number') ? entity.levels.coins : 0;
      const defenderCoins = (this.levels && typeof this.levels.coins === 'number') ? this.levels.coins : 0;
      const shieldThreshold = this.coinShield || 500;

      if (attackerCoins >= shieldThreshold && defenderCoins >= shieldThreshold) {
        if (!this.combatLog.has(entity.id)) {
          this.combatLog.set(entity.id, { damageDealt: 0, damageReceived: 0 });
        }
        this.combatLog.get(entity.id).damageReceived += damage;

        if (!entity.combatLog.has(this.id)) {
          entity.combatLog.set(this.id, { damageDealt: 0, damageReceived: 0 });
        }
        entity.combatLog.get(this.id).damageDealt += damage;
      }
    }

    if (this.name !== "Update Testing Account") {
      this.health.damaged(damage);
    }

    if (this.cards.isTutorial && this.health.isDead) {
      this.health.percent = 1;
      this.health.isDead = false;
      this.flags.set(Types.Flags.TutorialSaved, true);
      return;
    }

    if (this.evolutions && this.evolutions.evolutionEffect && typeof this.evolutions.evolutionEffect.onDamaged === 'function') {
      try {
        this.evolutions.evolutionEffect.onDamaged(entity);
      } catch (e) {
        //
      }
    }


    if (this.health.isDead) {
      let reason = 'Unknown Entity';
      let disconnectType = Types.DisconnectReason.Mob;

      if (entity) {
        switch (entity.type) {
          case Types.Entity.Player: reason = entity.name; break;
          case Types.Entity.LavaPool: reason = 'Lava'; break;
          case Types.Entity.Wolf: reason = 'A Wolf'; break;
          case Types.Entity.Cat: reason = 'A Cat'; break;
          case Types.Entity.Moose: reason = 'A Moose'; break;
          case Types.Entity.AngryFish: reason = 'A Fish'; break;
          case Types.Entity.Yeti: reason = 'A Yeti'; break;
          case Types.Entity.IceSpirit: reason = 'An Ice Spirit'; break;
          case Types.Entity.Chimera: reason = 'A Chimera'; break;
          case Types.Entity.Roku: reason = 'Roku'; break;
          case Types.Entity.Snowball: reason = 'Big Yeti'; break; // the yeti boss throws snowballs
          case Types.Entity.Fireball: reason = 'Roku'; break; // the roku throws fireballs
          case Types.Entity.SwordProj: reason = 'An Ancient Statue'; break; // the ancient statue throws swords
          case Types.Entity.Ancient: reason = 'An Ancient Statue'; break;
          case Types.Entity.Boulder: reason = 'An Ancient Statue'; break; // the ancient statue throws boulders
        }

        disconnectType = (entity.type === Types.Entity.Player) ? Types.DisconnectReason.Player : Types.DisconnectReason.Mob;

        if (entity.type === Types.Entity.Player) {
          try {
            entity.kills = (entity.kills || 0) + 1;
            entity.flags.set(Types.Flags.PlayerKill, this.id);
            entity.cards.onKill(this);
          } catch (e) { /* */ }
          try {
            this.flags.set(Types.Flags.PlayerDeath, true);
          } catch (e) { /* */ }
        }
      }

      console.log(`[DEATH] "${this.name}" (id=${this.id}) killed by "${reason}" | pos=(${Math.round(this.shape.x)},${Math.round(this.shape.y)}) | hp=${this.health.percent.toFixed(3)} | finalDmg=${damage.toFixed(2)} | dmgReduction=${this.damageReduction.toFixed(3)} | coins=${this.levels.coins} | entity=${entity ? entity.type + '(id=' + entity.id + ',pos=' + Math.round(entity.shape.x) + ',' + Math.round(entity.shape.y) + ')' : 'null'} | isBot=${!!this.isBot} | effects=[${[...this.effects.keys()]}]`);

      this.killerEntity = entity;
      this.remove(reason, disconnectType);
    }
  }

  addEffect(type, id, config) {
    let EffectClass = Effect;
    switch (type) {
      case Types.Effect.Speed: EffectClass = SpeedEffect; break;
      case Types.Effect.Slipping: EffectClass = SlippingEffect; break;
      case Types.Effect.Burning: EffectClass = BurningEffect; break;
      case Types.Effect.SlidingKnockback: EffectClass = SlidingKnockbackEffect; break;
      case Types.Effect.Stun: EffectClass = StunEffect; break;
      case Types.Effect.Slow: EffectClass = SlowEffect; break;
    }

    if (!id) id = Math.random();
    if (this.effects.has(id)) {
      this.effects.get(id).continue(config);
    } else {
      const effect = new EffectClass(this, id, config);
      this.effects.set(id, effect);
    }
  }

  addChatMessage(message) {
    if (message.length === '') return;

    const originalMessage = message.slice(0, 35);
    const result = filterChatMessage(originalMessage, filter);
    this.chatMessage = result.filtered;
    this.chatMessageTimer.renew();

    if (result.matched.length > 0) {
      this.logSwearingIncident(originalMessage, result.matched);
    }
  }

  logSwearingIncident(message, matchedWords) {
    const data = {
      username: this.name,
      account_id: this.client?.account?.id,
      ip: this.client?.ip,
      message: message,
      matched_words: matchedWords,
    };
    api.post('/moderation/log-swearing', data, () => {});
  }

  getEntitiesInViewport() {
    const results = this.game.entitiesQuadtree.get(this.viewport.boundary);
    const ids = [];
    for (let i = 0; i < results.length; i++) {
      ids.push(results[i].entity.id);
    }
    this.viewportEntityIds = ids;
    return this.viewportEntityIds;
  }

  remove(message = 'Server', type = Types.DisconnectReason.Server) {
    if (this.client) {
      this.client.disconnectReason = {
        message: message,
        type: type
      }
      const game = {
        coins: this.levels.coins,
        tokens: this.levels.tokens,
        kills: this.kills,
        playtime: this.playtime,
      };
      this.client.saveGame(game);

      // Insurance card
      const hasInsurance = this.cards.hasMajor(130);
      const alreadyUsedInsurance = this.client.insuranceUsed;
      if (hasInsurance && !alreadyUsedInsurance) {
        const insuranceGold = Math.round(this.levels.coins * 0.40);
        this.client.insuranceUsed = true;
        this.client.insurancePostDeath = true;
        this.client.pendingRespawn = {
          coins: insuranceGold,
          x: this.shape.x,
          y: this.shape.y,
          killerName: (this.killerEntity && this.killerEntity.type === Types.Entity.Player) ? this.killerEntity.name : null,
          expiresAt: Date.now() + 120000,
          carryKills: this.kills,
          carryPlaytime: this.playtime,
        };

      } else if (this.client.insurancePostDeath) {
        // After insurance respawn with 0
        this.client.pendingRespawn = null;
        this.client.insurancePostDeath = false;
        this.client.insuranceUsed = false; // Reset so Insurance can be picked again

      } else if (this.levels.coins >= 10000 && this.playtime >= 120) {
        const dropAmount = this.calculateDropAmount();
        const respawnCoins = Math.round(dropAmount / 2);
        this.client.pendingRespawn = {
          coins: respawnCoins,
          x: this.shape.x,
          y: this.shape.y,
          killerName: (this.killerEntity && this.killerEntity.type === Types.Entity.Player) ? this.killerEntity.name : null,
          expiresAt: Date.now() + 120000,
        };
      }
    }

    if (this.cards.choosingCard) {
      this.cards.cancelPick();
    }

    if (this.evolutions && this.evolutions.evolutionEffect) {
      this.evolutions.evolutionEffect.remove();
    }

    super.remove();

    if (this.name !== "Update Testing Account" && !this.cards.isTutorial) {
      let dropAmount = this.calculateDropAmount();
      if (this.client && this.client.insuranceUsed && this.cards.hasMajor(130)) {
        const keptGold = Math.round(this.levels.coins * 0.40);
        dropAmount = Math.max(0, dropAmount - keptGold);
      }
      this.game.map.spawnCoinsInShape(this.shape, dropAmount, this.client?.account?.id);
    }
  }

  calculateDropAmount() {
    const coins = this.levels.coins;
    let base = coins < 13 ? 10 : Math.round(coins < 25000 ? coins * 0.8 : Math.log10(coins) * 30000 - 111938.2002602);

    if (this.respawnedAt > 0) {
      const timeSinceRespawn = Date.now() - this.respawnedAt;
      if (timeSinceRespawn < 40000 && this.killerEntity && this.killerEntity.type === Types.Entity.Player
        && this.respawnKillerName && this.killerEntity.name === this.respawnKillerName) {
        base = Math.round(base / 5);
      }
      else if (timeSinceRespawn < 20000) {
        base = Math.round(base / 3);
      }
      else if (timeSinceRespawn < 40000) {
        base = Math.round(base / 2);
      }
    }

    return base;
  }


  cleanup() {
    super.cleanup();
    this.sword.cleanup();
    this.flags.clear();
    this.modifiers = {};

    [this.speed, this.regeneration, this.friction, this.viewport.zoom, this.knockbackResistance, this.health.regenWait].forEach((property) => property.reset());
    this.throwDamageMultiplier = 1;
    this.coinMultiplier = 1;
    this.damageReduction = 1;
    this.chestDamageMultiplier = 1;
  }
}

module.exports = Player;
