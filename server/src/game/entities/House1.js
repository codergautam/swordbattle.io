const SAT = require('sat');
const Entity = require('./Entity');
const Types = require('../Types');

// TODO: migrate to new shape system

class House1 extends Entity {
  constructor(game, x, y, width, height) {
    super(game, Types.Entity.House1);
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.wallThickness = 20;
    this.walls = new Set();
    this.createWalls();
  }

  createState() {
    const state = super.createState();
    state.width = this.width;
    state.height = this.height;
    return state;
  }

  createWalls() {
    const bottomWallWidth = this.width * 0.3875;
    const walls = [
      [0, 0, this.width, this.wallThickness], // Top
      [0, 0, this.wallThickness, this.height], // Left
      [this.width - this.wallThickness, 0, this.wallThickness, this.height], // Right
      [0, this.height - this.wallThickness, bottomWallWidth, this.wallThickness], // Bottom left
      [this.width - bottomWallWidth, this.height - this.wallThickness, bottomWallWidth, this.wallThickness], // Bottom right
    ];

    for (const wall of walls) {
      const boundary = {
        x: this.x + wall[0],
        y: this.y + wall[1],
        width: wall[2],
        height: wall[3],
      }
      boundary.poly = new SAT.Box(new SAT.Vector(boundary.x, boundary.y), boundary.width, boundary.height).toPolygon();
      this.walls.add(boundary);
    }
  }

  processTargetsCollision() {
    // // Buildings
    // const point = { x: this.shape.x, y: this.shape.y, radius: 1 };
    // let buildingId = null;
    // for (const building of this.game.buildings) {
    //   if (collisions.circleRectangle(point, building)) {
    //     buildingId = building.id;
    //   }
    // }
    // this.inBuildingId = buildingId;

    // Walls (buildings)
    // for (const wall of this.game.walls) {
    //   if (collisions.circleRectangle(this, wall)) {
    //     const mtv = this.getMtv(wall.poly);
    //     this.shape.collisionPoly.pos.add(mtv);
    //   }
    // }
  }
}

module.exports = House1;
