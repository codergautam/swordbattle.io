const Circle = require('../shapes/Circle');
const Polygon = require('../shapes/Polygon');

class Biome {
  constructor(game, type, definition) {
    this.game = game;
    this.type = type;
    this.definition = definition;

    this.shape = null;
    this.zIndex = 0;
    this.createShape(definition);
  }

  createShape(definition) {
    const x = definition.pos[0];
    const y = definition.pos[1];
    let shape;

    if (definition.radius !== undefined) {
      shape = Circle.create(x, y, definition.radius);
    } else if (definition.points !== undefined) {
      shape = Polygon.createFromPoints(x, y, definition.points);
    } else if (definition.width !== undefined && definition.height !== undefined) {
      shape = Polygon.createFromRectangle(x, y, definition.width, definition.height);
    } else {
      throw new Error('Unknown biome shape: ' + JSON.stringify(definition));
    }

    shape.sendPoints = true;
    this.shape = shape;
  }

  getData() {
    return {
      type: this.type,
      shapeData: this.shape.getData(),
    };
  }

  initialize() {
    const { definition } = this;
    definition.objects = definition.objects || [];

    for (const entityData of definition.objects) {
      const data = { ...entityData };
      if (data.position === 'random') data.spawnZone = this.shape;

      for (let i = 0; i < entityData.amount; i++) {
        this.game.map.addEntity(data);
      }
    }
  }

  collides(player, response) {}

  applyEffects(player, response) {}
}

module.exports = Biome;
