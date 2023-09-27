const SAT = require('sat');
const Shape = require('./Shape');
const Types = require('../Types');

class ComplexPolygon extends Shape {
  constructor(x, y, shapes, originalPoints) {
    super();
    this.type = Types.Shape.Polygon;
    this.shapes = shapes;
    this.points = originalPoints.map((point) => ({ x: point[0], y: point[1] }));
    this.isComplex = true;
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
      else if (maxX < point.x) maxX = point.x;

      if (minY > point.y) minY = point.y;
      else if (maxY < point.y) maxY = point.y;
    }

    this.bounds = {
      x: this.x + minX,
      y: this.y + minY,
      width: maxX - minX,
      height: maxY - minY,
    };
    return this.bounds;
  }

  collides(otherShape, response) {
    let collides = false;
    for (const shape of this.shapes) {
      const internalResponse = new SAT.Response();
      if (shape.collides(otherShape, internalResponse)) {
        collides = true;
        response.overlapV.add(internalResponse.overlapV);
        response.overlapN.add(internalResponse.overlapN);
      }
    }
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
