const SAT = require('sat');
const Inputs = require('../components/Inputs');
const Entity = require('./Entity');
const Circle = require('../shapes/Circle');
const Sword = require('./Sword');
const Effect = require('../effects/Effect');
const SpeedEffect = require('../effects/SpeedEffect');
const SlippingEffect = require('../effects/SlippingEffect');
const BurningEffect = require('../effects/BurningEffect');
const Property = require('../components/Property');
const Viewport = require('../components/Viewport');
const LevelSystem = require('../components/LevelSystem');
const EvolutionSystem = require('../evolutions');
const Timer = require('../components/Timer');
const Types = require('../Types');
const config = require('../../config');

class Player extends Entity {
  constructor(game, name) {
    super(game, Types.Entity.Player);
    this.name = name;
    this.isGlobal = true;
    this.client = null;
    this.velocity = new SAT.Vector(0, 0);
    this.movedDistance = new SAT.Vector(0, 0);
    this.movementDirection = 0;
    this.angle = 0;
    this.inputs = new Inputs();
    this.mouse = null;
    this.targets.push(Types.Entity.Player);

    const { speed, radius, maxHealth, regeneration, viewport } = config.player;
    this.shape = Circle.create(0, 0, radius);
    this.speed = new Property(speed);
    this.maxHealth = new Property(maxHealth);
    this.health = new Property(maxHealth);
    this.friction = new Property(1);
    this.regeneration = new Property(regeneration);

    this.startTimestamp = Date.now();
    this.kills = 0;
    this.biome = 0;
    this.inSafezone = true;
    this.inBuildingId = null;

    this.viewport = new Viewport(this, viewport.width, viewport.height, viewport.zoom);
    this.viewportEntities = [];
    this.effects = new Map();
    this.flags = new Map();
    this.sword = new Sword(this);
    this.game.addEntity(this.sword);
    this.levels = new LevelSystem(this);
    this.evolutions = new EvolutionSystem(this);

    this.chatMessage = '';
    this.chatMessageTimer = new Timer(0, 3);
  }

  get healthPercent() {
    return this.health.value / this.maxHealth.value;
  }

  get playtime() {
    return Math.round((Date.now() - this.startTimestamp) / 1000);
  }

  createState() {
    const state = super.createState();
    state.name = this.name;
    state.angle = this.angle;
    state.health = this.health.value;
    state.maxHealth = this.maxHealth.value;
    state.kills = this.kills;
    state.flags = {};
    for (const flag of Object.values(Types.Flags)) {
      state.flags[flag] = this.flags.has(flag) ? this.flags.get(flag) : false;
    }

    state.biome = this.biome;
    state.level = this.levels.level;
    state.coins = this.levels.coins;
    state.nextLevelCoins = this.levels.nextLevelCoins;
    state.previousLevelCoins = this.levels.previousLevelCoins;
    state.upgradePoints = this.levels.upgradePoints;

    state.buffs = structuredClone(this.levels.buffs);
    state.evolution = this.evolutions.evolution;
    state.possibleEvolutions = {};
    this.evolutions.possibleEvols.forEach(evol => state.possibleEvolutions[evol] = true);

    state.viewportZoom = this.viewport.zoom.value;
    state.chatMessage = this.chatMessage;

    state.swordSwingAngle = this.sword.swingAngle;
    state.swordSwingProgress = this.sword.swingProgress;
    state.swordSwingDuration = this.sword.swingDuration.value;
    state.swordFlying = this.sword.isFlying;
    state.swordFlyingCooldown = this.sword.flyCooldownTime;
    if (this.removed && this.client) state.disconnectReason = this.client.disconnectReason;
    return state;
  }

  update(dt) {
    this.applyBiomeEffects();
    this.levels.applyBuffs();
    this.effects.forEach(effect => effect.update(dt));
    this.viewport.zoom.multiplier /= this.shape.scaleRadius.multiplier;
    this.applyInputs(dt);

    this.health.value = Math.min(this.health.baseValue + this.regeneration.value * dt, this.maxHealth.baseValue);

    const leader = this.game.leaderPlayer;
    if (!leader || this.levels.coins > leader.levels.coins) {
      this.game.leaderPlayer = this;
    }

    if (this.chatMessage) {
      this.chatMessageTimer.update(dt);
      if (this.chatMessageTimer.finished) {
        this.chatMessage = '';
      }
    }
  }

  applyBiomeEffects() {
    const biomes = [];
    const response = new SAT.Response();
    let onRiver = false; // we can implement generalBiomeEffect (multipliers) and certainBiomeEffect (e.g collision)
    for (const biome of this.game.map.biomes) {
      if (biome.shape.collides(this.shape, response)) {
        biomes.push([biome, response]);
        if(onRiver && config.doubleRiverCollideFix) continue;
        if (biome.type === Types.Biome.River) onRiver = true;
        biome.collides(this, response);
      }
    }

    biomes.sort((a, b) => b.zIndex - a.zIndex);
    // should exclude Safezone if inSafezone is false
    if (biomes[0]) {
      const biome = biomes[0][0];
      const response = biomes[0][1];
      this.biome = biome.type;
      biome.applyEffects(this, response);
    }

    if (!biomes.find(([biome]) => biome.type === Types.Biome.Safezone)) {
      this.inSafezone = false;
    }
  }

  processTargetsCollision(entity, response) {
    const selfWeight = this.weight;
    const targetWeight = entity.weight;
    const totalWeight = selfWeight + targetWeight;

    const mtv = this.shape.getCollisionOverlap(response);
    const selfMtv = mtv.clone().scale(targetWeight / totalWeight);
    const targetMtv = mtv.clone().scale(selfWeight / totalWeight * -1);

    this.shape.applyCollision(selfMtv);
    entity.shape.applyCollision(targetMtv);
  }

  applyInputs(dt) {
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
    } else {
      let directionX = 0;
      let directionY = 0;

      if (this.inputs.isInputDown(Types.Input.Up)) {
        directionY = -1;
      } else if (this.inputs.isInputDown(Types.Input.Down)) {
        directionY = 1;
      }

      if (this.inputs.isInputDown(Types.Input.Right)) {
        directionX = 1;
      } else if (this.inputs.isInputDown(Types.Input.Left)) {
        directionX = -1;
      }

      if (directionX !== 0 || directionY !== 0) {
        this.movementDirection = Math.atan2(directionY, directionX);
        dx = speed * Math.cos(this.movementDirection);
        dy = speed * Math.sin(this.movementDirection);
      } else {
        this.movementDirection = 0;
      }
    }

    this.shape.x += this.velocity.x;
    this.shape.y += this.velocity.y;
    this.velocity.scale(0.9);

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
  }

  damaged(damage, entity = null) {
    this.health.baseValue -= damage; // fix applying effects

    if (this.health.value <= 0) {
      this.health.value = 0;

      let reason = 'Suddenly dead';
      if (entity) {
        switch (entity.type) {
          case Types.Entity.Player: reason = entity.name; break;
          case Types.Entity.LavaPool: reason = 'Accidentally burned in lava'; break;
          case Types.Entity.Wolf: reason = 'Was torn to pieces by a wolf'; break;
          case Types.Entity.Moose: reason = 'Was trampled by a moose'; break;
        }
      }
      this.remove(reason);
    }
  }

  addEffect(type, id, config) {
    let EffectClass = Effect;
    switch (type) {
      case Types.Effect.Speed: EffectClass = SpeedEffect; break;
      case Types.Effect.Slipping: EffectClass = SlippingEffect; break;
      case Types.Effect.Burning: EffectClass = BurningEffect; break;
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

    message = message.slice(0, 35);
    this.chatMessage = message;
    this.chatMessageTimer.renew();
  }

  getEntitiesInViewport() {
    this.viewportEntities = this.game.entitiesQuadtree.get(this.viewport.boundary)
      .map(result => result.entity);
    return this.viewportEntities;
  }

  remove(reason = 'Server') {
    if (this.client) {
      this.client.disconnectReason = reason;
      this.client.saveGame({
        coins: this.levels.coins,
        kills: this.kills,
        playtime: this.playtime,
      });
      // this.client.updateStats({
      // });
    }
    super.remove();

    const maxCoins = 30;
    const coins = Math.min(Math.round(this.levels.coins / 5), maxCoins);
    const minCoinValue = this.levels.coins / coins / 3;
    const maxCoinValue = this.levels.coins / coins / 2;
    for (let i = 0; i < coins; i++) {
      this.game.map.addEntity({
        type: Types.Entity.Coin,
        respawnable: false,
        spawnZone: this.shape,
        value: [minCoinValue, maxCoinValue],
      });
    }
  }

  cleanup() {
    super.cleanup();
    this.sword.cleanup();
    this.flags.clear();

    [this.speed, this.health, this.maxHealth, this.regeneration, this.friction, this.viewport.zoom]
      .forEach((property) => property.reset());
  }
}

module.exports = Player;
