const SAT = require('sat')
const State = require('../components/State');
const helpers = require('../../helpers');

class Entity {
  static defaultDefinition = {};

  constructor(game, type, definition = {}) {
    this.game = game;
    this.type = type;

    this.id = null;
    this.shape = null;
    this.removed = false;
    this.isGlobal = false;
    this.targets = [];
    this.velocity = new SAT.Vector(0, 0);
    this.state = new State(this.createState.bind(this));

    this.density = 1;
    this.spawnZone = null;
    this.respawnable = false;
    this.forbiddenBiomes = [];

    this.originalDefinition = { ...definition }; // used for entity respawn
    this.definition = definition;
    this.processDefinition();
  }

  get weight() {
    return this.shape.area * this.density;
  }

  processDefinition() {
    this.definition = Object.assign({}, this.constructor.defaultDefinition, this.definition);
    
    const { definition } = this;
    
    if (definition.density !== undefined) {
      this.density = definition.density;
    }
    if (definition.size !== undefined) {
      if (Array.isArray(definition.size)) {
        this.size = helpers.random(definition.size[0], definition.size[1]);
      } else {
        this.size = definition.size;
      }
    }

    if (definition.forbiddenBiomes !== undefined) {
      this.forbiddenBiomes = this.game.map.biomes.filter(biome => definition.forbiddenBiomes.includes(biome.type));
    }
    if (definition.spawnZone !== undefined) {
      this.spawnZone = definition.spawnZone;
    }
    this.respawnable = definition.respawnable && this.spawnZone;
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
    this.shape.cleanup();
  }

  createInstance() {
    if (this.definition.respawnTime) {
      this.game.map.addEntityTimer(this.originalDefinition, this.definition.respawnTime);
    } else {
      this.game.map.addEntity(this.originalDefinition);
    }
  }

  remove() {
    this.game.removeEntity(this);
  }
}

module.exports = Entity;
