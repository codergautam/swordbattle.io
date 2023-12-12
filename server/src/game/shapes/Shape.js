const SAT = require('sat');
const Types = require('../Types');
const helpers = require('../../helpers');
const config = require('../../config');

class Shape {
  constructor() {
    this.type = Types.Shape.Point;
    this.collisionPoly = null;
    this.centerOffset = new SAT.Vector(0, 0);
  }

  get x() {
    return this.collisionPoly.pos.x;

  }

  set x(value) {
    // this.collisionPoly.pos.x = value;
    this.collisionPoly.pos.x = helpers.clamp(value, -config.world.worldWidth / 2, config.world.worldWidth / 2);
  }

  get y() {
    return this.collisionPoly.pos.y;
  }

  set y(value) {
    // this.collisionPoly.pos.y = value;
    this.collisionPoly.pos.y = helpers.clamp(value, -config.world.worldHeight, config.world.worldHeight / 2);
  }

  get boundary() {
    const box = this.collisionPoly.getAABBAsBox();
    return { x: box.pos.x, y: box.pos.y, width: box.w, height: box.h };
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
    this.x += vector.x;
    this.y += vector.y;
  }

  cleanup() {}
}

module.exports = Shape;
