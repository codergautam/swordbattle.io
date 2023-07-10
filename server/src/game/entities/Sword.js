const SAT = require('sat');
const Types = require('../Types');
const config = require('../../config');

class Sword {
  constructor(player) {
    this.player = player;
    this.swingAngle = -Math.PI / 3;
    this.raiseAnimation = false;
    this.decreaseAnimation = false;
    this.swingTime = 0;
    this.swingProgress = 0;
    this.collidedEntities = new Set();

    const { swingDuration, damage, knockback } = config.sword;
    this.swingDuration = swingDuration;
    this.damage = damage;
    this.force = knockback;

    this.width = 85;
    this.height = 180;
  }

  get boundary() {
    const aabb = this.getCollisionPolygon().getAABB();
    const points = aabb.calcPoints;
    
    let minX = points[0].x;
    let minY = points[0].y;
    let maxX = points[0].x;
    let maxY = points[0].y;
    
    for (let i = 1; i < points.length; i++) {
      minX = Math.min(minX, points[i].x);
      minY = Math.min(minY, points[i].y);
      maxX = Math.max(maxX, points[i].x);
      maxY = Math.max(maxY, points[i].y);
    }
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  get angle() {
    return this.swingAngle * this.swingProgress;
  }

  canCollide(player) {
    return this.raiseAnimation && !this.collidedEntities.has(player);
  }

  getCollisionPolygon() {
    if (this.cachedPoly) return this.cachedPoly;

    const angle = this.player.angle + this.angle + Math.PI / 2;
    const point = new SAT.Vector(this.player.x, this.player.y);
    const poly = new SAT.Box(point, this.width, this.height).toPolygon();
    const offsetX = this.player.radius + this.width * 0.3;
    const offsetY = this.player.radius - this.height * 0.75;
    const offset = new SAT.Vector(offsetX, offsetY);

    poly.setAngle(angle);
    poly.setOffset(offset);
    poly.rotate(-Math.PI);
    this.cachedPoly = poly;

    return poly;
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
      if (this.swingTime >= this.swingDuration) {
        this.swingTime = this.swingDuration;
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
    this.swingProgress = this.swingTime / this.swingDuration;
  }

  cleanup() {
    this.cachedPoly = null;
  }
}

module.exports = Sword;
