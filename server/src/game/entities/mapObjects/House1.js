const Entity = require('../Entity');
const Polygon = require('../../shapes/Polygon');
const ComplexPolygon = require('../../shapes/ComplexPolygon');
const Types = require('../../Types');

class House1 extends Entity {
  static defaultDefinition = {
    width: 1500,
    height: 1000,
  };

  constructor(game, definition) {
    super(game, Types.Entity.House1, definition);
    
    this.width = this.definition.width;
    this.height = this.definition.height;
    this.wallThickness = 50;
    this.targets.push(...Types.Groups.Obstacles);

    this.createShape();
    this.spawn();

    this.depthZone = Polygon.createFromRectangle(this.width / 2, this.height / 2, this.width, this.height);
  }

  createShape() {
    const polys = [];
    const bottomWallWidth = this.width * 0.3875;
    const walls = [
      [0, 0, this.width, this.wallThickness], // Top
      [0, 0, this.wallThickness, this.height], // Left
      [this.width - this.wallThickness, 0, this.wallThickness, this.height], // Right
      [0, this.height - this.wallThickness, bottomWallWidth, this.wallThickness], // Bottom left
      [this.width - bottomWallWidth, this.height - this.wallThickness, bottomWallWidth, this.wallThickness], // Bottom right
    ];
    for (const wall of walls) {
      const poly = Polygon.createFromRectangle(wall[0], wall[1], wall[2], wall[3], true);
      poly.x = wall[0];
      poly.y = wall[1];
      polys.push(poly);
    }

    this.shape = new ComplexPolygon(polys, [
      [0, 0], [this.width, 0],
      [this.width, this.height], [0, this.height],
    ]);
  }

  createState() {
    const state = super.createState();
    state.width = this.width;
    state.height = this.height;
    return state;
  }

  update() {
    this.depthZone.x = this.shape.x;
    this.depthZone.y = this.shape.y;
  }

  processTargetsCollision(entity, response) {
    if (entity.type === Types.Entity.Sword) {
      entity.restrictFly = true;
      if (entity.isFlying) {
        entity.stopFly();
      }
    } else {
      const mtv = this.shape.getCollisionOverlap(response);
      entity.shape.applyCollision(mtv);
    }
  }
}

module.exports = House1;
