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
import { crazygamesSDK } from '../crazygames/sdk';

class GameState {
  game: Game;
  socket!: WebSocket;
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
  tickAccumulator = 0;
  private _returningFromHidden = false;
  private _pendingMessage: any = null;
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
  chainDamagedTimestamps: Record<number, number> = {};

  private _boundOnOpen: () => void;
  private _boundOnMessage: (data: any) => void;
  private _boundOnClose: (event: CloseEvent, endpoint?: string) => void;

  constructor(game: Game) {
    this.game = game;
    this.gameMap = new GameMap(this.game);
    this.spectator = new Spectator(this.game);

    this._boundOnOpen = this.onServerOpen.bind(this);
    this._boundOnMessage = this.onServerMessage.bind(this);
    this._boundOnClose = this.onServerClose.bind(this);

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
    this.socket.removeEventListener('open', this._boundOnOpen);
    this.socket.removeEventListener('message', this._boundOnMessage as any);
    this.socket.removeEventListener('close', this._boundOnClose as any);

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
        this._boundOnOpen,
        this._boundOnMessage,
        this._boundOnClose,
      );
    })
  }

  initialize() {
    this.game.game.events.on('startGame', this.start, this);
    this.game.game.events.on('restartGame', this.restart, this);
    this.game.game.events.on('startSpectate', this.spectate, this);
    this.game.game.events.on('tokenUpdate', this.updateToken, this);
  }

  start(name: string) {
    const afterSent = () => {
      if(!this.game.hud.buffsSelect.minimized) this.game.hud.buffsSelect.toggleMinimize();
    }

    let isFirstLife = false;
    try {
      if (!localStorage.getItem('swordbattle:hasPlayed')) {
        isFirstLife = true;
        localStorage.setItem('swordbattle:hasPlayed', '1');
      }
    } catch (_) {}

    console.log('[CAPTCHA] start() - recaptchaClientKey:', config.recaptchaClientKey);

    // Check if there's an invite roomId from CrazyGames invite link
    const inviteRoomId = (window as any).inviteRoomId;
    if (inviteRoomId) {
      console.log('[Invite] Using invite roomId:', inviteRoomId);
    }

    if(config.recaptchaClientKey) {
      console.log('[CAPTCHA] Waiting for reCAPTCHA to load...');
      const waitForRecaptcha = () => {
        if ((window as any).recaptcha) {
          console.log('[CAPTCHA] reCAPTCHA loaded, executing for action: play');
          (window as any).recaptcha.execute(config.recaptchaClientKey, { action: 'play' }).then((captcha: any) => {
            console.log('[CAPTCHA] Received captcha token, length:', captcha?.length);
            const captchaData = exportCaptcha(captcha);
            console.log('[CAPTCHA] Sending play request with captcha data:', Object.keys(captchaData));
            const playRequest: any = { play: true, name, ...captchaData };
            if (isFirstLife) playRequest.firstLife = true;
            if (inviteRoomId) {
              playRequest.roomId = inviteRoomId;
              console.log('[Invite] Added roomId to play request');
            }
            Socket.emit(playRequest);
            afterSent();
          }).catch((err: any) => {
            console.error('[CAPTCHA] Error executing captcha:', err);
          });
        } else {
          console.log('[CAPTCHA] reCAPTCHA not available yet, retrying in 100ms...');
          setTimeout(waitForRecaptcha, 100);
        }
      }
      waitForRecaptcha();
    } else {
      console.log('[CAPTCHA] Sending play request without captcha (disabled)');
      const playRequest: any = { play: true, name };
      if (isFirstLife) playRequest.firstLife = true;
      if (inviteRoomId) {
        playRequest.roomId = inviteRoomId;
        console.log('[Invite] Added roomId to play request');
      }
      Socket.emit(playRequest);
      afterSent();
    }
  }

  restart() {
    const afterSent = () => {
      if(!this.game.hud.buffsSelect.minimized) this.game.hud.buffsSelect.toggleMinimize();
      if(!this.game.hud.evolutionSelect.minimized) this.game.hud.evolutionSelect.toggleMinimize();
    }

    console.log('[CAPTCHA] restart() - recaptchaClientKey:', config.recaptchaClientKey);

    // Check if there's an invite roomId from CrazyGames invite link
    const inviteRoomId = (window as any).inviteRoomId;

    if(config.recaptchaClientKey) {
      console.log('[CAPTCHA] Waiting for reCAPTCHA to load...');
      const waitForRecaptcha = () => {
        if ((window as any).recaptcha) {
          console.log('[CAPTCHA] reCAPTCHA loaded, executing for action: play');
          (window as any).recaptcha.execute(config.recaptchaClientKey, { action: 'play' }).then((captcha: any) => {
            console.log('[CAPTCHA] Received captcha token, length:', captcha?.length);
            const captchaData = exportCaptcha(captcha);
            console.log('[CAPTCHA] Sending play request with captcha data:', Object.keys(captchaData));
            const playRequest: any = { play: true, ...captchaData };
            if (inviteRoomId) {
              playRequest.roomId = inviteRoomId;
              console.log('[Invite] Added roomId to restart request');
            }
            Socket.emit(playRequest);
            afterSent();
          }).catch((err: any) => {
            console.error('[CAPTCHA] Error executing captcha:', err);
          });
        } else {
          console.log('[CAPTCHA] reCAPTCHA not available yet, retrying in 100ms...');
          setTimeout(waitForRecaptcha, 100);
        }
      }
      waitForRecaptcha();
    } else {
      console.log('[CAPTCHA] Sending play request without captcha (disabled)');
      const playRequest: any = { play: true };
      if (inviteRoomId) {
        playRequest.roomId = inviteRoomId;
        console.log('[Invite] Added roomId to restart request');
      }
      Socket.emit(playRequest);
      afterSent();
    }
  }

  spectate() {
    console.log('[CAPTCHA] spectate() - recaptchaClientKey:', config.recaptchaClientKey, 'captchaVerified:', this.captchaVerified);

    if(config.recaptchaClientKey && !this.captchaVerified) {
      if(this.debugMode) alert("Attempting recaptcha");
      console.log('[CAPTCHA] Waiting for reCAPTCHA to load...');
      const waitForRecaptcha = () => {
        if ((window as any).recaptcha) {
            // reCAPTCHA is available, execute your code
            if(this.debugMode) alert("Recaptcha available, executing");
            console.log('[CAPTCHA] reCAPTCHA loaded, executing for action: spectate');
            (window as any).recaptcha.execute(config.recaptchaClientKey, { action: 'spectate' }).then((captcha: any) => {
                if (this.debugMode) alert("Received captcha of length " + captcha.length + ", sending spectate");
                console.log('[CAPTCHA] Received captcha token, length:', captcha?.length);
                this.captchaVerified = true;
                const captchaData = exportCaptcha(captcha);
                console.log('[CAPTCHA] Sending spectate request with captcha data:', Object.keys(captchaData));
                Socket.emit({ spectate: true, ...captchaData });
            }).catch((err: any) => {
                console.error('[CAPTCHA] Error executing captcha:', err);
            });
        } else {
            // reCAPTCHA is not available, check again after 100ms
            if(this.debugMode) alert("Recaptcha not available, waiting 100ms");
            console.log('[CAPTCHA] reCAPTCHA not available yet, retrying in 100ms...');
            setTimeout(waitForRecaptcha, 100);
        }
    }

    // Start the process
    waitForRecaptcha();

    } else {
      if(this.debugMode) alert("Sending spectate w/o recaptcha");
      console.log('[CAPTCHA] Sending spectate request without captcha (disabled or already verified)');
      Socket.emit({ spectate: true });
    }
  }

  updateToken(token: string) {
    Socket.emit({ token });
  }

  onServerOpen() {
    this.spectate();
    console.log('server connected', Date.now());

    // Enable CrazyGames invite button when game starts
    crazygamesSDK.setInviteMode('playing');
  }

  onServerClose(event: CloseEvent, endpoint?: string) {
    Socket.close();
    this.tickAccumulator = 0;

    // Clear accumulated tracking objects to prevent memory leaks.
    // Entity Phaser objects are NOT destroyed here — that's handled safely
    // by fullSync (on reconnect) or Phaser.Game.destroy (on navigate away).
    this.chainDamagedTimestamps = {};
    this.failedSkinLoads = {};
    this.recentDeadPlayers = {};
    this.payloadsQueue = [];

    // Disable CrazyGames invite button when game ends
    crazygamesSDK.setInviteMode('disabled');

    if (event.code === 4429) {
      window.alert('ERROR: Max number of connections reached. Use an open tab or close some older tabs to keep playing.');
      return;
    }

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
      if (this._returningFromHidden) {
        this._pendingMessage = data;
        return;
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
      for (const entity of this.removedEntities) {
        entity.remove();
      }
      this.removedEntities.clear();
      this.chainDamagedTimestamps = {};
      this.failedSkinLoads = {};
      this.recentDeadPlayers = {};
      this.self.id = data.selfId;
    }

    for (let stringId in data.entities) {
      const id = Number(stringId);

      const entityData = data.entities[id];

      const globalEnt = this.globalEntities[id];
      if (globalEnt && globalEnt.gameWorldEntity) {
        if (!entityData.removed && entityData.shapeData) {
          globalEnt.gameWorldEntity.updateState(entityData);
        }
        if (this.entities[id]) {
          this.entities[id].remove();
          delete this.entities[id];
        }
        continue;
      }

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
      } else if (this.entities[id]) {
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

  updateTick(dt: number) {
    this.tickAccumulator += dt;
    if (this.tickAccumulator > 200) {
      this.tickAccumulator = 50;
    }
    while (this.tickAccumulator >= 50) {
      this.tick();
      this.tickAccumulator -= 50;
    }
  }

  tick() {
    if (!this.self.entity) return;
    this.updateLeaderboard();
    this.sendInputs();
  }

  onTabReturn() {
    this._returningFromHidden = true;
  }

  updateGraphics(dt: number) {
    if (this._returningFromHidden) {
      this._returningFromHidden = false;
      if (this._pendingMessage) {
        this.processServerMessage(this._pendingMessage);
        this._pendingMessage = null;
      }
    }

    for (const entity of this.removedEntities) {
      entity.update(dt);
    }
    for (const id in this.entities) {
      this.entities[id].update(dt);
    }
    for (const id in this.globalEntities) {
      this.globalEntities[id].update(dt);
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
    if (data.type === undefined || data.type === null) return null;
    try {
      const EntityClass = GetEntityClass(data.type);
      const entity = new EntityClass(this.game);
      entity.updateState(data);
      if (!this.game.add) return null;
      entity.createSprite();
      entity.setDepth();
      this.entities[id] = entity;
      return entity;
    } catch (e) {
      console.warn('[GameState] Failed to create entity:', data.type, e);
      return null;
    }
  }

  removeEntity(id: number, data: any) {
    const entity = this.entities[id];
    if (!entity) return;

    delete this.entities[id];

    if (entity.type === EntityTypes.Coin) {
      entity.removed = true;
      // entity.hunter = this.entities[data.hunterId];
      const players: any[] = [];
      for (const eid in this.entities) {
        if (this.entities[eid].type === EntityTypes.Player) players.push(this.entities[eid]);
      }
      entity.hunter = findCoinCollector(entity, players);
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

    globalEntity.createGameWorldVisual();

    if (globalEntity.gameWorldEntity && this.entities[id]) {
      this.entities[id].remove();
      delete this.entities[id];
    }

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
      tokens: 0,
      survivalTime: 0,
      disconnectReason: this.disconnectReason,
    };
    const player = this.self.entity;
    if (player) {
      results.name = player.name;
      results.coins = player.coins;
      results.kills = player.kills;
      results.survivalTime = player.survivalTime;
      results.tokens = player.tokens;
    }

    this.game.game.events.emit('setGameResults', results);
  }
}

export default GameState;
