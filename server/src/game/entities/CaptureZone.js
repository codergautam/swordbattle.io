const Entity = require('./Entity');
const Circle = require('../shapes/Circle');
const Types = require('../Types');
const helpers = require('../../helpers');

class CaptureZone extends Entity {
  constructor(game, objectData) {
    super(game, Types.Entity.CaptureZone, objectData);

    this.zoneRadius = objectData.radius || helpers.random(1000, 1800);
    this.shape = Circle.create(0, 0, this.zoneRadius);
    this.isGlobal = true;
    this.depth = 0;

    this.lifetime = helpers.random(45, 65);
    this.elapsed = 0;

    this.coinTimer = 0;
    this.coinInterval = helpers.random(0.2, 0.4);
    this.totalCoinsTarget = objectData.totalCoins || helpers.randomInteger(12500, 17500);
    this.coinsSpawned = 0;
    this.coinValuePerSpawn = 0;

    this.damageTimer = 0;
    this.damageInterval = 1;
    this.playerTimeInZone = new Map();

    if (objectData.position) {
      this.shape.x = objectData.position[0];
      this.shape.y = objectData.position[1];
    }
  }

  createState() {
    const state = super.createState();
    state.lifetime = this.lifetime;
    state.elapsed = this.elapsed;
    return state;
  }

  update(dt) {
    this.elapsed += dt;

    if (this.elapsed >= this.lifetime) {
      this.remove();
      return;
    }

    this.coinTimer += dt;
    if (this.coinTimer >= this.coinInterval) {
      this.coinTimer -= this.coinInterval;
      this.spawnCoins();
    }

    this.damageTimer += dt;
    if (this.damageTimer >= this.damageInterval) {
      this.damageTimer -= this.damageInterval;
      this.applyDamageAura();
    }
  }

  spawnCoins() {
    const count = helpers.randomInteger(8, 15);
    for (let i = 0; i < count; i++) {
      const availableSlots = this.game.maxEntities - this.game.entities.size - 200;
      if (availableSlots <= 0) return;

      const coinValue = helpers.randomInteger(1, 8);

      const angle = helpers.random(0, Math.PI * 2);
      const dist = helpers.random(0, this.zoneRadius * 0.85);
      const spawnX = this.shape.x + Math.cos(angle) * dist;
      const spawnY = this.shape.y + Math.sin(angle) * dist;

      const coin = this.game.map.addEntity({
        type: Types.Entity.Coin,
        position: [spawnX, spawnY],
        value: coinValue,
      });

      if (coin) {
        const velAngle = helpers.random(0, Math.PI * 2);
        const speed = helpers.random(20, 60);
        coin.velocity.x = Math.cos(velAngle) * speed;
        coin.velocity.y = Math.sin(velAngle) * speed;
        coin.despawnTime = Date.now() + 4000;
        this.coinsSpawned += coinValue;
      }
    }
  }

  applyDamageAura() {
    const SAT = require('sat');
    const response = new SAT.Response();

    for (const [id, entity] of this.game.entities) {
      if (entity.type !== Types.Entity.Player) continue;
      if (entity.removed) continue;

      const dx = entity.shape.x - this.shape.x;
      const dy = entity.shape.y - this.shape.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < this.zoneRadius) {
        const prevTime = this.playerTimeInZone.get(id) || 0;
        const newTime = prevTime + this.damageInterval;
        this.playerTimeInZone.set(id, newTime);

        if (newTime > 5 && entity.health) {
          const damage = entity.health.max.value * 0.015;
          if (entity.health.value - damage < 1) {
            entity.health.value = 1;
          } else {
            entity.damaged(damage);
          }
        }
      } else {
        this.playerTimeInZone.delete(id);
      }
    }
  }

  remove() {
    this.playerTimeInZone.clear();
    super.remove();
  }
}

module.exports = CaptureZone;
