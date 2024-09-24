const SAT = require("sat");
const Inputs = require("../components/Inputs");
const Entity = require("./Entity");
const Circle = require("../shapes/Circle");
const Sword = require("./Sword");
const Effect = require("../effects/Effect");
const SpeedEffect = require("../effects/SpeedEffect");
const SlippingEffect = require("../effects/SlippingEffect");
const BurningEffect = require("../effects/BurningEffect");
const LevelSystem = require("../components/LevelSystem");
const Property = require("../components/Property");
const Viewport = require("../components/Viewport");
const Health = require("../components/Health");
const Timer = require("../components/Timer");
const EvolutionSystem = require("../evolutions");
const Types = require("../Types");
const config = require("../../config");
const { clamp, calculateGemsXP } = require("../../helpers");
const { skins } = require("../../cosmetics.json");

// Check if any duplicate ids in cosmetics.json
function checkForDuplicates() {
  const ids = new Set();
  for (const skin of Object.values(skins)) {
    ids.add(skin.id);
  }
  if (ids.size !== Object.keys(skins).length) {
    console.error("Duplicate skin ids found in cosmetics.json");

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

const filter = require("leo-profanity");

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
    this.mouse = null;
    this.targets.push(Types.Entity.Player);
    this.skin = skins.player.id;

    const { speed, radius, maxHealth, regeneration, viewport } = config.player;
    this.shape = Circle.create(0, 0, radius);
    this.speed = new Property(speed);
    this.health = new Health(maxHealth, regeneration);
    this.friction = new Property(1);
    this.regeneration = new Property(regeneration);
    this.knockbackResistance = new Property(1);

    this.startTimestamp = Date.now();
    this.kills = 0;
    this.biome = 0;
    this.inSafezone = true;

    this.viewport = new Viewport(
      this,
      viewport.width,
      viewport.height,
      viewport.zoom
    );
    this.viewportEntityIds = [];
    this.effects = new Map();
    this.flags = new Map();
    this.sword = new Sword(this);
    this.game.addEntity(this.sword);
    this.levels = new LevelSystem(this);
    this.evolutions = new EvolutionSystem(this);
    this.tamedEntities = new Set();

    this.modifiers = {};

    this.chatMessage = "";
    this.chatMessageTimer = new Timer(0, 3);
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
    state.nextLevelCoins = this.levels.nextLevelCoins;
    state.previousLevelCoins = this.levels.previousLevelCoins;
    state.upgradePoints = this.levels.upgradePoints;
    state.skin = this.skin;

    state.buffs = structuredClone(this.levels.buffs);
    state.evolution = this.evolutions.evolution;
    state.possibleEvolutions = {};
    this.evolutions.possibleEvols.forEach(
      (evol) => (state.possibleEvolutions[evol] = true)
    );

    state.isAbilityAvailable =
      this.evolutions.evolutionEffect.isAbilityAvailable;
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
    if (this.removed && this.client) {
      state.disconnectReasonMessage = this.client.disconnectReason.message;
      state.disconnectReasonType = this.client.disconnectReason.type;
    }
    return state;
  }

  update(dt) {
    this.applyBiomeEffects();
    this.levels.applyBuffs();
    this.effects.forEach((effect) => effect.update(dt));
    this.health.update(dt);
    this.applyInputs(dt);
    this.sword.flySpeed.value = clamp(this.speed.value / 10, 100, 200);
    this.sword.update(dt);

    if (
      this.inputs.isInputDown(Types.Input.Ability) &&
      this.evolutions.evolutionEffect.canActivateAbility
    ) {
      this.evolutions.evolutionEffect.activateAbility();
    }

    this.viewport.zoom.multiplier /= this.shape.scaleRadius.multiplier;

    if (this.chatMessage) {
      this.chatMessageTimer.update(dt);
      if (this.chatMessageTimer.finished) {
        this.chatMessage = "";
      }
    }
  }

  tameWolf(wolf) {
    this.tamedEntities.add(wolf.id);
  }

  applyBiomeEffects() {
    let biomes = [];
    const response = new SAT.Response();
    for (const biome of this.game.map.biomes) {
      if (biome.shape.collides(this.shape, response)) {
        biomes.push([biome, response]);
        biome.collides(this, response);
      }
    }

    // excludes safezone if this.inSafezone is false
    biomes = biomes
      .filter(
        ([biome]) => biome.type !== Types.Biome.Safezone || this.inSafezone
      )
      .sort((a, b) => b.zIndex - a.zIndex);
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
    const targetMtv = mtv.clone().scale((selfWeight / totalWeight) * -1);

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
      const mouseDistance = Math.min(
        this.mouse.force,
        mouseDistanceFullStrength
      );
      speed *= mouseDistance / mouseDistanceFullStrength;
      this.movementDirection = mouseAngle;
      dx = speed * Math.cos(this.movementDirection);
      dy = speed * Math.sin(this.movementDirection);

      if (this.modifiers.disableDiagonalMovement) {
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

        if (this.modifiers.disableDiagonalMovement) {
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
    this.velocity.scale(0.6);

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
    this.shape.x = clamp(
      this.shape.x,
      -this.game.map.width / 2,
      this.game.map.width / 2
    );
    this.shape.y = clamp(
      this.shape.y,
      -this.game.map.height / 2,
      this.game.map.height / 2
    );
  }

  damaged(damage, entity = null) {
    this.health.damaged(damage);

    if (this.health.isDead) {
      let reason = "Unknown Entity";
      if (entity) {
        switch (entity.type) {
          case Types.Entity.Player:
            reason = entity.name;
            break;
          case Types.Entity.LavaPool:
            reason = "Lava";
            break;
          case Types.Entity.Wolf:
            reason = "A Wolf";
            break;
          case Types.Entity.Moose:
            reason = "A Moose";
            break;
          case Types.Entity.Yeti:
            reason = "A Yeti";
            break;
          case Types.Entity.Chimera:
            reason = "A Chimera";
            break;
          case Types.Entity.Roku:
            reason = "A Roku";
            break;
          case Types.Entity.Cat:
            reason = "A Cat";
            break;
          case Types.Entity.Snowball:
            reason = "Yeti Boss";
            break; // the yeti boss throws snowballs
          case Types.Entity.Fireball:
            reason = "The Roku";
            break; // the roku throws fireballs
        }
      }
      this.remove(
        reason,
        entity.type === Types.Entity.Player
          ? Types.DisconnectReason.Player
          : Types.DisconnectReason.Mob
      );
    }
  }

  addEffect(type, id, config) {
    let EffectClass = Effect;
    switch (type) {
      case Types.Effect.Speed:
        EffectClass = SpeedEffect;
        break;
      case Types.Effect.Slipping:
        EffectClass = SlippingEffect;
        break;
      case Types.Effect.Burning:
        EffectClass = BurningEffect;
        break;
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
    if (message.length === "") return;

    message = message.slice(0, 35);
    message = filter.clean(message);
    this.chatMessage = message;
    this.chatMessageTimer.renew();
  }

  getEntitiesInViewport() {
    this.viewportEntityIds = this.game.entitiesQuadtree
      .get(this.viewport.boundary)
      .map((result) => result.entity.id);
    return this.viewportEntityIds;
  }

  remove(message = "Server", type = Types.DisconnectReason.Server) {
    if (this.client) {
      this.client.disconnectReason = {
        message: message,
        type: type,
      };
      const game = {
        coins: this.levels.coins,
        kills: this.kills,
        playtime: this.playtime,
      };
      this.client.saveGame(game);
    }
    super.remove();

    this.game.map.spawnCoinsInShape(
      this.shape,
      this.calculateDropAmount(),
      this.client?.account?.id
    );
  }

  calculateDropAmount() {
    const coins = this.levels.coins;
    return coins < 13
      ? 10
      : Math.round(
          coins < 25000
            ? coins * 0.8
            : Math.log10(coins) * 30000 - 111938.2002602
        );
  }

  cleanup() {
    super.cleanup();
    this.sword.cleanup();
    this.flags.clear();
    this.modifiers = {};

    [
      this.speed,
      this.regeneration,
      this.friction,
      this.viewport.zoom,
      this.knockbackResistance,
      this.health.regenWait,
    ].forEach((property) => property.reset());
  }
}

module.exports = Player;
