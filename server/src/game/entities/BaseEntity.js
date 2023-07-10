const SAT = require('sat');
const collisions = require('../collisions');
const EntityState = require('./EntityState');

class BaseEntity {
  constructor(game, type) {
    this.game = game;
    this.type = type;
    this.id = null;
    this.x = 0;
    this.y = 0;
    this.removed = false;
    this.state = new EntityState(this.createState.bind(this));
  }

  get boundary() {
    return {
      x: this.x,
      y: this.y,
      width: 1,
      height: 1,
    };
  }

  createState() {
    return {
      id: this.id,
      type: this.type,
      x: this.x,
      y: this.y,
    };
  }

  update() {
  }

  cleanup() {
    this.state.cleanup();
  }

  remove() {
    this.game.removeEntity(this);
  }
}

class CircleEntity extends BaseEntity {
  constructor(game, type) {
    super(game, type);
    this.radius = 0;
    this.collisionPolyCache = null;
  }

  get boundary() {
    return collisions.getCircleBoundary(this.x, this.y, this.radius);
  }

  get collisionPoly() {
    if (this.collisionPolyCache === null) {
      this.collisionPolyCache = new SAT.Circle(new SAT.Vector(this.x, this.y), this.radius);
    }
    return this.collisionPolyCache;
  }

  createState() {
    const state = super.createState();
    state.radius = this.radius;
    return state;
  }

  getMtv(otherPoly) {
    const circlePoly = this.collisionPoly;
    const response = new SAT.Response();
    if (otherPoly instanceof SAT.Polygon) {
      SAT.testCirclePolygon(circlePoly, otherPoly, response);
    } if (otherPoly instanceof SAT.Circle) {
      SAT.testCircleCircle(circlePoly, otherPoly, response);
    }
    return response.overlapV.add(response.overlapN);
  }

  applyMtv(mtv) {
    this.x -= mtv.x;
    this.y -= mtv.y;
  }

  cleanup() {
    super.cleanup();
    this.collisionPolyCache = null;
  }
}

module.exports = {
  BaseEntity,
  CircleEntity,
};
