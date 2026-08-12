const SAT = require('sat');
const Shape = require('./Shape');
const Types = require('../Types');
const helpers = require('../../helpers');

class ComplexPolygon extends Shape {
  constructor(shapes, originalPoints) {
    super();
    this.type = Types.Shape.Polygon;
    this.shapes = shapes;
    this.points = originalPoints.map((point) => ({ x: point[0], y: point[1] }));
    this.isComplex = true;
    this._internalResponse = new SAT.Response();
  }

  get x() {
    return this.shapes[0].x;
  }

  set x(value) {
    for (const shape of this.shapes) {
      shape.x = value;
    }
  }

  get y() {
    return this.shapes[0].y;
  }

  set y(value) {
    for (const shape of this.shapes) {
      shape.y = value;
    }
  }

  get center() {
    const b = this.boundary;
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  }

  get area() {
    let area = 0;
    for (const shape of this.shapes) {
      area += shape.area;
    }
    return area;
  }

  get boundary() {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const point of this.points) {
      if (minX > point.x) minX = point.x;
      if (maxX < point.x) maxX = point.x;
      if (minY > point.y) minY = point.y;
      if (maxY < point.y) maxY = point.y;
    }

    this._boundary.x = this.x + minX;
    this._boundary.y = this.y + minY;
    this._boundary.width = maxX - minX;
    this._boundary.height = maxY - minY;
    return this._boundary;
  }

  isPointInside(x, y) {
    for (const shape of this.shapes) {
      if (shape.isPointInside(x, y)) {
        return true;
      }
    }
    return false;
  }

  getRandomPoint() {
    const bounds = this.boundary;
    const point = new SAT.Vector();
    let tries = 0;
    do {
      point.x = helpers.random(bounds.x, bounds.x + bounds.width);
      point.y = helpers.random(bounds.y, bounds.y + bounds.height);
      tries++;
    } while (!this.isPointInside(point.x, point.y) && tries < 100);
    return point;
  }

  collides(otherShape, response) {
    let collides = false;
    // SAT explicitly supports Response reuse. Accumulate into the caller's
    // vector so complex map geometry creates no temporary vectors/responses
    // in the collision hot path.
    const mtv = response.overlapV;
    mtv.x = 0;
    mtv.y = 0;
    for (const shape of this.shapes) {
      const internalResponse = this._internalResponse;
      internalResponse.clear();
      if (shape.collides(otherShape, internalResponse)) {
        collides = true;
        mtv.add(internalResponse.overlapN).add(internalResponse.overlapV);
      }
    }
    response.overlapN.scale(0);
    return collides;
  }

  getData() {
    return {
      type: this.type,
      x: this.shapes[0].x,
      y: this.shapes[0].y,
      points: this.points,
    }
  }
}

module.exports = ComplexPolygon;
