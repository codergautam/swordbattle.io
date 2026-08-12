const SAT = require('sat');
const Types = require('../Types');
const helpers = require('../../helpers');
const config = require('../../config');

class Shape {
  constructor() {
    this.type = Types.Shape.Point;
    this.collisionPoly = null;
    this.centerOffset = new SAT.Vector(0, 0);
    this._boundary = { x: 0, y: 0, width: 0, height: 0 };
  }

  get x() {
    return this.collisionPoly.pos.x;

  }

  set x(value) {
    const min = Number.isFinite(config.world.worldX) ? config.world.worldX : -config.world.worldWidth / 2;
    this.collisionPoly.pos.x = helpers.clamp(value, min, min + config.world.worldWidth);
  }

  get y() {
    return this.collisionPoly.pos.y;
  }

  set y(value) {
    const min = Number.isFinite(config.world.worldY) ? config.world.worldY : -config.world.worldHeight / 2;
    this.collisionPoly.pos.y = helpers.clamp(value, min, min + config.world.worldHeight);
  }

  get boundary() {
    const box = this.collisionPoly.getAABBAsBox();
    this._boundary.x = box.pos.x;
    this._boundary.y = box.pos.y;
    this._boundary.width = box.w;
    this._boundary.height = box.h;
    return this._boundary;
  }

  get center() {
    return { x: this.x, y: this.y };
  }

  randomSpawnInside(shape) {
    const point = this.getRandomPoint();
    const response = new SAT.Response();
    shape.x = point.x;
    shape.y = point.y;
    // this.collides(shape, response);

    if (response.overlapV.x !== 0 || response.overlapV.y !== 0) {
      const mtv = shape.getCollisionOverlap(response).scale(-1);
      shape.applyCollision(mtv);
    }
  }

  getCollisionOverlap(response) {
    return response.overlapV.add(response.overlapN);
  }

  applyCollision(vector) {
    if (isNaN(vector.x) || isNaN(vector.y)) {
      Shape._nanCollisions = (Shape._nanCollisions || 0) + 1;
      if (Shape._nanCollisions % 1000 === 1) {
        console.error(`[COLLISION_NAN] degenerate overlap (x${Shape._nanCollisions}) — nudging apart`);
      }
      const a = Math.random() * Math.PI * 2;
      this.x += Math.cos(a) * 3;
      this.y += Math.sin(a) * 3;
      return;
    }
    this.x += vector.x;
    this.y += vector.y;
  }

  cleanup() {}
}

module.exports = Shape;
