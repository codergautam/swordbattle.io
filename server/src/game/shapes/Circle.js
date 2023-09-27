const SAT = require('sat');
const Shape = require('./Shape');
const Types = require('../Types');

class Circle extends Shape {
  constructor(x, y, radius) {
    super();
    this.type = Types.Shape.Circle;
    this.collisionPoly = new SAT.Circle(new SAT.Vector(x, y), radius);
  }

  get radius() {
    return this.collisionPoly.r;
  }

  static create(x, y, radius) {
    return new Circle(x, y, radius);
  }

  get area() {
    return this.radius ** 2 * Math.PI;
  }

  getRandomPoint() {
    const theta = Math.random() * 2 * Math.PI;
    const r = Math.sqrt(Math.random()) * this.radius;
    const x = r * Math.cos(theta);
    const y = r * Math.sin(theta);
    return new SAT.Vector(this.x + x, this.y + y);
  }

  collides(shape, response) {
    if (shape.type === Types.Shape.Circle) {
      return SAT.testCircleCircle(this.collisionPoly, shape.collisionPoly, response);
    }
    if (shape.type === Types.Shape.Polygon) {
      if (shape.isComplex) {
        return shape.collides(this, response);
      }
      return SAT.testCirclePolygon(this.collisionPoly, shape.collisionPoly, response);
    }
  }

  getData() {
    return {
      type: this.type,
      x: this.x,
      y: this.y,
      radius: this.radius,
    };
  }
}

module.exports = Circle;
