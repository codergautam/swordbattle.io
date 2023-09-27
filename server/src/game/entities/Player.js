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
const Types = require('../Types');
const config = require('../../config');

class Player extends Entity {
  constructor(game, name) {
    super(game, Types.Entity.Player);
    this.name = name;
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
    this.radius = radius;
    this.maxHealth = new Property(maxHealth);
    this.health = new Property(maxHealth);
    this.friction = new Property(1);
    this.regeneration = regeneration;
    this.kills = 0;
    this.isHit = false;
    this.isDamaged = false;
    this.inSafezone = true;
    this.inBuildingId = null;

    this.viewport = new Viewport(this, viewport.width, viewport.height, viewport.zoom);
    this.viewportEntities = [];
    this.biomes = new Set();
    this.effects = new Map();
    this.sword = new Sword(this);
    this.game.addEntity(this.sword);
    this.levels = new LevelSystem(this);
    this.evolutions = new EvolutionSystem(this);
  }

  createState() {
    const state = super.createState();
    state.name = this.name;
    state.angle = this.angle;
    state.health = this.health.value;
    state.maxHealth = this.maxHealth.value;
    state.kills = this.kills;
    state.isHit = this.isHit;
    state.isDamaged = this.isDamaged;
    
    state.level = this.levels.level;
    state.coins = this.levels.coins;
    state.nextLevelCoins = this.levels.nextLevelCoins;
    state.previousLevelCoins = this.levels.previousLevelCoins;
    state.upgradePoints = this.levels.upgradePoints;

    state.evolution = this.evolutions.evolution;
    state.possibleEvolutions = {};
    this.evolutions.possibleEvols.forEach(evol => state.possibleEvolutions[evol] = true);

    state.viewportZoom = this.viewport.zoom.value;

    state.swordSwingAngle = this.sword.swingAngle;
    state.swordSwingProgress = this.sword.swingProgress;
    state.swordSwingDuration = this.sword.cooldown.value;
    if (this.removed) state.disconnectReason = this.client.disconnectReason; 
    return state;
  }

  update(dt) {
    this.applyBiomeEffects();

    this.effects.forEach(effect => effect.update(dt));
    this.applyInputs(dt);
    
    this.health.value = Math.min(this.health.baseValue + this.regeneration * dt, this.maxHealth.baseValue);
  }

  applyBiomeEffects() {
    const response = new SAT.Response();
    for (const biome of this.game.map.biomes) {
      if (biome.shape.collides(this.shape, response)) {
        biome.collides(this, response);
      }
    }

    if (this.biomes.has(Types.Biome.Safezone)) {
      this.viewport.zoom.multiplier *= 0.75;
      this.sword.damage.multiplier = 0;
      this.sword.knockback.multiplier = 0;
    } else {
      this.inSafezone = false;

      if (this.biomes.has(Types.Biome.Fire)) {
        this.maxHealth.multiplier *= 0.8;
        this.health.multiplier *= 0.8;
        this.sword.damage.multiplier *= 1.2;
      } else if (this.biomes.has(Types.Biome.Earth)) {
        this.speed.multiplier *= 0.8;
        this.sword.damage.multiplier *= 0.85;
        this.sword.knockback.multiplier *= 0.85;
      } else if (this.biomes.has(Types.Biome.Ice)) {
        this.speed.multiplier *= 1.2;
        this.sword.cooldown.multiplier *= 0.9;
        this.addEffect(Types.Effect.Slipping, 'iceBiome', { friction: 0.2, duration: 0.3 });
      }

      if (this.biomes.has(Types.Biome.River)) {
        this.speed.multiplier *= 1.4;
      }
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

  damage(damage, reason = 'Suddenly dead') {
    this.health.baseValue -= damage;
    this.isDamaged = true;

    if (this.health.value <= 0) {
      this.health.value = 0;
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

  getEntitiesInViewport() {
    this.viewportEntities = this.game.entitiesQuadtree.get(this.viewport.boundary)
      .map(result => result.entity);
    return this.viewportEntities;
  }

  remove(reason = 'Server') {
    this.client.disconnectReason = reason;
    this.game.removeEntity(this.sword);
    super.remove();
  }

  cleanup() {
    super.cleanup();
    this.biomes.clear();
    this.sword.cleanup();
    this.isHit = false;
    this.isDamaged = false;

    [this.speed, this.health, this.maxHealth, this.friction, this.viewport.zoom]
      .forEach((property) => property.reset());
  }
}

module.exports = Player;
