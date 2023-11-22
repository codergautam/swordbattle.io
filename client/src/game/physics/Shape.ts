import { ShapeTypes } from '../Types';

export type Point = { x: number, y: number };
export type ShapeType = Shape | CircleShape | PolygonShape;

export class Shape {
  [key: string]: any;
  type: ShapeTypes;
  x = 0;
  y = 0;

  constructor(x: number, y: number) {
    this.type = ShapeTypes.Point;
    this.x = x;
    this.y = y;
  }
  
  recalculateBounds() {}

  fillShape(graphics: Phaser.GameObjects.Graphics) {}

  update(shapeData: any) {
    let changed = false;
    ['x', 'y', 'radius', 'angle'].forEach((property) => {
      if (shapeData[property] !== undefined) {
        this[property] = shapeData[property];
        changed = true;
      }
    });
    if (shapeData.points) {
      for (let i in shapeData.points) {
        this.points[i] = shapeData.points[i];
      }
      changed = true;
    }
    if (changed) {
      this.recalculateBounds();
    }
  }

  static create(shapeData: any) {
    switch (shapeData.type) {
      case ShapeTypes.Circle:
        return new CircleShape(shapeData.x, shapeData.y, shapeData.radius);
      case ShapeTypes.Polygon:
        return new PolygonShape(shapeData.x, shapeData.y, shapeData.points);
      default:
        console.warn('Unknown shape type: ', shapeData);
        return new Shape(0, 0);
    }
  }
}

export class CircleShape extends Shape {
  radius = 0;
  circle!: Phaser.Geom.Circle;

  constructor(x: number, y: number, radius: number) {
    super(x, y);
    this.type = ShapeTypes.Circle;
    this.radius = radius;
    this.recalculateBounds();
  }

  fillShape(graphics: Phaser.GameObjects.Graphics) {
    graphics.beginPath();
    graphics.fillCircle(this.x, this.y, this.radius);
    graphics.closePath();
  }

  recalculateBounds() {
    this.circle = new Phaser.Geom.Circle(this.x, this.y, this.radius);
  }

  isInViewport(camera: Phaser.Cameras.Scene2D.Camera): boolean {
    const bounds = camera.worldView;
    return Phaser.Geom.Intersects.CircleToRectangle(this.circle, bounds);
  }
}

export class PolygonShape extends Shape {
  points: Point[] = [];
  angle: number = 0;
  polygonBounds!: Phaser.Geom.Rectangle;

  constructor(x: number, y: number, points?: Point[]) {
    super(x, y);
    this.type = ShapeTypes.Polygon;
    if (points) {
      this.points = Object.values(points).reverse();
    }
    this.recalculateBounds();
  }

  fillShape(graphics: Phaser.GameObjects.Graphics) {
    graphics.beginPath();
    graphics.moveTo(this.x + this.points[0].x, this.y + this.points[0].y);
    for (let i = 1; i < this.points.length; i++) {
      const point = this.points[i];
      graphics.lineTo(this.x + point.x, this.y + point.y);
    }
    graphics.closePath();
    graphics.fillPath();
  }

  recalculateBounds() {
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

    minX += this.x;
    maxX += this.x;
    minY += this.y;
    maxY += this.y;

    this.polygonBounds = new Phaser.Geom.Rectangle(minX, minY, maxX - minX, maxY - minY);
    return this.bounds;
  }

  isInViewport(camera: Phaser.Cameras.Scene2D.Camera): boolean {
    return Phaser.Geom.Rectangle.Overlaps(camera.worldView, this.polygonBounds);
  }
}
