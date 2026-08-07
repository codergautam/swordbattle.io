import Game from './scenes/Game';
import Socket from './network/Socket';
import { EntityTypes } from './Types';
import { movers } from './effects/TreeShake';
import { Settings } from './Settings';
import GameMap from './GameMap';
import Player from './entities/Player';
import GlobalEntity from './entities/GlobalEntity';
import { BaseEntity } from './entities/BaseEntity';
import { GetEntityClass } from './entities';
import { Spectator } from './Spectator';
import { getServer } from '../ServerList';
import { config } from '../config';
import exportCaptcha from './components/captchaEncoder';
import { findCoinCollector } from '../helpers';
import { crazygamesSDK } from '../crazygames/sdk';
import * as cosmetics from './cosmetics.json';
import { perfMark, perfEnabled, perfWsProcess, perfEntityAdd } from './debug/perfStats';
const { skins } = cosmetics as any;

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
  private _pendingMessages: any[] = [];
  disconnectReason = {
    code: 0,
    reason: '',
  }
  name = '';
  tps = 0;
  realPlayersCnt = 0;
  ping = 0;
  pingStart = 0;
  debugMode = false;

  selectedEvolution: string | null = null;
  selectedUpgrade: number | null = null;
  openUpgradeSelect: boolean = false;
  closeUpgradeSelect: boolean = false;
  selectedBuff: any;
  selectedCard: number | null = null;
  majorOfferPositions: Record<number, number> = {};
  openCardSelect: boolean = false;
  closeCardSelect: boolean = false;
  rerollCard: boolean = false;
  skipMajorCard: boolean = false;
  tutorialComplete: boolean = false;
  tutorialPanel: number | null = null;
  chatMessage: string | null = null;
  chestBarActive = false;
  chestBarZone = 0;
  chestCombo = 1;
  lastSentChestZone = -1;
  frameLerpRate = 0.5;
  frameRotLerpRate = 0.2;
  interpolationEnabled = false;
  readonly interpDelay = 100;
  snapClock = 0;
  snapClockInit = false;
  renderClock = 0;
  renderClockInit = false;
  moverList: any[] = [];
  private _playersCache: any[] | null = null;
  captchaVerified = false;
  failedSkinLoads: Record<number, boolean> = {};
  recentDeadPlayers: Record<number, { name: string, time: number }> = {};
  chainDamagedTimestamps: Record<number, number> = {};
  private _chainTimestampPruneAccum: number = 0;

  private skinSweepAccum: number = 0;
  private skinIdleSince: Record<string, number> = {};
  static skinCap = 60;
  private static readonly skinIdleMs = 25000;

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
    }

    let isFirstLife = false;
    try {
      if (!localStorage.getItem('swordbattle:hasPlayed')) {
        isFirstLife = true;
        localStorage.setItem('swordbattle:hasPlayed', '1');
      }
      if (!localStorage.getItem('swordbattle:tutorialComplete')) {
        isFirstLife = true;
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
    this._pendingMessages = [];

    // Disable CrazyGames invite button when game ends
    crazygamesSDK.setInviteMode('disabled');

    if (event.code === 4503) {
      window.alert('Swordbattle.io is currently under maintenance to test the next update. Check back later to see the new stuff!');
      return;
    }

    if (event.code === 4429) {
      window.alert('ERROR: Max number of connections reached. Use an open tab or close some older tabs to keep playing.');
      return;
    }

    let reason = event.reason || 'Connection failed';
    if(endpoint) {
      reason += ` (${String(endpoint).split('?')[0]})`;
    }
    this.game.game.events.emit('connectionClosed', reason);
    console.log('connection closed');
  }

  private detachSnapshot(data: any): any {
    if (!data) return data;
    try {
      return (typeof structuredClone === 'function') ? structuredClone(data) : JSON.parse(JSON.stringify(data));
    } catch (e) {
      try { return JSON.parse(JSON.stringify(data)); } catch (e2) { return data; }
    }
  }

  onServerMessage(data: any) {
    if (!this.game.isReady) {
      this.payloadsQueue.push(this.detachSnapshot(data));
    } else {
      if (this.payloadsQueue.length !== 0) {
        this.payloadsQueue.forEach(msg => this.processServerMessage(msg));
        if(this.debugMode) alert("Clearing payload queue of "+this.payloadsQueue.length);
        this.payloadsQueue = [];
      }
      if (this._returningFromHidden) {
        this._pendingMessages.push(this.detachSnapshot(data));
        return;
      }
      const __t = perfEnabled() ? performance.now() : 0;
      this.processServerMessage(data);
      if (__t) {
        const dt = performance.now() - __t;
        perfWsProcess(dt);
        if (dt > 30) console.warn(`[perfStats] 🧊 processServerMessage ${dt.toFixed(0)}ms${data.fullSync ? ' (FULL-SYNC rebuild of all entities)' : ''} — snapshot handling stalled the main thread`);
      }
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
    if (typeof data.realPlayersCnt === 'number') {
      this.realPlayersCnt = data.realPlayersCnt;
    }

    if (this.interpolationEnabled && (data.entities || data.globalEntities || data.fullSync)) {
      if (!this.snapClockInit) {
        this.snapClock = 0;
        this.snapClockInit = true;
      } else {
        this.snapClock += 1000 / (this.tps || 20);
      }
    }

    if (data.fullSync) {
      const next = data.entities || {};
      for (const id in this.entities) {
        const nd = next[id];
        if (!nd || nd.removed || nd.type !== this.entities[id].type) {
          this.entities[id].remove();
          delete this.entities[id];
        }
      }
      for (const entity of this.removedEntities) {
        entity.remove();
      }
      this.removedEntities.clear();
      this.chainDamagedTimestamps = {};
      this.failedSkinLoads = {};
      this.recentDeadPlayers = {};
      this.self.id = data.selfId;
      this._playersCache = null;
    }

    for (let stringId in data.entities) {
      const id = Number(stringId);

      const entityData = data.entities[id];

      const globalEnt = this.globalEntities[id];
      if (globalEnt && globalEnt.gameWorldEntity) {
        if (!entityData.removed) {
          globalEnt.gameWorldEntity.updateState(entityData);
        }
        if (this.entities[id]) {
          if (this.entities[id].type === EntityTypes.Player) this._playersCache = null;
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
          this.self.id = -1;
          this.showGameResults();
          try { this.game.hud.tutorialOverlay.onDeath(); } catch (e) {}
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

    if (data.mapData) {
      this.gameMap.updateMapData(this.detachSnapshot(data.mapData));
    }
    if (data.spectator) {
      if (!this.spectator.active) {
        this.spectator.enable();
      }
      this.spectator.follow(data.spectator);
    }

    if (data.fullSync) {
      const selfEntity = this.entities[this.self.id];
      this.self.entity = selfEntity;
      if (selfEntity) {
        this.game.follow(selfEntity);
      }

      if (this.isReady) {
        try { this.game.hud.tutorialOverlay.onRespawn(); } catch (e) {}
      }

      if (!this.isReady) {
        console.log('game ready', Date.now());
        if(this.debugMode) alert("Game ready-- fullsync");

        this.isReady = true;
        this.game.game.events.emit('gameReady');

        try {
          const typeCounts: Record<string, number> = {};
          for (const id in this.entities) {
            const t = String(this.entities[id]?.type);
            typeCounts[t] = (typeCounts[t] || 0) + 1;
          }
          console.log(`[dupe] live gameState.entities = ${Object.keys(this.entities).length} by type:`, typeCounts,
            `| gameMap.staticObjects = ${this.gameMap.staticObjects.length}`);
        } catch (e) {}

        const tutorialEnabled = false;
        const serverSaysTutorial = tutorialEnabled && selfEntity && (selfEntity as any).isTutorial;
        let isFirstEverPlay = false;
        try { isFirstEverPlay = tutorialEnabled && !localStorage.getItem('swordbattle:tutorialComplete'); } catch (e) {}
        let justStartedFirstLife = false;
        try { justStartedFirstLife = tutorialEnabled && !localStorage.getItem('swordbattle:tutorialComplete') && !!localStorage.getItem('swordbattle:hasPlayed'); } catch (e) {}

        if (serverSaysTutorial || (isFirstEverPlay && justStartedFirstLife)) {
          try {
            console.log('[Tutorial] Starting tutorial overlay. serverFlag:', serverSaysTutorial, 'firstEver:', isFirstEverPlay);
            this.game.hud.tutorialOverlay.start();
          } catch (e) {
            console.error('[Tutorial] Failed to start:', e);
          }
        }
      }
    }
  }

  updateTick(dt: number) {
    this.tickAccumulator += dt;
    if (this.tickAccumulator > 150) {
      this.tickAccumulator = 150;
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

  flushCombatInputs() {
    if (!this.self.entity) return;
    this.sendInputs();
  }

  onTabReturn() {
    this._returningFromHidden = true;
    this.tickAccumulator = 0;
  }

  private cullContainer(entity: any, vx: number, vy: number, vxMax: number, vyMax: number) {
    const c = entity && entity.container;
    if (!c || c.__ownVisibility || c.__noCull) return;
    const body = entity.body;
    const bodyW = (body && body.displayWidth) || 0;
    if (entity.cullPadX === undefined || entity.cullBodyW !== bodyW || entity.cullSize !== entity.size) {
      let halfW = 0;
      let halfH = 0;
      const shape = entity.shape;
      if (shape) {
        if (shape.radius) { halfW = shape.radius; halfH = shape.radius; }
        if (shape.polygonBounds) {
          const pb = shape.polygonBounds;
          if (pb.width / 2 > halfW) halfW = pb.width / 2;
          if (pb.height / 2 > halfH) halfH = pb.height / 2;
        }
      }
      if (typeof entity.size === 'number') {
        if (entity.size > halfW) halfW = entity.size;
        if (entity.size > halfH) halfH = entity.size;
      }
      if (bodyW) {
        const shadowMargin = 1.3;
        entity.cullPadX = Math.max(500, halfW * 2, (bodyW / 2) * shadowMargin);
        entity.cullPadY = Math.max(500, halfH * 2, (body.displayHeight / 2) * shadowMargin);
      } else {
        entity.cullPadX = Math.max(500, halfW * 2);
        entity.cullPadY = Math.max(500, halfH * 2);
      }
      entity.cullBodyW = bodyW;
      entity.cullSize = entity.size;
    }
    const padX = entity.cullPadX;
    const padY = entity.cullPadY;
    const inView = (c.x + padX) > vx && (c.x - padX) < vxMax
                && (c.y + padY) > vy && (c.y - padY) < vyMax;
    if (inView !== c.visible) c.visible = inView;
  }

  updateGraphics(dt: number) {
    if (this._returningFromHidden) {
      this._returningFromHidden = false;
      if (this._pendingMessages.length) {
        for (const msg of this._pendingMessages) this.processServerMessage(msg);
        this._pendingMessages = [];
      }
      for (const id in this.entities) {
        const entity = this.entities[id];
        if (entity.container && entity.shape) {
          entity.container.x = entity.shape.x;
          entity.container.y = entity.shape.y;
          if (entity.posBuffer) entity.posBuffer.length = 0;
        }
        (entity as any).healthBar?.resyncAfterHidden?.();
      }
      BaseEntity.drainDestroys(Infinity);
    }

    const tps = this.tps || 20;
    this.frameLerpRate = 1 - Math.exp(-(dt || 16) / (1000 / tps));
    this.frameRotLerpRate = 1 - Math.exp(-(dt || 16) / (10000 / tps));

    this.interpolationEnabled = Settings.interpolation === true;
    if (this.interpolationEnabled && this.snapClockInit) {
      if (!this.renderClockInit) {
        this.renderClock = this.snapClock - this.interpDelay;
        this.renderClockInit = true;
      } else {
        this.renderClock += (dt || 16);
        this.renderClock += ((this.snapClock - this.interpDelay) - this.renderClock) * 0.1;
      }
    } else {
      this.renderClockInit = false;
    }

    let pt = perfMark();
    const entityList = Object.values(this.entities) as any[];
    const n = entityList.length;

    this.moverList.length = 0;
    for (let i = 0; i < n; i++) {
      const e = entityList[i];
      if (e && movers.has(e.type)) this.moverList.push(e);
    }
    pt = perfMark('moverList', pt);

    for (const entity of this.removedEntities) {
      entity.update(dt);
    }
    BaseEntity.drainDestroys(Math.max(3, Math.ceil(BaseEntity.destroyQueue.length / 60)));
    pt = perfMark('removedUpd', pt);
    for (let i = 0; i < n; i++) entityList[i].update(dt);
    pt = perfMark('entitiesUpd', pt);
    const globalList = Object.values(this.globalEntities) as any[];
    for (let i = 0; i < globalList.length; i++) globalList[i].update(dt);
    pt = perfMark('globalUpd', pt);
    this.gameMap.update();
    pt = perfMark('gameMapUpd', pt);
    this.spectator.update(dt);
    pt = perfMark('spectator', pt);

    const camera = this.game.cameras.main;
    const view = camera.worldView;
    if (view.width > 0 && view.height > 0) {
      const boost = this.spectator.active ? Math.max(view.width, view.height) * 1.5 : 0;
      const vx = view.x - boost;
      const vy = view.y - boost;
      const vxMax = view.x + view.width + boost;
      const vyMax = view.y + view.height + boost;
      for (let i = 0; i < n; i++) {
        this.cullContainer(entityList[i], vx, vy, vxMax, vyMax);
      }
    }
    pt = perfMark('cullLoop', pt);

    this._chainTimestampPruneAccum += dt;
    if (this._chainTimestampPruneAccum > 5000) {
      this._chainTimestampPruneAccum = 0;
      const cutoff = Date.now() - 2000;
      const cache = this.chainDamagedTimestamps;
      for (const id in cache) {
        if (cache[id] < cutoff) delete cache[id];
      }
    }

    this.skinSweepAccum += dt;
    if (this.skinSweepAccum > 5000) {
      this.skinSweepAccum = 0;
      try { this.sweepSkinTextures(); } catch (e) {}
    }
  }

  private sweepSkinTextures() {
    const textures = this.game.textures;
    const defaultName = skins?.player?.name;

    const resident: string[] = [];
    for (const key in skins) {
      const name = skins[key]?.name;
      if (!name || name === defaultName) continue;
      if (textures.exists(name + 'Body') || textures.exists(name + 'Sword')) resident.push(name);
    }
    if (resident.length <= GameState.skinCap) {
      this.skinIdleSince = {};
      return;
    }

    const inUse = new Set<string>();
    const collect = (obj: any) => {
      if (!obj) return;
      const k = obj.texture && obj.texture.key;
      if (k) inUse.add(k);
      const list = obj.list;
      if (list) for (let i = 0; i < list.length; i++) collect(list[i]);
    };
    for (const id in this.entities) collect(this.entities[id]?.container);
    for (const id in this.globalEntities) collect((this.globalEntities[id] as any)?.gameWorldEntity?.container);
    collect(this.self.entity?.container);

    const now = Date.now();
    const idleSince = this.skinIdleSince;
    const evictable: { name: string, since: number }[] = [];
    for (const name of resident) {
      const used = inUse.has(name + 'Body') || inUse.has(name + 'Sword') ||
                   inUse.has(name + 'Body_shadow') || inUse.has(name + 'Sword_shadow');
      if (used) { delete idleSince[name]; continue; }
      if (!idleSince[name]) idleSince[name] = now;
      if (now - idleSince[name] >= GameState.skinIdleMs) evictable.push({ name, since: idleSince[name] });
    }

    evictable.sort((a, b) => a.since - b.since);
    let count = resident.length;
    for (const { name } of evictable) {
      if (count <= GameState.skinCap) break;
      for (const key of [name + 'Body', name + 'Sword', name + 'Body_shadow', name + 'Sword_shadow']) {
        if (textures.exists(key)) textures.remove(key);
      }
      delete idleSince[name];
      count--;
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
    if (this.selectedUpgrade !== null) {
      data.selectedUpgrade = this.selectedUpgrade;
      this.selectedUpgrade = null;
    }
    if (this.openUpgradeSelect) {
      data.openUpgradeSelect = true;
      this.openUpgradeSelect = false;
    }
    if (this.closeUpgradeSelect) {
      data.closeUpgradeSelect = true;
      this.closeUpgradeSelect = false;
    }
    if (this.selectedBuff) {
      data.selectedBuff = this.selectedBuff;
      this.selectedBuff = null;
    }
    if (this.selectedCard) {
      data.selectedCard = this.selectedCard;
      this.selectedCard = null;
    }
    if (this.openCardSelect) {
      data.openCardSelect = true;
      this.openCardSelect = false;
    }
    if (this.closeCardSelect) {
      data.closeCardSelect = true;
      this.closeCardSelect = false;
    }
    if (this.rerollCard) {
      data.rerollCard = true;
      this.rerollCard = false;
    }
    if (this.skipMajorCard) {
      data.skipMajorCard = true;
      this.skipMajorCard = false;
    }
    if (this.tutorialComplete) {
      data.tutorialComplete = true;
      this.tutorialComplete = false;
    }
    if (this.tutorialPanel !== null) {
      data.tutorialPanel = this.tutorialPanel;
      this.tutorialPanel = null;
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
      perfEntityAdd();
      if (entity.type === EntityTypes.Player) this._playersCache = null;
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
    if (entity.type === EntityTypes.Player) this._playersCache = null;

    if (entity.type === EntityTypes.Coin) {
      entity.removed = true;
      if (!this._playersCache) {
        const cache: any[] = [];
        for (const eid in this.entities) {
          const e = this.entities[eid];
          if (e.type === EntityTypes.Player) cache.push(e);
        }
        this._playersCache = cache;
      }
      entity.hunter = findCoinCollector(entity, this._playersCache);
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
      if (this.entities[id].type === EntityTypes.Player) this._playersCache = null;
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
    const results: any = {
      name: '',
      coins: 0,
      kills: 0,
      tokens: 0,
      survivalTime: 0,
      disconnectReason: this.disconnectReason,
      insuranceRespawnCoins: 0,
    };
    const player = this.self.entity;
    if (player) {
      results.name = player.name;
      results.coins = player.coins;
      results.kills = player.kills;
      results.survivalTime = player.survivalTime;
      results.tokens = player.tokens;
      const chosenCards: number[] = (player as any).chosenCards || [];
      const hasInsurance = chosenCards.includes(130);
      if (hasInsurance) {
        results.insuranceRespawnCoins = Math.round(player.coins * 0.40);
      }
    }

    this.game.game.events.emit('setGameResults', results);
  }
}

export default GameState;
