const SAT = require('sat');
const IdPool = require('./components/IdPool');
const QuadTree = require('./components/Quadtree');
const GameMap = require('./GameMap');
const GlobalEntities = require('./GlobalEntities');
const Player = require('./entities/Player');
const helpers = require('../helpers');
const config = require('../config');

class Game {
  constructor() {
    this.entities = new Set();
    this.players = new Set();
    this.newEntities = new Set();
    this.removedEntities = new Set();
    this.idPool = new IdPool();
    this.map = new GameMap(this);
    this.globalEntities = new GlobalEntities(this);
    this.leaderPlayer = null;

    this.entitiesQuadtree = null;
    this.tps = 0;
  }

  initialize() {
    this.map.initialize();

    const mapBoundary = this.map;
    this.entitiesQuadtree = new QuadTree(mapBoundary, 10, 5);
  }

  tick(dt) {
    for (const entity of this.entities) {
      entity.update(dt);
    }

    this.updateQuadtree(this.entitiesQuadtree, this.entities);
    const response = new SAT.Response();
    for (const entity of this.entities) {
      if (entity.removed) continue;

      if (entity.isGlobal) {
        this.globalEntities.entities.add(entity);
      }

      this.processCollisions(entity, response, dt);
    }
    this.map.update(dt);
  }

  processCollisions(entity, response, dt) {
    const quadtreeSearch = this.entitiesQuadtree.get(entity.shape.boundary);

    let depth = 0;
    for (const { entity: targetEntity } of quadtreeSearch) {
      if (entity === targetEntity) continue;
      if (targetEntity.removed) continue;

      // Update entity depth (buildings)
      if (targetEntity.depthZone) {
        const center = entity.shape.center;
        if (targetEntity.depthZone.isPointInside(center.x, center.y)) {
          depth = targetEntity.id;
        }
      }

      if (!entity.targets.includes(targetEntity.type)) continue;

      response.clear();
      if (targetEntity.shape.collides(entity.shape, response)) {
        entity.processTargetsCollision(targetEntity, response, dt);
      }
    }
    entity.depth = depth;
  }

  processClientMessage(client, data) {
    if (data.spectate && !client.spectator.isSpectating) {
      this.addSpectator(client, data);
      return;
    }

    let { player } = client;
    if (data.play && (!player || player.removed)) {
      player = this.addPlayer(client, data);
    }

    if (!player) return;

    if (data.inputs) {
      for (const input of data.inputs) {
        if (input.inputDown) {
          player.inputs.inputDown(input.inputType);
        } else {
          player.inputs.inputUp(input.inputType);
        }
      }
    }
    if (data.angle && !isNaN(data.angle)) {
      player.angle = Number(data.angle);
    }
    if (data.mouse) {
      if (data.mouse.force === 0) {
        player.mouse = null;
      } else {
        player.mouse = data.mouse;
      }
    }
    if (data.selectedEvolution) {
      player.evolutions.upgrade(data.selectedEvolution);
    }
    if (data.selectedBuff) {
      player.levels.addBuff(data.selectedBuff);
    }
    if (data.chatMessage && typeof data.chatMessage === 'string') {
      player.addChatMessage(data.chatMessage);
    }
  }

  createPayload(client) {
    const { spectator } = client;
    const entity = spectator.isSpectating ? spectator : client.player;
    if (!entity) return null;

    const data = {};

    if (spectator.isSpectating) {
      const spectatorData = spectator.state.get();
      if (client.fullSync) {
        data.spectator = spectatorData;
        data.mapData = this.map.getData();
      } else {
        if (spectator.state.hasChanged()) {
          data.spectator = spectator.state.getChanges();
        }
      }
    }

    if (client.fullSync) {
      client.fullSync = false;
      data.fullSync = true;
      data.selfId = entity.id;
      data.entities = this.getAllEntities(entity);
      data.globalEntities = this.globalEntities.getAll();
    } else {
      data.entities = this.getEntitiesChanges(entity);
      data.globalEntities = this.globalEntities.getChanges();
    }
    // Delete empty entities object so that we don't send empty payload.
    if (Object.keys(data.entities).length === 0) {
      delete data.entities;
    }
    if (Object.keys(data.globalEntities).length === 0) {
      delete data.globalEntities;
    }

    if (Object.keys(data).length === 0) {
      return null;
    }
    return data;
  }

  updateQuadtree(quadtree, entities) {
    quadtree.clear();
    for (const entity of entities) {
      const collisionRect = entity.shape.boundary;
      collisionRect.entity = entity;
      quadtree.insert(collisionRect);
    }
  }

  getAllEntities(player) {
    const entities = {};
    for (const entity of player.getEntitiesInViewport()) {
      if (entity.isStatic) continue;
      entities[entity.id] = entity.state.get();
    }
    return entities;
  }

  getEntitiesChanges(player) {
    const changes = {};
    const previousViewport = player.viewportEntities;
    const currentViewport = player.getEntitiesInViewport();
    const allViewportEntities = currentViewport.concat(previousViewport);
    for (const entity of allViewportEntities) {
      if (entity.isStatic) continue;

      entity.state.get(); // updates state

      // If player wasn't it previous viewport, it sends as new entity
      if (previousViewport.indexOf(entity) === -1) {
        changes[entity.id] = entity.state.get();
      // If entity was in previous viewport but it's not in current, it counts as removed entity
      } else if (currentViewport.indexOf(entity) === -1) {
        changes[entity.id] = {
          ...entity.state.getChanges(),
          removed: true,
        };
      // If entity is in both viewports, just send changes
      } else {
        if (entity.state.hasChanged()) {
          changes[entity.id] = entity.state.getChanges();
        }
      }
    }

    return changes;
  }

  endTick() {
    this.cleanup();
  }

  addPlayer(client, data) {
    // const name = client.player
    //   ? client.player.name
    //   : (client.account ? client.account.username : this.handleNickname(data.name || ''));
    const name = client.account && client.account.username ? client.account.username : (
      client.player && client.player.name ? client.player.name
      : this.handleNickname(data.name || '')
    )
    if(data?.name && data.name !== name) {
      data.name = name;
    }

    // if (this.isNameReserved(name)) return;

    const player = new Player(this, name);
    client.spectator.isSpectating = false;
    client.fullSync = true;
    client.player = player;
    player.client = client;
    if(client.account) {
      const account=client.account;
      if(account.skins && account.skins.equipped) {
        player.skin = account.skins.equipped;
        player.sword.skin = player.skin;
      } else {
        console.log(account)
      }
    }
    this.players.add(player);
    this.map.spawnPlayer(player);
    this.addEntity(player);
    return player;
  }

  isNameReserved(name) {
    for (const player of this.players) {
      if (player.name === name) {
        return true;
      }
    }
    return false;
  }

  addSpectator(client) {
    const { spectator } = client;
    spectator.isSpectating = true;
    if (!client.player) {
      spectator.initialize();
      client.fullSync = true;
    }
    return spectator;
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

    if (entity.sword) this.removeEntity(entity.sword);
    this.entities.delete(entity);
    this.players.delete(entity);
    this.newEntities.delete(entity);
    this.removedEntities.add(entity);
    entity.removed = true;
  }

  handleNickname(nickname) {
    const nicknameLength = nickname.length >= 1 && nickname.length <= 16;
    return nicknameLength ? nickname : 'Player'
  }

  cleanup() {
    for (const entity of this.entities) {
      entity.cleanup();
    }

    this.newEntities.clear();
    this.removedEntities.clear();
    this.globalEntities.cleanup();
  }
}

module.exports = Game;