import Inputs from './Inputs';
import { Settings } from './Settings';
import { EntityTypes } from './Types';
import Coin from './entities/Coin';
import House1 from './entities/House1';
import Player from './entities/Player';
import Socket from './network/Socket';
import Game from './scenes/Game';

class GameState {
  game: Game;
  socket: WebSocket;
  entities: Record<number, any> = {};
  removedEntities: Set<any> = new Set();
  self: {
    id: number,
    entity: Player | null,
  };
  inputs: Inputs = new Inputs();
  previousInputs: Inputs = new Inputs();
  lastLeaderboardUpdate: number = 0;
  leaderboardUpdateInterval: number = 1000;
  playerAngle: number = 0;
  previousPlayerAngle: number = 0;
  mouse: any = { angle: 0, force: 0 };
  payloadsQueue: any[] = [];
  disconnectReason: string = 'Server';
  tps = 0;
  ping = 0;
  pingStart = 0;
  interval: any;
  freeze: boolean = false;

  constructor(game: Game) {
    this.game = game;
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
    this.game.events.on('pauseGame', this.pause, this);
    this.game.events.on('resumeGame', this.resume, this);
    this.game.events.on('evolve', this.evolve, this);
    this.game.game.events.on('restartGame', this.restart, this);
    this.interval = setInterval(() => this.tick(), 1000 / 30);
  }

  start(name: string) {
    Socket.emit({ name });
  }

  pause() {
    this.inputs.clear();
    this.previousInputs.clear();
    this.freeze = true;
  }

  resume() {
    this.freeze = false;
  }

  onServerOpen() {
    console.log('server connected');
  }

  onServerClose(event: CloseEvent) {
    this.disconnectReason = event.reason || 'God';
    this.disconnect();
  }

  onServerMessage(data: any) {
    this.payloadsQueue.push(data);
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

    if (data.fullSync) {
      const selfEntity = this.entities[this.self.id];
      this.self.entity = selfEntity;
      this.game.updateMap(data.mapData);
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
    if (this.freeze) {
      const data = { freeze: true };
      Socket.emit(data);
      return;
    }
    
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
    if (Object.keys(data).length !== 0) {
      Socket.emit(data);
    }
  }

  evolve(name: string) {
    const data: any = { evolution: name };
    Socket.emit(data);
  }

  addEntity(id: number, data: any) {
    let EntityClass;
    switch (data.type) {
      case EntityTypes.Player: EntityClass = Player; break;
      case EntityTypes.Coin: EntityClass = Coin; break;
      case EntityTypes.House1: EntityClass = House1; break;
    }
    if (!EntityClass) return console.log('Unknown entity type: ', data.type);

    const entity = new EntityClass(this.game);
    entity.updateState(data);
    entity.createSprite();
    return entity;
  }

  removeEntity(id: number, data: any) {
    const entity = this.entities[id];
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
    return Object.values(this.entities).filter((e: any) => e.type === EntityTypes.Player);
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
      results.coins = player.coinBalance;
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
