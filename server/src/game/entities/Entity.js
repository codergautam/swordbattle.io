const helpers = require('../../helpers');
const State = require('../components/State');

class Entity {
  constructor(game, type, definition = {}) {
    this.game = game;
    this.type = type;
    this.originalDefinition = { ...definition };
    this.definition = definition;
    this.shape = null;
    this.id = null;
    this.removed = false;
    this.state = new State(this.createState.bind(this));
    this.targets = [];
    
    // Definition options
    this.density = definition.density !== undefined ? definition.density : 1;
    if (definition.size !== undefined) {
      if (Array.isArray(definition.size)) {
        this.size = helpers.random(definition.size[0], definition.size[1]);
      } else {
        this.size = definition.size;
      }
    }

    this.spawnZone = definition.spawnZone;
    this.respawnable = definition.respawnable && this.spawnZone;
  }

  get weight() {
    return this.shape.area * this.density;
  }

  spawn() {
    if (this.spawnZone) {
      this.spawnZone.randomSpawnInside(this.shape);
    } else if (Array.isArray(this.definition.position)) {
      this.shape.x = this.definition.position[0];
      this.shape.y = this.definition.position[1];
    }
  }

  createState() {
    return {
      id: this.id,
      type: this.type,
      shapeData: this.shape.getData(),
    };
  }

  update() {
  }

  processTargetsCollision(targetEntity, dt) {}

  cleanup() {
    this.state.cleanup();
  }

  createInstance() {
    this.game.map.addEntity(this.originalDefinition);
  }

  remove() {
    this.game.removeEntity(this);
  }
}

module.exports = Entity;
