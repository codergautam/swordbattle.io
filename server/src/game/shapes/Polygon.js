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
    this.sendPoints = false;
    this._cachedArea = null;
  }

  static createFromPoints(x, y, points, renderPoints) {
    decomp.removeDuplicatePoints(points, 1e-6);
    decomp.removeCollinearPoints(points, 1e-3);
    decomp.makeCCW(points);

    const convexPolygons = decomp.quickDecomp(points);
    const visual = renderPoints || points;
    if (convexPolygons.length === 1) {
      const poly = new Polygon(x, y, convexPolygons[0]);
      if (renderPoints) {
        poly.renderPoints = renderPoints.map(([px, py]) => ({ x: px, y: py }));
      }
      return poly;
    }

    const shapes = [];
    for (const convexPolygon of convexPolygons) {
      shapes.push(new Polygon(x, y, convexPolygon));
    }
    return new ComplexPolygon(shapes, visual);
  }

  static createFromRectangle(x, y, width, height, withPosition = false) {
    const px = withPosition ? x : 0;
    const py = withPosition ? y : 0;
    const points = [
      [px, py], [px + width, py],
      [px + width, py + height], [px, py + height],
    ];
    return new Polygon(x, y, points);
  }

  get center() {
    const centroid = this.collisionPoly.getCentroid();
    return { x: this.x + centroid.x, y: this.y + centroid.y };
  }

  get area() {
    if (this._cachedArea !== null) return this._cachedArea;
    let area = 0;
    const points = this.collisionPoly.points;
    const numPoints = points.length;

    for (let i = 0; i < numPoints; i++) {
      let j = (i + 1) % numPoints;
      area += points[i].x * points[j].y;
      area -= points[j].x * points[i].y;
    }

    area /= 2;
    this._cachedArea = Math.abs(area);
    return this._cachedArea;
  }

  get boundary() {
    const points = this.collisionPoly.calcPoints;
    const pos = this.collisionPoly.pos;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let index = 0; index < points.length; index++) {
      const point = points[index];
      if (point.x < minX) minX = point.x;
      if (point.y < minY) minY = point.y;
      if (point.x > maxX) maxX = point.x;
      if (point.y > maxY) maxY = point.y;
    }
    this._boundary.x = pos.x + minX;
    this._boundary.y = pos.y + minY;
    this._boundary.width = maxX - minX;
    this._boundary.height = maxY - minY;
    return this._boundary;
  }

  get angle() {
    return this.collisionPoly.angle;
  }

  set angle(value) {
    this.collisionPoly.setAngle(value);
  }

  // seems like it doesn't work
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
    this._cachedArea = null;
  }

  getRandomPoint() {
    const bounds = this.boundary;
    const point = new SAT.Vector();
    let tries = 0;
    do {
      point.x = helpers.random(bounds.x, bounds.x + bounds.width);
      point.y = helpers.random(bounds.y, bounds.y + bounds.height);
      tries++;
    } while (!SAT.pointInPolygon(point, this.collisionPoly) && tries < 100);
    return point;
  }

  isPointInside(x, y) {
    Polygon._point.x = x;
    Polygon._point.y = y;
    return SAT.pointInPolygon(Polygon._point, this.collisionPoly);
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
    const data = {
      type: this.type,
      x: this.x,
      y: this.y,
      angle: this.angle,
    };
    if (this.sendPoints) {
      data.points = this.renderPoints || this.collisionPoly.calcPoints;
    }
    return data;
  }
}

Polygon._point = new SAT.Vector();

module.exports = Polygon;
