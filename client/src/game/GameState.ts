import Game from './scenes/Game';
import Socket from './network/Socket';
import { EntityTypes } from './Types';
import { Settings } from './Settings';
import GameMap from './GameMap';
import Player from './entities/Player';
import GlobalEntity from './entities/GlobalEntity';
import { GetEntityClass } from './entities';
import { Spectator } from './Spectator';
import { getServer } from '../ServerList';
import { config } from '../config';
import exportCaptcha from './components/captchaEncoder';
import { findCoinCollector } from '../helpers';

class GameState {
  game: Game;
  socket!: WebSocket;
  interval: any;
  entities: Record<number, any> = {};
  globalEntities: Record<number, GlobalEntity> = {};
  removedEntities: Set<any> = new Set();
  gameMap: GameMap;
  spectator: Spectator;
  self: { id: number, entity?: Player } = { id: -1 };
  lastLeaderboardUpdate: number = 0;
  leaderboardUpdateInterval: number = 1000;
  playerAngle: number = 0;
  previousPlayerAngle: number = 0;
  payloadsQueue: any[] = [];
  isReady = false;
  disconnectReason = {
    code: 0,
    reason: '',
  }
  name = '';
  tps = 0;
  ping = 0;
  pingStart = 0;
  debugMode = false;

  selectedEvolution: string | null = null;
  selectedBuff: any;
  chatMessage: string | null = null;
  captchaVerified = false;
  failedSkinLoads: Record<number, boolean> = {};
  recentDeadPlayers: Record<number, { name: string, time: number }> = {};

  constructor(game: Game) {
    this.game = game;
    this.gameMap = new GameMap(this.game);
    this.spectator = new Spectator(this.game);
    this.refreshSocket();
    this.captchaVerified = false;

    this.debugMode = false;
    try {
    this.debugMode = window.location.search.includes("debugAlertMode");
      if(this.debugMode) {
        alert("Debug alert mode activated");
      }
    } catch(e) {}

  }

  refreshSocket(unbind = false) {
    // unbind
    if(unbind) {
    this.socket.removeEventListener('open', this.onServerOpen.bind(this));
    this.socket.removeEventListener('message', this.onServerMessage.bind(this));
    this.socket.removeEventListener('close', this.onServerClose.bind(this));

    this.gameMap = new GameMap(this.game);
    this.spectator = new Spectator(this.game);
    }
    // rebind
    console.time("getServer");
    getServer().then(server => {
      console.timeEnd("getServer");
      if(this.debugMode) {
        alert("Sending ws connection to "+server.address+" name "+server.name);
      }
      console.log('connecting to', server.address, Date.now());
      this.socket = Socket.connect(
        server.address,
        this.onServerOpen.bind(this),
        this.onServerMessage.bind(this),
        this.onServerClose.bind(this),
      );
    })
  }

  initialize() {
    this.game.game.events.on('startGame', this.start, this);
    this.game.game.events.on('restartGame', this.restart, this);
    this.game.game.events.on('startSpectate', this.spectate, this);
    this.game.game.events.on('tokenUpdate', this.updateToken, this);
    this.interval = setInterval(() => this.tick(), 1000 / 20);
  }

  start(name: string) {

    const afterSent = () => {
    if(!this.game.hud.buffsSelect.minimized) this.game.hud.buffsSelect.toggleMinimize();
    }
    Socket.emit({ play: true, name });
    afterSent();
  }

  restart() {
    Socket.emit({ play: true });
    if(!this.game.hud.buffsSelect.minimized) this.game.hud.buffsSelect.toggleMinimize();
    if(!this.game.hud.evolutionSelect.minimized) this.game.hud.evolutionSelect.toggleMinimize();
  }

  spectate() {
    if(config.recaptchaClientKey && !this.captchaVerified) {
    if(this.debugMode) alert("Attempting recaptcha");
      const waitForRecaptcha = () => {
        if ((window as any).recaptcha) {
            // reCAPTCHA is available, execute your code
            if(this.debugMode) alert("Recaptcha available, executing");
            (window as any).recaptcha.execute(config.recaptchaClientKey, { action: 'spectate' }).then((captcha: any) => {
                if (this.debugMode) alert("Received captcha of length " + captcha.length + ", sending spectate");
                this.captchaVerified = true;
                Socket.emit({ spectate: true, ...exportCaptcha(captcha) });
            });
        } else {
            // reCAPTCHA is not available, check again after 100ms
            if(this.debugMode) alert("Recaptcha not available, waiting 100ms");
            setTimeout(waitForRecaptcha, 100);
        }
    }

    // Start the process
    waitForRecaptcha();

    } else {
      if(this.debugMode) alert("Sending spectate w/o recaptcha");
    Socket.emit({ spectate: true });
    }
  }

  updateToken(token: string) {
    Socket.emit({ token });
  }

  onServerOpen() {
    this.spectate();
    console.log('server connected', Date.now());
  }

  onServerClose(event: CloseEvent, endpoint?: string) {
    Socket.close();
    clearInterval(this.interval);

    let reason = event.reason || 'Connection failed';
    if(endpoint) {
      reason += ` (${endpoint})`;
    }
    this.game.game.events.emit('connectionClosed', reason);
    console.log('connection closed');
  }

  onServerMessage(data: any) {
    if (!this.game.isReady) {
      this.payloadsQueue.push(data);
    } else {
      if (this.payloadsQueue.length !== 0) {
        this.payloadsQueue.forEach(msg => this.processServerMessage(msg));
        if(this.debugMode) alert("Clearing payload queue of "+this.payloadsQueue.length);
        this.payloadsQueue = [];
      }
      this.processServerMessage(data);
    }
  }

  resize() {
    this.gameMap.biomes.forEach(biome => biome.resize());
  }

  processServerMessage(data: any) {
    if (data.isPong) {
      this.ping = Date.now() - this.pingStart;
    }
    if (data.tps) {
      this.tps = data.tps;
    }

    if (data.fullSync) {
      Object.values(this.entities).forEach(entity => entity.remove());
      this.entities = {};
      this.self.id = data.selfId;
    }

    for (let stringId in data.entities) {
      const id = Number(stringId);

      const entityData = data.entities[id];
      if (!this.entities[id] && !entityData.removed) {
        this.addEntity(id, entityData);
      }

      if (entityData.removed) {
        if (id === this.self.id) {
          if(typeof entityData.disconnectReasonType !== "undefined") {
          this.disconnectReason = {
            reason: entityData.disconnectReasonMessage,
            code: entityData.disconnectReasonType,
          }
        }
          this.showGameResults();
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
        this.addGlobalEntity(id, entityData);
      }
      if (entityData.removed) {
        this.removeGlobalEntity(id);
      } else {
        this.globalEntities[id].updateState(entityData);
      }
    }

    if (data.spectator) {
      if (!this.spectator.active) {
        this.spectator.enable();
      }
      this.spectator.follow(data.spectator);
    }
    if (data.mapData) {
      this.gameMap.updateMapData(data.mapData);
    }

    if (data.fullSync) {
      const selfEntity = this.entities[this.self.id];
      this.self.entity = selfEntity;
      if (selfEntity) {
        this.game.follow(selfEntity);
      }

      if (!this.isReady) {
        console.log('game ready', Date.now());
        if(this.debugMode) alert("Game ready-- fullsync");

        this.isReady = true;
        this.game.game.events.emit('gameReady');
      }
    }
  }

  tick() {
    if (!this.self.entity) return;
    this.updateLeaderboard();
    this.sendInputs();
  }

  updateGraphics(dt: number) {
    for (const entity of this.removedEntities) {
      entity.update(dt);
    }
    for (const entity of Object.values(this.entities)) {
      entity.update(dt);
    }
    for (const entity of Object.values(this.globalEntities)) {
      entity.update(dt);
    }
    this.gameMap.update();
    this.spectator.update(dt);
  }

  updateLeaderboard() {
    const now = Date.now();
    if (now - this.lastLeaderboardUpdate > this.leaderboardUpdateInterval) {
      const players = this.getPlayers();
      this.game.game.events.emit('playersUpdate', players, this.self.id);
      this.lastLeaderboardUpdate = now;
    }
  }

  updatePing() {
    this.pingStart = Date.now();
    Socket.emit({ isPing: true });
  }

  sendInputs() {
    if(!this.self.entity?.following) return;
    const inputs = this.game.controls.getChanges();

    const data: any = {};
    if (Settings.movementMode === 'mouse' || this.game.isMobile) {
      data.mouse = this.game.controls.mouse;
    }
    if (inputs.length !== 0) {
      data.inputs = inputs;
    }
    if (this.playerAngle !== this.previousPlayerAngle) {
      data.angle = this.playerAngle;
      this.previousPlayerAngle = this.playerAngle;
    }
    if (this.selectedEvolution !== null) {
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
    const EntityClass = GetEntityClass(data.type);
    const entity = new EntityClass(this.game);
    entity.updateState(data);
    entity.createSprite();
    entity.setDepth();
    this.entities[id] = entity;
    return entity;
  }

  removeEntity(id: number, data: any) {
    const entity = this.entities[id];
    if (!entity) return;

    delete this.entities[id];

    if (entity.type === EntityTypes.Coin) {
      entity.removed = true;
      // entity.hunter = this.entities[data.hunterId];
      entity.hunter = findCoinCollector(entity, Object.values(this.entities).filter((e: any) => e.type === EntityTypes.Player));
      this.removedEntities.add(entity);
    } else {
      if(entity.type === EntityTypes.Player) {
        this.recentDeadPlayers[id] = { name: entity.name, time: Date.now() };
        if(Object.keys(this.recentDeadPlayers).length > 10) {
          // delete the oldest
          let oldestTime = Infinity;
          let oldestId = 0;
          for(const id in this.recentDeadPlayers) {
            if(this.recentDeadPlayers[id].time < oldestTime) {
              oldestTime = this.recentDeadPlayers[id].time;
              oldestId = Number(id);
            }
          }
          delete this.recentDeadPlayers[oldestId];
        }
      }
      entity.remove();
    }
  }

  addGlobalEntity(id: number, entityData: any) {
    const globalEntity = new GlobalEntity(this.game);
    globalEntity.updateState(entityData);
    this.globalEntities[id] = globalEntity;
    return globalEntity;
  }

  removeGlobalEntity(id: number) {
    const globalEntity = this.globalEntities[id];
    globalEntity.remove();
    delete this.globalEntities[id];
  }

  getPlayers() {
    return Object.values(this.globalEntities).filter((e: any) => e.type === EntityTypes.Player);
  }

  showGameResults() {
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

    this.game.game.events.emit('setGameResults', results);
  }
}

export default GameState;
