const SAT = require('sat');
const IdPool = require('./components/IdPool');
const QuadTree = require('./components/Quadtree');
const GameMap = require('./GameMap');
const GlobalEntities = require('./GlobalEntities');
const Player = require('./entities/Player');
const helpers = require('../helpers');
const config = require('../config');
const filter = null;
const Types = require('./Types');
const { getBannedIps } = require('../moderation');
const { filterChatMessage } = helpers;

function hasOwnProperties(obj) {
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) return true;
  }
  return false;
}

class Game {
  constructor() {
    this.entities = new Map();
    this.players = new Set();
    this.newEntities = new Set();
    this.removedEntities = new Set();
    this.idPool = new IdPool();
    this.map = new GameMap(this);
    this.globalEntities = new GlobalEntities(this);

    this.entitiesQuadtree = null;
    this._removedEntitiesById = new Map();
    this.tps = 0;

    this.maxEntities = 10000;
    this.maxPlayers = 100;
  }

  initialize() {
    this.map.initialize();

    const mapBoundary = this.map;
    this.entitiesQuadtree = new QuadTree(mapBoundary, 10, 5);
  }

  tick(dt) {
    for (const [id, entity] of this.entities) {
      // Not a sword
      const entityType = entity.type;
      if (entityType === Types.Entity.Sword) continue;
      entity.update(dt);
    }

    this.updateQuadtree(this.entitiesQuadtree, this.entities);
    const response = new SAT.Response();
    for (const [id, entity] of this.entities) {
      if (entity.removed) continue;

      if (entity.isGlobal) {
        this.globalEntities.entities.set(entity.id, entity);
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

      if (!entity.targets.has(targetEntity.type)) continue;

      response.clear();
      if (targetEntity.shape.collides(entity.shape, response)) {
        entity.processTargetsCollision(targetEntity, response, dt);
      }
    }
    entity.depth = depth;
  }

  //   processClientMessage(client, data) {
  //     if (data.spectate && !client.spectator.isSpectating) {
  //       this.addSpectator(client, data);
  //       return;
  //     }

  //     let { player } = client;



  //     if (data.play && (!player || player.removed)) {
  //       if(getBannedIps().includes(client.ip)) {
  //         // close connection
  //         client.socket.close();
  //         return;
  //       }



  //       if(config.recaptchaSecretKey) {
  //         // verify recaptcha
  //         if(!data.captchaP1) return client.socket.close();
  //         const captchaAsText = helpers.importCaptcha(data);
  // const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${config.recaptchaSecretKey}&response=${captchaAsText}&remoteip=${client.ip}`;

  //         fetch(verifyUrl, {
  //           method: 'post',
  //           headers: {
  //             Accept: 'application/json',
  //             'Content-Type': 'application/json',
  //           },
  //         }).then(res => res.json()).then(json => {
  //           console.log(json);
  //           if(json.success) {
  //             player = this.addPlayer(client, data);
  //           } else {
  //             client.socket.close();
  //           }
  //         }).catch(err => {
  //           console.log(err);
  //           client.socket.close();
  //         });
  //       } else {
  //       player = this.addPlayer(client, data);
  //       }
  //     } else {
  //       if (!player) return;
  //       if (data.inputs) {
  //         for (const input of data.inputs) {
  //           if (player.inputDown) {
  //             player.inputs.inputDown(input.inputType);
  //           } else {
  //             player.inputs.inputUp(input.inputType);
  //           }
  //         }
  //       }
  //       if (data.angle && !isNaN(data.angle)) {
  //         player.angle = Number(data.angle);
  //       }
  //       if (data.mouse) {
  //         if (data.mouse.force === 0) {
  //           player.mouse = null;
  //         } else {
  //           player.mouse = data.mouse;
  //         }
  //       }
  //       if (data.selectedEvolution) {
  //         player.evolutions.upgrade(data.selectedEvolution);
  //       }
  //       if (data.selectedBuff) {
  //         player.levels.addBuff(data.selectedBuff);
  //       }
  //       if (data.chatMessage && typeof data.chatMessage === 'string') {
  //         player.addChatMessage(data.chatMessage);
  //       }
  //     }


  //   }

  processClientMessage(client, data) {
    if (data.spectate && !client.spectator.isSpectating) {
      console.log('[CAPTCHA] Spectate request - recaptchaSecretKey:', !!config.recaptchaSecretKey, 'captchaVerified:', client.captchaVerified, 'hasCaptchaP1:', !!data.captchaP1);

      if(config.recaptchaSecretKey && !client.captchaVerified && !data.captchaP1) {
        console.log('[CAPTCHA] Spectate rejected - no captcha data provided');
        try {
          client.socket.close();
        } catch(e) {
          console.log(e)
        }
        return;
      } else if(config.recaptchaSecretKey && !client.captchaVerified && data.captchaP1) {
        console.log('[CAPTCHA] Verifying spectate captcha...');
        const captchaAsText = helpers.importCaptcha(data);
        console.log('[CAPTCHA] Captcha token length:', captchaAsText?.length);
        const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${config.recaptchaSecretKey}&response=${captchaAsText}&remoteip=${client.ip}`;

        fetch(verifyUrl, {
          method: 'post',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        }).then(res => res.json()).then(json => {
          console.log('[CAPTCHA] Spectate verification response:', json);
          if(json.success && json.score >= 0.1) {
            console.log('[CAPTCHA] Spectate captcha verified successfully');
            this.addSpectator(client);
            client.captchaVerified = true;
          } else {
            console.log('[CAPTCHA] Spectate captcha verification failed:', json);
            try {
              client.socket.close();
            } catch(e) {
              console.log(e);
            }
          }
        }).catch(err => {
          console.log('[CAPTCHA] Spectate captcha verification error:', err);
          client.socket.close();
        });
      } else if(!config.recaptchaSecretKey || client.captchaVerified) {
        console.log('[CAPTCHA] Spectate allowed without captcha check - disabled or already verified');
        this.addSpectator(client);
      }

      return;
    }

    let { player } = client;
    if (data.play && (!player || player.removed)) {
      console.log('[CAPTCHA] Play request - recaptchaSecretKey:', !!config.recaptchaSecretKey, 'captchaVerified:', client.captchaVerified, 'hasCaptchaP1:', !!data.captchaP1, 'ip:', client.ip);

      if (getBannedIps().includes(client.ip)) {
        // close connection
        console.log('disconnected reason: banned ip', client.ip);
        client.socket.close();
        return;
      }

      const now = Date.now();
      if (now - client.lastPlayTime < client.playCooldown) {
        console.warn(`[RATE_LIMIT] Client ${client.id} (${client.ip}) attempted to spawn too quickly (cooldown: ${now - client.lastPlayTime}ms)`);
        return; // Silently reject - don't disconnect, just ignore
      }

      if (now > client.playCountResetTime) {
        client.playCount = 0;
        client.playCountResetTime = now + 60000;
      }

      client.playCount++;
      if (client.playCount > client.maxPlaysPerMinute) {
        console.warn(`[RATE_LIMIT] Client ${client.id} (${client.ip}) exceeded play limit (${client.playCount} plays/min)`);
        client.disconnectReason = {
          message: 'Respawn spam detected',
          type: 1
        };
        client.socket.close();
        return;
      }

      client.lastPlayTime = now;
      if(config.recaptchaSecretKey && !data.captchaP1) {
        console.log('[CAPTCHA] Play rejected - no captcha data provided');
        client.socket.close();
        return;
      }
      if(config.recaptchaSecretKey && data.captchaP1) {
        console.log('[CAPTCHA] Verifying play captcha...');
        const captchaAsText = helpers.importCaptcha(data);
        console.log('[CAPTCHA] Captcha token length:', captchaAsText?.length);
        const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${config.recaptchaSecretKey}&response=${captchaAsText}&remoteip=${client.ip}`;

        fetch(verifyUrl, {
          method: 'post',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        }).then(res => res.json()).then(json => {
          console.log('[CAPTCHA] Play verification response:', json);
          if(json.success && json.score >= 0.1) {
            console.log('[CAPTCHA] Play captcha verified successfully');
            player = this.addPlayer(client, data);
          } else {
            console.log('[CAPTCHA] Play captcha verification failed:', json);
            try {
              client.socket.close();
            } catch(e) {
              console.log(e);
            }
          }
        }).catch(err => {
          console.log('[CAPTCHA] Play captcha verification error:', err);
          client.socket.close();
        });
        return;
      }
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
      // Defensive: protect against malformed/attacker-sent evolution values
      try {
        player.evolutions.upgrade(data.selectedEvolution);
      } catch (err) {
        console.error('Failed to process selectedEvolution:', data.selectedEvolution, err);
      }
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
    if (!data.entities || !hasOwnProperties(data.entities)) {
      delete data.entities;
    }
    if (!data.globalEntities || !hasOwnProperties(data.globalEntities)) {
      delete data.globalEntities;
    }

    if (!hasOwnProperties(data)) {
      return null;
    }
    return data;
  }

  updateQuadtree(quadtree, entities) {
    quadtree.clear();
    for (const [id, entity] of entities) {
      const collisionRect = entity.shape.boundary;
      collisionRect.entity = entity;
      quadtree.insert(collisionRect);
    }
  }

  getAllEntities(player) {
    const entities = {};

    for (const entity of this.entities.values()) {
      if (entity.isStatic) {
        entities[entity.id] = entity.state.get();
      }
    }

    for (const entityId of player.getEntitiesInViewport()) {
      const entity = this.entities.get(entityId);
      if (!entity) continue;
      if (entity.isStatic) continue;
      entities[entity.id] = entity.state.get();
    }

    return entities;
  }

  getEntitiesChanges(player) {
    const changes = {};
    const previousViewport = player.viewportEntityIds;
    const currentViewport = player.getEntitiesInViewport();

    const previousSet = new Set(previousViewport);
    const seen = new Set();

    for (const entityId of currentViewport) {
      if (seen.has(entityId)) continue;
      seen.add(entityId);

      const entity = this.entities.get(entityId);
      if (!entity) {
        const removedEntity = this._removedEntitiesById.get(entityId);
        changes[entityId] = { removed: true };
        if (removedEntity?.type === Types.Entity.Player && removedEntity?.client?.disconnectReason) {
          changes[entityId].disconnectReasonMessage = removedEntity.client.disconnectReason.message;
          changes[entityId].disconnectReasonType = removedEntity.client.disconnectReason.type;
        }
        continue;
      }
      if (entity.isStatic) continue;

      const stateData = entity.state.get();

      if (!previousSet.has(entityId)) {
        // New entity entering viewport - send full state
        changes[entity.id] = stateData;
      } else {
        // Entity in both viewports - send only changes
        if (entity.state.hasChanged()) {
          changes[entity.id] = entity.state.getChanges();
        }
      }
    }

    for (const entityId of previousViewport) {
      if (seen.has(entityId)) continue;
      seen.add(entityId);

      // Entity was in previous viewport but not in current
      const entity = this.entities.get(entityId);
      if (!entity) {
        const removedEntity = this._removedEntitiesById.get(entityId);
        changes[entityId] = { removed: true };
        if (removedEntity?.type === Types.Entity.Player && removedEntity?.client?.disconnectReason) {
          changes[entityId].disconnectReasonMessage = removedEntity.client.disconnectReason.message;
          changes[entityId].disconnectReasonType = removedEntity.client.disconnectReason.type;
        }
        continue;
      }
      if (entity.isStatic) continue;

      entity.state.get();
      changes[entity.id] = {
        ...entity.state.getChanges(),
        removed: true,
      };
    }

    return changes;
  }

  endTick() {
    this.cleanup();
  }

  addPlayer(client, data) {
    if (this.players.size >= this.maxPlayers) {
      console.warn(`[LIMIT] Server at max player capacity (${this.players.size}/${this.maxPlayers})`);
      client.disconnectReason = {
        message: 'Server full',
        type: 0
      };
      return null;
    }

    // const name = client.player
    //   ? client.player.name
    //   : (client.account ? client.account.username : this.handleNickname(data.name || ''));
    const name = client.account && client.account.username ? client.account.username : (
      client.player && client.player.name ? client.player.name
        : this.handleNickname(filterChatMessage(data.name, filter).filtered || '')
    )
    if (data?.name && data.name !== name) {
      data.name = name;
    }

    if (client.account && client.account.id) {
      // Make sure same account can't join twice
      for (const player of this.players) {
        if (player?.client?.account && player.client.account?.id === client.account.id) {
          return;
        }
      }
    }

    // if (this.isNameReserved(name)) return;

    const player = new Player(this, name);
    client.spectator.isSpectating = false;
    client.fullSync = true;
    client.player = player;
    player.client = client;
    if (client.account) {
      const account = client.account;
      if (account.skins && account.skins.equipped) {
        player.skin = account.skins.equipped;
        player.sword.skin = player.skin;
      } else {
      }
    }
    this.players.add(player);

    const pendingRespawn = client.pendingRespawn;
    if (pendingRespawn && Date.now() < pendingRespawn.expiresAt) {
      const spawnPos = this.map.findSafeSpawnNear(pendingRespawn.x, pendingRespawn.y, 10000);
      player.shape.x = spawnPos.x;
      player.shape.y = spawnPos.y;
      player.inSafezone = false;

      player.levels.addCoins(pendingRespawn.coins);

      player.respawnShieldActive = true;
      player.respawnShieldTimer = 10;

      player.respawnedAt = Date.now();
      player.respawnKillerName = pendingRespawn.killerName;

      client.pendingRespawn = null;
    } else {
      this.map.spawnPlayer(player);
      client.pendingRespawn = null;
    }

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
    if (this.entities.has(entity?.id)) return;

    if (this.entities.size >= this.maxEntities && entity.type !== Types.Entity.Player && entity.type !== Types.Entity.Sword) {
      console.warn(`[LIMIT] Max entities reached (${this.entities.size}/${this.maxEntities}), rejecting entity type ${entity.type}`);
      return null;
    }

    if (entity.id === null) {
      entity.id = this.idPool.take();
    }
    this.entities.set(entity.id, entity);
    this.newEntities.add(entity);
    return entity;
  }

  removeClient(client) {
    if (client.player) {
      this.removeEntity(client.player);
    }
  }

  removeEntity(entity) {
    if (!this.entities.has(entity?.id)) return;

    if (entity.sword) this.removeEntity(entity.sword);
    this.entities.delete(entity?.id);
    this.players.delete(entity);
    this.newEntities.delete(entity);
    this.removedEntities.add(entity);
    this._removedEntitiesById.set(entity.id, entity);
    entity.removed = true;
  }

  handleNickname(nickname) {
    const nicknameLength = nickname.length >= 1 && nickname.length <= 20;
    return nicknameLength ? nickname : 'Player'
  }

  cleanup() {
    for (const [id, entity] of this.entities) {
      entity.cleanup();
    }

    this.newEntities.clear();
    this.removedEntities.clear();
    this._removedEntitiesById.clear();
    this.globalEntities.cleanup();
  }
}

module.exports = Game;
