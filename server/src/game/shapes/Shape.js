const SAT = require('sat');
const Types = require('../Types');

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
    this.collisionPoly.pos.x = value;
  }

  get y() {
    return this.collisionPoly.pos.y;
  }

  set y(value) {
    this.collisionPoly.pos.y = value;
  }

  get boundary() {
    const box = this.collisionPoly.getAABBAsBox();
    return { x: box.pos.x, y: box.pos.y, width: box.w, height: box.h };
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
}

module.exports = Shape;
