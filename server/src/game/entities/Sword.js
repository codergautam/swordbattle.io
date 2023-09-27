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

    const { swingDuration, damage, knockback } = config.sword;
    this.cooldown = new Property(swingDuration);
    this.damage = new Property(damage);
    this.knockback = new Property(knockback);
    this.swingTime = 0;
    this.swingProgress = 0;

    this.width = 85;
    this.height = 180;
    this.shape = new Polygon(0, 0, [[0, 0]]);
    this.isStatic = true;
    this.targets.push(Types.Entity.Player);
  }

  get angle() {
    return this.swingAngle * this.swingProgress;
  }

  canCollide(entity) {
    return this.raiseAnimation && !this.collidedEntities.has(entity);
  }

  updateCollisionPoly() {
    const { player } = this;

    const angle = player.angle + this.angle + Math.PI / 2;
    const point = new SAT.Vector(player.shape.x, player.shape.y);
    const poly = new SAT.Box(point, this.width, this.height).toPolygon();
    const offsetX = player.shape.radius + this.width * 0.3;
    const offsetY = player.shape.radius - this.height * 0.75;
    const offset = new SAT.Vector(offsetX, offsetY);

    poly.setAngle(angle);
    poly.setOffset(offset);
    poly.rotate(-Math.PI);

    this.shape.collisionPoly = poly;
  }

  update(dt) {
    const isStatic = !this.raiseAnimation && !this.decreaseAnimation;
    const isSwingDown = this.player.inputs.isInputDown(Types.Input.SwordSwing);
    if (isStatic && isSwingDown) {
      this.raiseAnimation = true;
    }
    if (!this.raiseAnimation && !isSwingDown) {
      this.decreaseAnimation = true;
    }

    if (this.raiseAnimation) {
      this.swingTime += dt;
      if (this.swingTime >= this.cooldown.value) {
        this.swingTime = this.cooldown.value;
        this.raiseAnimation = false;
      }
    }
    if (this.decreaseAnimation) {
      this.swingTime -= dt;
      if (this.swingTime <= 0) {
        this.swingTime = 0;
        this.decreaseAnimation = false;
        this.collidedEntities.clear();
      }
    }
    this.swingProgress = this.swingTime / this.cooldown.value;

    this.updateCollisionPoly();
  }

  processTargetsCollision(player) {
    if (player === this.player) return;
    if (!this.canCollide(player)) return;
    if (player.inBuildingId !== this.player.inBuildingId) return;

    const angle = Math.atan2(this.player.shape.y - player.shape.y, this.player.shape.x - player.shape.x);
    player.velocity.x -= this.knockback.value * Math.cos(angle);
    player.velocity.y -= this.knockback.value * Math.sin(angle);
    player.damage(this.damage.value, this.player.name);

    this.player.isHit = true;
    this.collidedEntities.add(player);
    if (player.removed) {
      this.player.kills += 1;
    }
  }

  cleanup() {
    super.cleanup();

    this.damage.reset();
    this.knockback.reset();
    this.cooldown.reset();
  }
}

module.exports = Sword;
