const { pack } = require('msgpackr');
const IdPool = require('./IdPool');
const GameMap = require('./GameMap');
const Player = require('./entities/Player');
const Coin = require('./entities/Coin');
const helpers = require('../helpers');
const QuadTree = require('./Quadtree');
const config = require('../config');

class Game {
  constructor() {
    this.entities = new Set();
    this.players = new Set();
    this.swords = new Set();
    this.coins = new Set();
    this.mapObjects = new Set();
    this.walls = new Set();
    this.newEntities = new Set();
    this.removedEntities = new Set();
    this.idPool = new IdPool();
    this.map = new GameMap(this, config.map.width, config.map.height);
    this.coinsQuadtree = null;
    this.playersQuadtree = null;
    this.swordsQuadtree = null;
    this.tps = 0;
  }

  initialize() {
    const mapBoundary = { x: 0, y: 0, width: this.map.width, height: this.map.height };
    this.coinsQuadtree = new QuadTree(mapBoundary, 15, 4);
    this.playersQuadtree = new QuadTree(mapBoundary, 10, 4);
    this.swordsQuadtree = new QuadTree(mapBoundary, 10, 4);
    this.map.spawnObjects();
  }

  processClientMessage(client, data) {
    let { player } = client;
    if (!player) {
      player = this.addPlayer(client, data);
    }

    if (data.freeze) {
      player.inputs.clear();
      player.mouse = null;
    } else {
      if (data.inputs) {
        for (const input of data.inputs) {
          if (input.inputDown) {
            player.inputs.inputDown(input.inputType);
          } else {
            player.inputs.inputUp(input.inputType);
          }
        }
      }
      if (!isNaN(data.angle)) {
        player.angle = Number(data.angle);
      }
      if (data.mouse) {
        if (data.mouse.force === 0) {
          player.mouse = null;
        } else {
          player.mouse = data.mouse;
        }
      }
    }

    if (data.evolution) {
      player.evolve(data.evolution);
    }
  }

  tick(dt) {
    this.updateQuadtree(this.coinsQuadtree, this.coins);
    this.updateQuadtree(this.playersQuadtree, this.players);
    this.updateQuadtree(this.swordsQuadtree, this.swords);

    for (let i = this.coins.size; i < this.map.coinsCount; i++) {
      const coin = new Coin(this);
      this.addCoin(coin);
    }

    for (const entity of this.entities) {
      entity.update(dt);
    }
  }

  updateQuadtree(quadtree, entities) {
    quadtree.clear();
    for (const entity of entities) {
      const collisionRect = entity.boundary;
      collisionRect.entity = entity;
      quadtree.insert(collisionRect);
    }
  }

  createPayload(client) {
    const { player } = client;
    if (!player) return null;

    const data = {};
    if (this.newEntities.has(player)) {
      data.fullSync = true;
      data.selfId = player.id;
      data.entities = this.getAllEntities();
      data.mapData = this.map.getData();
    } else {
      data.entities = Object.assign(
        this.getEntitiesChanges(),
        this.getNewEntities(),
      );
    }
    if (process.env.DEBUG === 'TRUE') {
      data.timestamp = Date.now();
      data.tps = this.tps;
    }

    // Delete empty entities object so that we don't send empty payload.
    if (Object.keys(data.entities).length === 0) {
      delete data.entities;
    }
    if (Object.keys(data).length === 0) {
      return null;
    }

    return pack(data);
  }

  getAllEntities() {
    const entities = {};
    for (const entity of this.entities) {
      entities[entity.id] = entity.state.get();
    }
    return entities;
  }

  getEntitiesChanges() {
    const changes = {};
    for (const entity of this.entities) {
      entity.state.get();
      if (entity.state.hasChanged()) {
        changes[entity.id] = entity.state.getChanges();
      }
    }
    for (const entity of this.removedEntities) {
      entity.state.get();
      changes[entity.id] = {
        ...entity.state.getChanges(),
        removed: true,
      };
      if (entity.client) changes[entity.id].disconnectReason = entity.client.disconnectReason;
    }
    return changes;
  }

  getNewEntities() {
    const newEntities = {};
    for (const entity of this.newEntities) {
      newEntities[entity.id] = entity.state.get();
    }
    return newEntities;
  }

  endTick() {
    this.cleanup();
  }

  cleanup() {
    for (const entity of this.entities) {
      entity.cleanup();
    }

    this.newEntities.clear();
    this.removedEntities.clear();
  }

  addPlayer(client, data) {
    const name = this.handleNickname(data.name || '');
    const player = new Player(this, name);
    this.swords.add(player.sword);

    client.player = player;
    player.client = client;
    this.players.add(player);
    this.spawnPlayer(player);
    this.addEntity(player);
    return player;
  }

  spawnPlayer(player) {
    player.x = helpers.random(player.radius, this.map.width - player.radius);
    player.y = helpers.random(player.radius, this.map.height - player.radius);
  }

  addBuilding(building) {
    this.addEntity(building);
    this.mapObjects.add(building);
    building.walls.forEach(wall => this.walls.add(wall));
  }

  addCoin(coin) {
    this.addEntity(coin);
    this.coins.add(coin);
  }

  addEntity(entity) {
    if (this.entities.has(entity)) return;

    if (entity.id === null) {
      entity.id = this.idPool.take();
    }
    this.entities.add(entity);
    this.newEntities.add(entity);
    return entity;
  }

  removeClient(client) {
    if (client.player) {
      this.removeEntity(client.player);
    }
  }

  removeEntity(entity) {
    if (!this.entities.has(entity)) return;

    if (entity.sword) this.swords.delete(entity.sword);
    this.entities.delete(entity);
    this.players.delete(entity);
    this.coins.delete(entity);
    this.newEntities.delete(entity);
    this.removedEntities.add(entity);
    entity.removed = true;

    this.idPool.give(entity.id);
  }

  handleNickname(nickname) {
    const nicknameLength = nickname.length >= 1 && nickname.length <= 16;

    let unique = true;
    for (const entity of this.entities) {
      if (entity.name === nickname) {
        unique = false;
      }
    }

    if (nicknameLength && unique) {
      return nickname;
    }
    return helpers.randomNickname();
  }
}

module.exports = Game;
