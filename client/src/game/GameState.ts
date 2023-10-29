import Game from './scenes/Game';
import Socket from './network/Socket';
import { EntityTypes } from './Types';
import { Settings } from './Settings';
import Inputs from './Inputs';
import GameMap from './GameMap';
import Coin from './entities/Coin';
import Player from './entities/Player';
import House1 from './entities/mapObjects/House1';
import MossyRock from './entities/mapObjects/MossyRock';
import Rock from './entities/mapObjects/Rock';
import LavaRock from './entities/mapObjects/LavaRock';
import WolfMob from './entities/mobs/Wolf';
import BunnyMob from './entities/mobs/Bunny';
import MooseMob from './entities/mobs/Moose';
import ChimeraMob from './entities/mobs/Chimera';
import YetiMob from './entities/mobs/Yeti';
import RokuMob from './entities/mobs/Roku';
import Fireball from './entities/Fireball';
import Chest from './entities/Chest';
import GlobalEntity from './entities/GlobalEntity';
import Sword from './entities/Sword';

class GameState {
  game: Game;
  socket: WebSocket;
  interval: any;
  entities: Record<number, any> = {};
  globalEntities: Record<number, GlobalEntity> = {};
  removedEntities: Set<any> = new Set();
  gameMap: GameMap;
  self: {
    id: number,
    entity: Player | null,
  };
  lastLeaderboardUpdate: number = 0;
  leaderboardUpdateInterval: number = 1000;
  playerAngle: number = 0;
  previousPlayerAngle: number = 0;
  payloadsQueue: any[] = [];
  disconnectReason = 'Server';
  tps = 0;
  ping = 0;
  pingStart = 0;

  inputs: Inputs = new Inputs();
  previousInputs: Inputs = new Inputs();
  mouse: any = { angle: 0, force: 0 };
  selectedEvolution: string | null = null;
  selectedBuff: any;
  chatMessage: string | null = null;

  constructor(game: Game) {
    this.game = game;
    this.gameMap = new GameMap(this.game);
    this.socket = Socket.connect(
      this.getServer(),
      this.onServerOpen.bind(this),
      this.onServerMessage.bind(this),
      this.onServerClose.bind(this),
    );
  
    this.self = {
      id: -1,
      entity: null,
    };
  }

  getServer() {
    const servers = {
      dev: process.env.REACT_APP_ENDPOINT_DEV || 'localhost:8000',
      eu: process.env.REACT_APP_ENDPOINT_EU || '',
      us: process.env.REACT_APP_ENDPOINT_US || '',
    } as any;
    return servers[Settings.server];
  }

  initialize() {
    this.game.events.on('startGame', this.start, this);
    this.game.game.events.on('restartGame', this.restart, this);
    this.interval = setInterval(() => this.tick(), 1000 / 30);
  }

  start(name: string) {
    Socket.emit({ name });
  }

  onServerOpen() {
    console.log('server connected');
  }

  onServerClose(event: CloseEvent) {
    this.disconnectReason = event.reason || 'Accidentally died';
    this.disconnect();
  }

  onServerMessage(data: any) {
    this.payloadsQueue.push(data);
  }

  resize() {
    this.gameMap.biomes.forEach(biome => biome.resize());
  }

  updatePing() {
    this.pingStart = Date.now();
    Socket.emit({ isPing: true });
  }

  processServerMessage(data: any) {
    if (data.isPong) {
      this.ping = Date.now() - this.pingStart;
    }
    if (data.tps) {
      this.tps = data.tps;
    }

    if (data.fullSync) {
      this.entities = {};
      this.self.id = data.selfId;
      this.game.fadeInScene();
    }

    for (let stringId in data.entities) {
      const id = Number(stringId);

      const entityData = data.entities[id];
      if (!this.entities[id]) {
        this.entities[id] = this.addEntity(id, entityData);
      }

      if (entityData.removed) {
        if (id === this.self.id) {
          this.disconnectReason = entityData.disconnectReason;
          this.disconnect();
        }
        this.removeEntity(id, entityData);
      } else {
        this.entities[id].updateState(entityData);
      }
    }
    for (let stringId in data.globalEntities) {
      const id = Number(stringId);

      const entityData = data.globalEntities[id];
      if (!this.globalEntities[id]) {
        const globalEntity = new GlobalEntity(this.game);
        globalEntity.updateState(entityData);
        this.globalEntities[id] = globalEntity;
      }
      if (entityData.removed) {
        delete this.globalEntities[id];
      } else {
        this.globalEntities[id].updateState(entityData);
      }
    }

    if (data.fullSync) {
      const selfEntity = this.entities[this.self.id];
      this.self.entity = selfEntity;
      this.gameMap.updateMapData(data.mapData);
      this.game.follow(selfEntity.container);
    }
  }

  tick() {
    this.updateLeaderboard();
    this.sendInputs();
  }

  updateGraphics(time: number, delta: number) {
    if (this.payloadsQueue.length !== 0) {
      this.payloadsQueue.forEach(msg => this.processServerMessage(msg));
      this.payloadsQueue = [];
    }

    for (const entity of this.removedEntities) {
      entity.update(delta, time);
    }
    for (const entity of Object.values(this.entities)) {
      entity.update(delta, time);
    }
    this.gameMap.update();
  }

  updateLeaderboard() {
    const now = Date.now();
    if (now - this.lastLeaderboardUpdate > this.leaderboardUpdateInterval) {
      const players = this.getPlayers();
      this.game.game.events.emit('playersUpdate', players, this.self.id);
      this.lastLeaderboardUpdate = now;
    }
  }

  sendInputs() {
    const inputs = this.inputs.difference(this.previousInputs);

    const data: any = {};
    if (Settings.movementMode === 'mouse' || this.game.isMobile) {
      data.mouse = {
        angle: this.mouse.angle,
        force: this.mouse.force,
      };
    } 
    if (inputs.length !== 0) {
      data.inputs = inputs;
      this.previousInputs.set(this.inputs.clone());
    }
    if (this.playerAngle !== this.previousPlayerAngle) {
      data.angle = this.playerAngle;
      this.previousPlayerAngle = this.playerAngle;
    }
    if (!this.selectedEvolution !== null) {
      data.selectedEvolution = this.selectedEvolution;
      this.selectedEvolution = null;
    }
    if (this.selectedBuff) {
      data.selectedBuff = this.selectedBuff;
      this.selectedBuff = null;
    }
    if (this.chatMessage) {
      data.chatMessage = this.chatMessage;
      this.chatMessage = null;
    }
    if (Object.keys(data).length !== 0) {
      Socket.emit(data);
    }
  }

  addEntity(id: number, data: any) {
    let EntityClass;
    switch (data.type) {
      case EntityTypes.Player: EntityClass = Player; break;
      case EntityTypes.Coin: EntityClass = Coin; break;
      case EntityTypes.House1: EntityClass = House1; break;
      case EntityTypes.MossyRock: EntityClass = MossyRock; break;
      case EntityTypes.Rock: EntityClass = Rock; break;
      case EntityTypes.LavaRock: EntityClass = LavaRock; break;
      case EntityTypes.Chest: EntityClass = Chest; break;
      case EntityTypes.Sword: EntityClass = Sword; break;
      case EntityTypes.Wolf: EntityClass = WolfMob; break;
      case EntityTypes.Bunny: EntityClass = BunnyMob; break;
      case EntityTypes.Moose: EntityClass = MooseMob; break;
      case EntityTypes.Chimera: EntityClass = ChimeraMob; break;
      case EntityTypes.Yeti: EntityClass = YetiMob; break;
      case EntityTypes.Fireball: EntityClass = Fireball; break;
      case EntityTypes.Roku: EntityClass = RokuMob; break;
    }
    if (!EntityClass) return console.log('Unknown entity type: ', data);

    const entity = new EntityClass(this.game);
    entity.updateState(data);
    entity.createSprite();
    entity.setDepth();
    return entity;
  }

  removeEntity(id: number, data: any) {
    const entity = this.entities[id];
    if (!entity) return;
    
    delete this.entities[id];

    if (entity.type === EntityTypes.Coin) {
      entity.removed = true;
      entity.hunter = this.entities[data.hunterId];
      this.removedEntities.add(entity);
    } else {
      entity.remove();
    }
  }

  getPlayers() {
    return Object.values(this.globalEntities).filter((e: any) => e.type === EntityTypes.Player);
  }

  collectResults() {
    const results = {
      name: '',
      coins: 0,
      kills: 0,
      survivalTime: 0,
      disconnectReason: this.disconnectReason,
    };
    const player = this.self.entity;
    if (player) {
      results.name = player.name;
      results.coins = player.coins;
      results.kills = player.kills;
      results.survivalTime = player.survivalTime;
    }
    return results;
  }

  disconnect() {
    const results = this.collectResults();
    this.game.game.events.emit('gameEnded', results);
  }

  restart() {
    Socket.close();
    clearInterval(this.interval);
    this.game.game.destroy(true);
  }
}

export default GameState;
