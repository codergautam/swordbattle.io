const SAT = require("sat");
const Inputs = require("../Inputs");
const Types = require("../Types");
const collisions = require("../collisions");
const { CircleEntity } = require("./BaseEntity");
const Sword = require("./Sword");
const config = require("../../config");
const evolutions = require("../../evolutions");

class Player extends CircleEntity {
  constructor(game, name) {
    super(game, Types.Entity.Player);
    this.name = name;
    this.client = null;
    this.velocity = new SAT.Vector(0, 0);
    this.movementDirection = 0;
    this.angle = 0;
    this.inputs = new Inputs();
    this.mouse = null;

    const { speed, radius, maxHealth, regeneration } = config.player;
    this.skin = null;
    this.speed = speed;
    this.radius = radius;
    this.maxHealth = maxHealth;
    this.health = this.maxHealth;
    this.regeneration = regeneration;
    this.coinBalance = 0;
    this.kills = 0;
    this.isHit = false;
    this.isDamaged = false;
    this.inBuildingId = null;
    this.level = 1;
    this.prevLevel = 1;
    this.evolutions = [];

    this.sword = new Sword(this);
  }

  createState() {
    const state = super.createState();
    state.skin = this.skin;
    state.speed = this.speed;
    state.name = this.name;
    state.coinBalance = this.coinBalance;
    state.angle = this.angle;
    state.health = this.health;
    state.maxHealth = this.maxHealth;
    state.kills = this.kills;
    state.isHit = this.isHit;
    state.isDamaged = this.isDamaged;
    state.level = this.level;
    state.evolutions = this.evolutions.map((evolution) => evolution.name);

    state.swordSwingAngle = this.sword.swingAngle;
    state.swordSwingProgress = this.sword.swingProgress;
    state.swordSwingDuration = this.sword.swingDuration;

    return state;
  }

  update(dt) {
    this.applyInputs(dt);
    this.sword.update(dt);
    this.collisionCheck();
    this.updateLevel();
    this.updateHealth(dt);
    this.findEvolutions();
  }

  collisionCheck() {
    // Coins
    const searchRadius = this.radius * 1.2;
    const coinsSearchRect = collisions.getCircleBoundary(
      this.x,
      this.y,
      searchRadius
    );
    const coinTargets = this.game.coinsQuadtree.get(coinsSearchRect);
    for (const target of coinTargets) {
      const coin = target.entity;
      if (
        collisions.circleCircle(coin, {
          x: this.x,
          y: this.y,
          radius: searchRadius,
        })
      ) {
        this.coinBalance += coin.value;
        coin.hunterId = this.id;
        coin.remove();
      }
    }

    // Players
    const boundary = this.boundary;
    const playerTargets = this.game.playersQuadtree.get(boundary);
    for (const target of playerTargets) {
      const otherPlayer = target.entity;
      if (collisions.circleCircle(otherPlayer, this)) {
        const otherPlayerPoly = new SAT.Circle(
          new SAT.Vector(otherPlayer.x, otherPlayer.y),
          otherPlayer.radius
        );
        const mtv = this.getMtv(otherPlayerPoly).scale(0.5);
        this.applyMtv(mtv);
        otherPlayer.applyMtv(mtv.reverse());
      }
    }

    // Buildings
    const point = { x: this.x, y: this.y, radius: 1 };
    let buildingId = null;
    for (const building of this.game.mapObjects) {
      if (collisions.circleRectangle(point, building)) {
        buildingId = building.id;
      }
    }
    this.inBuildingId = buildingId;

    // Player swords
    const swordsTargets = this.game.swordsQuadtree.get(boundary);
    for (const target of swordsTargets) {
      const sword = target.entity;
      const otherPlayer = sword.player;
      if (
        sword === this.sword ||
        !sword.canCollide(this) ||
        this.inBuildingId !== otherPlayer.inBuildingId
      )
        continue;

      const swordPoly = sword.getCollisionPolygon();
      const response = new SAT.Response();
      if (SAT.testCirclePolygon(this.collisionPoly, swordPoly, response)) {
        const angle = Math.atan2(
          otherPlayer.y - this.y,
          otherPlayer.x - this.x
        );
        this.velocity.x -= sword.force * Math.cos(angle);
        this.velocity.y -= sword.force * Math.sin(angle);
        this.damage(sword.damage, otherPlayer);
      }
    }

    // Walls (buildings)
    // can use quadtree later
    for (const wall of this.game.walls) {
      if (collisions.circleRectangle(this, wall)) {
        const mtv = this.getMtv(wall.poly);
        this.applyMtv(mtv);
      }
    }

    // Borders
    const mapWidth = this.game.map.width;
    const mapHeight = this.game.map.height;
    if (this.x - this.radius <= 0) {
      this.x = this.radius;
    } else if (this.x + this.radius >= mapWidth) {
      this.x = mapWidth - this.radius;
    }
    if (this.y - this.radius <= 0) {
      this.y = this.radius;
    } else if (this.y + this.radius >= mapHeight) {
      this.y = mapHeight - this.radius;
    }
  }

  updateLevel() {
    this.prevLevel = this.level;
    this.level = 1 + this.coinBalance / 100;
  }

  updateHealth(dt) {
    const diff = Math.floor(this.level) - Math.floor(this.prevLevel);
    this.health += 0.2 * diff * this.maxHealth;
    this.health += this.regeneration * dt;
    this.health = Math.min(this.health, this.maxHealth);
  }

  findEvolutions() {
    this.evolutions = evolutions.filter(
      ({ prerequisites }) =>
        prerequisites.level <= this.level &&
        prerequisites.level > this.prevLevel
    );
  }

  applyInputs(dt) {
    const isMouseMovement = this.mouse !== null;

    let speed = this.speed;
    if (isMouseMovement) {
      const mouseDistanceFullStrength = 150;
      const mouseAngle = this.mouse.angle;
      const mouseDistance = Math.min(
        this.mouse.force,
        mouseDistanceFullStrength
      );

      speed *= mouseDistance / mouseDistanceFullStrength;
      this.x += speed * Math.cos(mouseAngle) * dt;
      this.y += speed * Math.sin(mouseAngle) * dt;
      this.movementDirection = mouseAngle;
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
        this.x += this.speed * Math.cos(this.movementDirection) * dt;
        this.y += this.speed * Math.sin(this.movementDirection) * dt;
      } else {
        this.movementDirection = 0;
      }
    }

    // Velocity
    this.x += this.velocity.x;
    this.y += this.velocity.y;
    this.velocity.scale(0.9);
  }

  evolve(name) {
    const evolution = evolutions.find(
      (evolution) =>
        evolution.name === name && evolution.prerequisites.level <= this.level
    );
    if (evolution) {
      this.skin = evolution.name;
      this.speed *= evolution.stats.speed;
      this.maxHealth *= evolution.stats.health;
    }
  }

  damage(damage, player) {
    this.health -= damage;
    this.isDamaged = true;
    player.isHit = true;
    player.sword.collidedEntities.add(this);
    if (this.health <= 0) {
      this.health = 0;
      this.remove(player.name);
      player.kills += 1;
    }
  }

  remove(reason = "Server") {
    this.client.disconnectReason = reason;
    super.remove();
  }

  cleanup() {
    super.cleanup();
    this.sword.cleanup();
    this.isHit = false;
    this.isDamaged = false;
  }
}

module.exports = Player;
