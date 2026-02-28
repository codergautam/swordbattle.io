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

    this.modifiers = {};
    this.wideSwing = false;

    this.respawnShieldActive = false;
    this.respawnShieldTimer = 0;
    this.respawnedAt = 0;
    this.respawnKillerName = null;
    this.killerEntity = null;

    this.chatMessage = '';
    this.chatMessageTimer = new Timer(0, 3);

    this.recentTargets = new Map();
    this.activeTargets = new Map();

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
    state.swordSwingProgress = this.sword.swingProgress;
    state.swordSwingDuration = this.sword.swingDuration.value;
    state.swordFlying = this.sword.isFlying;
    state.swordFlyingCooldown = this.sword.flyCooldownTime;
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
      this.flags.set(Types.Flags.RespawnShield, 1);
      if (this.respawnShieldTimer <= 0) {
        this.respawnShieldTimer = 0;
        this.respawnShieldActive = false;
      }
    } else if (this.respawnShieldActive) {
      this.respawnShieldActive = false;
    }

    const now = Date.now();
    for (const [id, expiry] of this.recentTargets) {
      if (now > expiry) this.recentTargets.delete(id);
    }
    for (const [id, expiry] of this.activeTargets) {
      if (now > expiry) this.activeTargets.delete(id);
    }
    const activeTargetCount = this.activeTargets.size;
    if (activeTargetCount >= 2 && !this.isBot) {
      this.flags.set(Types.Flags.AntiTeamActive, 1);
    }

    this.levels.applyBuffs();

    if (activeTargetCount >= 2 && !this.isBot) {
      this.health.regenWait.multiplier *= 0.6;
    }

    this.effects.forEach(effect => effect.update(dt));
    this.health.update(dt);
    this.applyInputs(dt);
    this.sword.flySpeed.value = clamp(this.speed.value / 10, 100, 200);
    this.sword.update(dt);

    if (this.inputs.isInputDown(Types.Input.Ability) && this.evolutions.evolutionEffect.canActivateAbility && !this.modifiers.stunned) {
      this.evolutions.evolutionEffect.activateAbility();
    }

    this.viewport.zoom.multiplier /= this.shape.scaleRadius.multiplier;

    if (this.chatMessage) {
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

    this.shape.x += this.velocity.x;
    this.shape.y += this.velocity.y;

    // Use higher decay for sliding knockback effect (slower deceleration = longer slide)
    const velocityDecay = this.modifiers.slidingKnockback || 0.6;
    this.velocity.scale(velocityDecay);

    const slide = this.movedDistance;
    const friction = 1 - this.friction.value;
    slide.scale(friction);

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

    this.shape.x += dx * dt;
    this.shape.y += dy * dt;

    this.movedDistance.x = dx;
    this.movedDistance.y = dy;

    // Clamp to map bounds
    this.shape.x = clamp(this.shape.x, -this.game.map.width / 2, this.game.map.width / 2);
    this.shape.y = clamp(this.shape.y, -this.game.map.height / 2, this.game.map.height / 2);
  }

  damaged(damage, entity = null) {
    if (entity && entity.type === Types.Entity.Player && !this.isBot && !entity.isBot) {
      if (this.recentTargets.has(entity.id)) {
        this.activeTargets.set(entity.id, Date.now() + 10000);
      } else {
        this.activeTargets.set(entity.id, Date.now() + 5000);
      }
      this.recentTargets.set(entity.id, Date.now() + 30000);
    }

    if (this.name !== "Update Testing Account") {
      this.health.damaged(damage);
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
          } catch (e) { /* */ }
          try {
            this.flags.set(Types.Flags.PlayerDeath, true);
          } catch (e) { /* */ }
        }
      }

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

      if (this.levels.coins >= 20000 && this.playtime >= 150) {
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

    if (this.evolutions && this.evolutions.evolutionEffect) {
      this.evolutions.evolutionEffect.remove();
    }

    super.remove();

    if (this.name !== "Update Testing Account") {
      this.game.map.spawnCoinsInShape(this.shape, this.calculateDropAmount(), this.client?.account?.id);
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
      else if (timeSinceRespawn < 15000) {
        base = Math.round(base / 3);
      }
      else if (timeSinceRespawn < 30000) {
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
  }
}

module.exports = Player;
