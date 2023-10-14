const SAT = require('sat');
const decomp = require('poly-decomp');
const Shape = require('./Shape');
const ComplexPolygon = require('./ComplexPolygon');
const Types = require('../Types');
const helpers = require('../../helpers');

class Polygon extends Shape {
  constructor(x, y, points) {
    super();
    this.type = Types.Shape.Polygon;
    this.collisionPoly = new SAT.Polygon(new SAT.Vector(x, y), points.map(([x, y]) => new SAT.Vector(x, y)));
    this.centerOffset = new SAT.Vector(0.5, 0.5);
    this.scale = 1;
  }

  static createFromPoints(x, y, points) {
    decomp.makeCCW(points);

    const convexPolygons = decomp.decomp(points);
    if (convexPolygons.length === 1) {
      return new Polygon(x, y, convexPolygons[0]);
    }

    const shapes = [];
    for (const convexPolygon of convexPolygons) {
      shapes.push(new Polygon(x, y, convexPolygon));
    }
    return new ComplexPolygon(x, y, shapes, points);
  }

  static createFromRectangle(x, y, width, height) {
    const points = [
      [0, 0], [width, 0],
      [width, height], [0, height],
    ];
    return new Polygon(x, y, points);
  }

  get center() {
    const centroid = this.collisionPoly.getCentroid();
    return { x: this.x + centroid.x, y: this.y + centroid.y };
  }

  get area() {
    let area = 0;
    const points = this.collisionPoly.points;
    const numPoints = points.length;
  
    for (let i = 0; i < numPoints; i++) {
      let j = (i + 1) % numPoints;
      area += points[i].x * points[j].y;
      area -= points[j].x * points[i].y;
    }
  
    area /= 2;
    return Math.abs(area);
  }

  get angle() {
    return this.collisionPoly.angle;
  }

  setScale(scale) {
    const poly = this.collisionPoly;

    const centroid = new SAT.Vector(0, 0);
    for (let i = 0; i < poly.points.length; i++) {
      centroid.add(poly.points[i]);
    }
    centroid.scale(1 / poly.points.length);

    for (let i = 0; i < poly.points.length; i++) {
      const point = poly.points[i];
      const relPoint = point.clone().sub(centroid);
      relPoint.scale(1 - (this.scale - scale));
      point.copy(relPoint.add(centroid));
    }

    this.scale = scale;
  }

  getRandomPoint() {
    const bounds = this.boundary;
    const point = new SAT.Vector();
    while (point.x === 0 || !SAT.pointInPolygon(point, this.collisionPoly)) {
      point.x = helpers.random(bounds.x, bounds.x + bounds.width);
      point.y = helpers.random(bounds.y, bounds.y + bounds.height);
    }
    return point;
  }

  collides(shape, response) {
    if (shape.type === Types.Shape.Circle) {
      return SAT.testPolygonCircle(this.collisionPoly, shape.collisionPoly, response);
    }
    if (shape.type === Types.Shape.Polygon) {
      if (shape.isComplex) {
        return shape.collides(this, response);
      }
      return SAT.testPolygonPolygon(this.collisionPoly, shape.collisionPoly, response);
    }
  } 

  getData() {
    return {
      type: this.type,
      x: this.x,
      y: this.y,
      points: this.collisionPoly.calcPoints,
      angle: this.angle,
    };
  }
}

module.exports = Polygon;
