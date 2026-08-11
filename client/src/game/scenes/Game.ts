import Phaser from '../engine';
import GameState from '../GameState';
import SoundManager from '../SoundManager';
import HUD from '../hud/HUD';
import Safezone from '../biomes/Safezone';
import Biome from '../biomes/Biome';
import { BaseEntity } from '../entities/BaseEntity';
import settingsManager, { Settings } from '../Settings';
import { config } from '../../config';
import { Controls } from '../Controls';
import ScreenEffectsPipeline from '../effects/ScreenEffectsPipeline';
import { screenEffectsState, screenEffectsRuntime, onEffectsChange, updateEffects } from '../effects/screenEffectsState';
import { updateWind } from '../effects/Wind';
import { updateBiomeEffects, resetBiomeEffects } from '../effects/biomeEffects';
import { initPerfStats, tickPerfStats } from '../debug/perfStats';
import { initAblation } from '../debug/ablation';
import { reportIntegrityViolation } from '../integrity';
import { crazygamesSDK } from '../../crazygames/sdk';
import * as cosmetics from '../cosmetics.json';
const {skins} = cosmetics;

const publicPath = process.env.PUBLIC_URL as string;

export default class Game extends Phaser.Scene {
  gameState: GameState;
  soundManager: SoundManager;
  controls: Controls;
  hud: HUD;

  isReady = false;
  isMobile = false;
  zoom = 1;
  scaleZoom = 1;
  backgroundTile: Phaser.GameObjects.TileSprite | null = null;
  aimLine: Phaser.GameObjects.Graphics | null = null;
  private aimLineR = -1;

  static maxRenderDpr = 1.5;

  private _resizeHandler: (() => void) | null = null;
  private _orientationHandler: (() => void) | null = null;
  private _adStartHandler: (() => void) | null = null;
  private _adFinishHandler: (() => void) | null = null;
  private _visibilityHandler: (() => void) | null = null;
  private fpsLimitHandler: ((e: any) => void) | null = null;
  private screenEffectsHandler: ((e: any) => void) | null = null;
  private _contextLostHandler: ((e: Event) => void) | null = null;
  private _contextRestoredHandler: (() => void) | null = null;
  private _contextWasLost = false;
  _isZooming = false;
  private zoomMismatchFrames = 0;

	constructor() {
		super('game');
    this.gameState = new GameState(this);
    this.soundManager = new SoundManager(this);
    this.controls = new Controls(this);
    this.hud = new HUD(this);
	}

	init() {
    this.gameState.initialize();
    this.game.canvas.oncontextmenu = (e) => e.preventDefault();
    this.isMobile = this.game.device.os.android || this.game.device.os.iOS;
    
    if (this.isMobile) {
      try { (window.screen.orientation as any).lock('portrait-primary').catch(() => {}); } catch (e) {}
    }
  }

  preload() {
    // Signal that asset loading has started
    crazygamesSDK.loadingStart();

    this.load.image('realZombieBody', publicPath + '/assets/game/player/realZombiePlayer.png');
    this.load.image('realZombieSword', publicPath + '/assets/game/player/realZombieSword.png');
    this.load.image('nightlurkerBody', publicPath + '/assets/game/player/nightlurkerPlayer.png');
    this.load.image('nightlurkerSword', publicPath + '/assets/game/player/nightlurkerSword.png');
    this.load.image('bonedragonBody', publicPath + '/assets/game/player/bonedragonPlayer.png');
    this.load.image('bonedragonSword', publicPath + '/assets/game/player/bonedragonSword.png');
    this.load.image('valorCrest', publicPath + '/assets/game/valor-crest.svg');

    this.load.image('wrenchIcon', publicPath + '/assets/game/ui/wrench.png');
    this.load.image('closeIcon', publicPath + '/assets/game/ui/close.png');
    this.load.image('rockTile', publicPath + '/assets/game/tiles/rock.png');
    this.load.image('fireTile', publicPath + '/assets/game/tiles/fire.jpg');
    this.load.image('earthTile', publicPath + '/assets/game/tiles/grass.jpg');
    this.load.image('iceTile', publicPath + '/assets/game/tiles/ice-new.png');
    this.load.image('riverBottom', publicPath + '/assets/game/tiles/river-bottom.png');
    this.load.image('riverTop', publicPath + '/assets/game/tiles/river-top.png');
    this.load.image('safezone', publicPath + '/assets/game/tiles/spawn.png');
    this.load.image('sand', publicPath + '/assets/game/tiles/sand.png');
    this.load.image('sandRock', publicPath + '/assets/game/tiles/sandrock.png');
    this.load.image('sandMud', publicPath + '/assets/game/tiles/sandmud.png');
    this.load.image('sandAsh', publicPath + '/assets/game/tiles/sandash.png');
    this.load.image('tutorialTile', publicPath + '/assets/game/tiles/tutorial.png');
    this.load.image('meadowTile', publicPath + '/assets/game/tiles/meadow.jpg');
    this.load.image('savannaTile', publicPath + '/assets/game/tiles/savanna.jpg');
    this.load.image('alpineTile', publicPath + '/assets/game/tiles/alpine.jpg');
    this.load.image('dirtTile', publicPath + '/assets/game/tiles/dirt.png');
    this.load.image('rocksNewTile', publicPath + '/assets/game/tiles/rocks-new-tile.png');
    this.load.image('rocksNew', publicPath + '/assets/game/tiles/rocks-new.png');
    this.load.image('desertTile', publicPath + '/assets/game/tiles/desert.png');
    this.load.image('oasisTile', publicPath + '/assets/game/tiles/oasis.png');

    if (Settings.coins) {
      this.load.image('coin', publicPath + '/assets/game/coin.png');
    } else {
      this.load.image('coin', publicPath + '/assets/game/coin-new.png');
    }
    this.load.image('token', publicPath + '/assets/game/snowtoken.png');
    this.load.image('kill', publicPath + '/assets/game/ui/kill.png');
    this.load.image('mastery', publicPath + '/assets/game/ui/mastery.png');
    this.load.image('house1', publicPath + '/assets/game/house1.png');
    this.load.image('house1roof', publicPath + '/assets/game/house1roof.png');
    this.load.image('mossyRock', publicPath + '/assets/game/Mossy_Rock.png');
    this.load.image('pond', publicPath + '/assets/game/Pond_Earth.png');
    this.load.image('bush', publicPath + '/assets/game/grass.png');
    this.load.image('bushPine',         publicPath + '/assets/game/pinetree.png');
    this.load.image('bushPalm',         publicPath + '/assets/game/palmtree.png');
    this.load.image('bushSavannaPalm',  publicPath + '/assets/game/savannapalm.png');
    this.load.image('bushMeadow',       publicPath + '/assets/game/meadowtree.png');
    this.load.image('bushCactus',       publicPath + '/assets/game/cactus.png');
    this.load.image('cactus',           publicPath + '/assets/game/cactus.png');
    this.load.image('oasisDown',        publicPath + '/assets/game/oasisDown.png');
    this.load.image('deadBush',         publicPath + '/assets/game/deadbush.png');
    this.load.image('partTree',  publicPath + '/assets/game/partTree.png');
    this.load.image('partPine',  publicPath + '/assets/game/partPine.png');
    this.load.image('partPalm',  publicPath + '/assets/game/partPalm.png');
    this.load.image('partSav',   publicPath + '/assets/game/partSav.png');
    this.load.image('partDead',  publicPath + '/assets/game/partDead.png');
    this.load.image('partMound', publicPath + '/assets/game/partMound.png');
    for (let i = 1; i <= 3; i++) {
      this.load.image('ambShrubAlpine' + i, publicPath + '/assets/game/ambShrub' + i + 'alpine.png');
      this.load.image('ambShrubGrass' + i,  publicPath + '/assets/game/ambShrub' + i + 'grass.png');
      this.load.image('ambShrubMeadow' + i, publicPath + '/assets/game/ambShrub' + i + 'meadow.png');
      this.load.image('ambRock' + i,        publicPath + '/assets/game/ambRock' + i + '.png');
      this.load.image('ambRock' + i + 'desert', publicPath + '/assets/game/ambRock' + i + 'desert.png');
    }
    for (let i = 1; i <= 5; i++) {
      this.load.image('ambFlower' + i, publicPath + '/assets/game/ambFlower' + i + '.png');
    }
    this.load.image('sandBlock',        publicPath + '/assets/game/mobs/sandblock.png');
    this.load.image('sandBall',         publicPath + '/assets/game/mobs/sandball.png');
    this.load.image('iceMound', publicPath + '/assets/game/Ice_Mound.png');
    this.load.image('iceSpike', publicPath + '/assets/game/Ice_Spike.png');
    this.load.image('icePond', publicPath + '/assets/game/Ice_Pond.png');
    this.load.image('rock', publicPath + '/assets/game/Rock.png');
    this.load.image('lavaRock', publicPath + '/assets/game/Lava_Rock.png');
    this.load.image('lavaPool', publicPath + '/assets/game/Lava_Pool.png');
    for (let i = 1; i <= 9; i++) {
      this.load.image('ore' + i, publicPath + '/assets/game/ore' + i + '.png');
      for (const suffix of ['-lava', '-desert', '-dirt', '-snow']) {
        this.load.image('ore' + i + suffix, publicPath + '/assets/game/ore' + i + suffix + '.png');
      }
    }
    this.load.image('ore10', publicPath + '/assets/game/ore10.png');

    this.load.image('wolfMobPassive', publicPath + '/assets/game/mobs/wolfPassive.png');
    this.load.image('wolfMobAggressive', publicPath + '/assets/game/mobs/wolfAggressive.png');
    this.load.image('scorpion',         publicPath + '/assets/game/mobs/scorpion.png');
    this.load.image('camelPassive',     publicPath + '/assets/game/mobs/camelPassive.png');
    this.load.image('camelAngry',       publicPath + '/assets/game/mobs/camelAngry.png');
    this.load.image('desertBunny',      publicPath + '/assets/game/mobs/desertbunny.png');
    this.load.image('desertCat',        publicPath + '/assets/game/mobs/cat.png');
    this.load.image('fireSpirit',       publicPath + '/assets/game/mobs/firespirit.png');
    this.load.image('sphinx',           publicPath + '/assets/game/mobs/sphinx.png');
    this.load.image('ancientDirt',       publicPath + '/assets/game/mobs/ancient-dirt.png');
    this.load.image('swordProjDirt',     publicPath + '/assets/game/mobs/sword-dirt.png');
    this.load.image('boulderDirt',       publicPath + '/assets/game/mobs/boulder-dirt.png');
    this.load.image('catMobPassive', publicPath + '/assets/game/mobs/cat.png');
    this.load.image('bunny', publicPath + '/assets/game/mobs/bunny.png');
    this.load.image('moose', publicPath + '/assets/game/mobs/moose.png');
    this.load.image('fish', publicPath + '/assets/game/mobs/bluefish.png');
    this.load.image('angryFish', publicPath + '/assets/game/mobs/angryfish.png');
    this.load.image('chimera', publicPath + '/assets/game/mobs/chimera.png');
    this.load.image('yeti', publicPath + '/assets/game/mobs/yeti.png'); // add winter
    this.load.image('iceSpirit', publicPath + '/assets/game/mobs/icespirit.png');
    this.load.image('santa', publicPath + '/assets/game/mobs/santa.png'); // Unused for now
    // this.load.image('santaShadow', publicPath + '/assets/game/mobs/santaShadow.png');
    this.load.image('roku', publicPath + '/assets/game/mobs/roku.png');
    this.load.image('ancient', publicPath + '/assets/game/mobs/ancient.png');
    this.load.image('fireball', publicPath + '/assets/game/mobs/fireball.png');
    this.load.image('boulder', publicPath + '/assets/game/mobs/boulder.png');
    this.load.image('swordProj', publicPath + '/assets/game/mobs/sword.png');
    this.load.image('snowball', publicPath + '/assets/game/mobs/snowball.png');
    this.load.image('ornament1', publicPath + '/assets/game/mobs/ornament1.png');
    this.load.image('ornament2', publicPath + '/assets/game/mobs/ornament2.png');

    this.load.image('chest1', publicPath + '/assets/game/Chest1.png');
    this.load.image('chest2', publicPath + '/assets/game/Chest2.png');
    this.load.image('chest3', publicPath + '/assets/game/Chest3.png');
    this.load.image('chest4', publicPath + '/assets/game/Chest4.png');
    this.load.image('chest5', publicPath + '/assets/game/Chest5.png');
    this.load.image('chest6', publicPath + '/assets/game/Chest6.png');
    this.load.image('chest7', publicPath + '/assets/game/Chest7.png');
    this.load.image('chest8', publicPath + '/assets/game/Chest8.png'); // Removed

    this.load.image('crown', publicPath + '/assets/game/player/crown-new.png');

    // evols
    this.deferLoad('tankOverlay', publicPath + '/assets/game/evolutions/tank.png');
    this.deferLoad('berserkerOverlay', publicPath + '/assets/game/evolutions/berserker.png');
    this.deferLoad('vampireOverlay', publicPath + '/assets/game/evolutions/vampire.png');
    this.deferLoad('knightOverlay', publicPath + '/assets/game/evolutions/knight.png');
    this.deferLoad('samuraiOverlay', publicPath + '/assets/game/evolutions/samurai.png');
    this.deferLoad('rookOverlay', publicPath + '/assets/game/evolutions/rook.png');
    this.deferLoad('stalkerOverlay', publicPath + '/assets/game/evolutions/stalker.png');
    this.deferLoad('warriorOverlay', publicPath + '/assets/game/evolutions/warrior.png');
    this.deferLoad('lumberjackOverlay', publicPath + '/assets/game/evolutions/lumberjack.png');
    this.deferLoad('defenderOverlay', publicPath + '/assets/game/evolutions/defender.png');
    this.deferLoad('fighterOverlay', publicPath + '/assets/game/evolutions/fighter.png');
    this.deferLoad('fighterBadge', publicPath + '/assets/game/ui/fighter.png');
    this.deferLoad('fishermanOverlay', publicPath + '/assets/game/evolutions/fisherman.png');
    this.deferLoad('archerOverlay', publicPath + '/assets/game/evolutions/archer.png');
    this.deferLoad('superArcherOverlay', publicPath + '/assets/game/evolutions/superarcher.png');
    this.deferLoad('sniperOverlay', publicPath + '/assets/game/evolutions/sniper.png');
    this.deferLoad('rammerOverlay', publicPath + '/assets/game/evolutions/rammer.png');
    this.deferLoad('juggernautOverlay', publicPath + '/assets/game/evolutions/juggernaut.png');
    this.deferLoad('slasherOverlay', publicPath + '/assets/game/evolutions/slasher.png');
    this.deferLoad('strikerOverlay', publicPath + '/assets/game/evolutions/striker.png');
    this.deferLoad('plaguebearerOverlay', publicPath + '/assets/game/evolutions/plaguebearer.png');
    this.deferLoad('snowWalkerOverlay', publicPath + '/assets/game/evolutions/snowwalker.png');
    this.deferLoad('candyWalkerOverlay', publicPath + '/assets/game/evolutions/candywalker.png');
    this.deferLoad('treeOverlay', publicPath + '/assets/game/evolutions/tree.png');
    this.deferLoad('festiveOverlay', publicPath + '/assets/game/evolutions/festive.png');
    this.deferLoad('iceSniperOverlay', publicPath + '/assets/game/evolutions/icesniper.png');
    this.deferLoad('snowboarderOverlay', publicPath + '/assets/game/evolutions/snowboarder.png');
    this.deferLoad('snowtrekkerOverlay', publicPath + '/assets/game/evolutions/snowtrekker.png');
    this.deferLoad('iceSpikeOverlay', publicPath + '/assets/game/evolutions/icespike.png');
    this.deferLoad('iceKingOverlay', publicPath + '/assets/game/evolutions/iceking.png');
    this.deferLoad('drifterOverlay', publicPath + '/assets/game/evolutions/drifter.png');
    this.deferLoad('colossalOverlay', publicPath + '/assets/game/evolutions/colossal.png');
    this.deferLoad('medicOverlay', publicPath + '/assets/game/evolutions/medic.png');
    this.deferLoad('discoOverlay', publicPath + '/assets/game/evolutions/disco.png');
    this.deferLoad('butcherOverlay', publicPath + '/assets/game/evolutions/butcher.png');
    this.deferLoad('assassinOverlay', publicPath + '/assets/game/evolutions/assassin.png');
    this.deferLoad('eliteOverlay', publicPath + '/assets/game/evolutions/elite.png');
    this.deferLoad('trackerOverlay', publicPath + '/assets/game/evolutions/tracker.png');

    this.load.image('hitParticle', publicPath + '/assets/game/particles/hit.png');
    this.load.image('starParticle', publicPath + '/assets/game/particles/star.png');
    this.load.image('arrowParticle', publicPath + '/assets/game/particles/arrow.png');
    this.load.image('lightningParticle', publicPath + '/assets/game/particles/lightning.png');
    this.load.image('poisonParticle', publicPath + '/assets/game/particles/poison.png');
    this.load.image('sparkleParticle', publicPath + '/assets/game/particles/sparkle.png');
    this.load.image('swirl', publicPath + '/assets/game/particles/swirl.png');

    this.load.image('chatButton', publicPath + '/assets/game/ui/chat.png');
    if (this.isMobile) {
      this.load.image('abilityButton', publicPath + '/assets/game/ui/ability.png');
    } else {
      this.load.image('abilityButton', publicPath + '/assets/game/ui/abilityText.png');
    }
    this.load.image('swordThrowButton', publicPath + '/assets/game/ui/swordThrow.png');
    this.load.image('mobileAttack', publicPath + '/assets/game/ui/mobileAttack.png');
    this.load.image('mobileThrow', publicPath + '/assets/game/ui/mobileThrow.png');

    // load skins
    const basePath =  `${publicPath}/assets/game/player/`;
    // for (const skin of Object.values(skins)) {
    //   this.load.image(skin.name+'Body', basePath + skin.bodyFileName);
    //   this.load.image(skin.name+'Sword', basePath + skin.swordFileName);
    // }
    this.load.image(skins.player.name+'Body', basePath + skins.player.bodyFileName);
    this.load.image(skins.player.name+'Sword', basePath + skins.player.swordFileName);

    // Sound is deliberately NOT loaded here - 61 files / 4.1MB of audio decode
    // has no bearing on the first frame. It streams in from loadDeferred() once
    // the play button is live; SoundSystem.play() no-ops on a missing buffer.
    Biome.initialize(this);

    // log progress on load
    this.load.on('progress', (value: number) => {
      if(!this.isReady) window.dispatchEvent(new CustomEvent('assetsLoadProgress', { detail: value }));
    });
  }

  /* Audio, once the play button is already live. The progress listener above
     ignores this batch because isReady is set before we get here. */
  private deferred: Array<[string, string]> = [];

  /* Queued during preload, fetched only after the play button is already live. */
  private deferLoad(key: string, url: string) {
    this.deferred.push([key, url]);
  }

  /* Evolution overlays can't be needed at spawn - evolving costs coins you have
     to earn first - and audio has no bearing on the first frame. The progress
     listener ignores this batch because isReady is set before we get here. */
  private loadDeferred() {
    for (const [key, url] of this.deferred) this.load.image(key, url);
    this.deferred.length = 0;
    this.soundManager.load(publicPath);
    this.load.start();
  }

  private fxAttached = false;

  private setupScreenEffects() {
    if (this.renderer.type !== Phaser.WEBGL) return;
    try {
      const renderer = this.renderer as Phaser.Renderer.WebGL.WebGLRenderer;
      if (!renderer.pipelines.getPostPipeline('ScreenEffects')) {
        renderer.pipelines.addPostPipeline('ScreenEffects', ScreenEffectsPipeline);
      }
      try {
        const warm = renderer.pipelines.getPostPipeline('ScreenEffects') as any;
        if (warm && !warm.hasBooted && typeof warm.bootFX === 'function') {
          warm.bootFX();
        }
        if (warm && typeof warm.destroy === 'function') {
          warm.destroy();
        }
      } catch (warmErr) {
        console.warn('[ScreenEffects] pre-warm failed (non-fatal)', warmErr);
      }
    } catch (e) {
      console.warn('[ScreenEffects] failed to register post-FX pipeline', e);
      return;
    }

    const refresh = () => this.refreshScreenEffects();
    onEffectsChange(refresh);
    screenEffectsState.enabled = Settings.screenEffects !== false;
    refresh();
  }

  private refreshScreenEffects() {
    if (this.renderer.type !== Phaser.WEBGL || !this.cameras?.main) return;
    const s = screenEffectsState;
    const active = s.enabled || screenEffectsRuntime.blind > 0.001;
    if (active === this.fxAttached) return;
    try {
      if (active) {
        this.cameras.main.setPostPipeline(ScreenEffectsPipeline);
      } else {
        this.cameras.main.resetPostPipeline(true);
      }
      this.fxAttached = active;
    } catch (e) {
      console.warn('[ScreenEffects] attach/detach failed', e);
    }
  }

  create() {
    // Signal that asset loading has finished
    crazygamesSDK.loadingStop();

    initPerfStats(this);
    initAblation();



    this.cameras.main.setBackgroundColor('#000000');

    const camera = this.cameras.main;
    this.backgroundTile = this.add.tileSprite(camera.width / 2, camera.height / 2, camera.width, camera.height, 'rockTile')
      .setScrollFactor(0)
      .setDepth(-10)
      .setTileScale(2);

    this.aimLine = this.add.graphics().setDepth(35).setVisible(false);

    this.setupScreenEffects();

    this.soundManager.initialize();
    this.hud.initialize();
    this.hud.setShow(false);
    this.controls.initialize();
    this.resize();

    this._resizeHandler = () => this.resize();
    this._orientationHandler = () => {
      requestAnimationFrame(() => this.resize());
      setTimeout(() => this.resize(), 150);
      setTimeout(() => this.resize(), 500);
    };

    // CrazyGames ad pause/mute handling
    let previousVolume = this.soundManager.volume;
    this._adStartHandler = () => {
      console.log('[Game] Ad started - pausing and muting game');
      previousVolume = this.soundManager.volume;
      this.soundManager.setVolume(0); // Mute audio
      this.scene.pause(); // Pause game
    };

    this._adFinishHandler = () => {
      console.log('[Game] Ad finished - resuming and unmuting game');
      this.soundManager.setVolume(previousVolume); // Restore audio
      this.scene.resume(); // Resume game
    };

    this._visibilityHandler = () => {
      if (!document.hidden) {
        this.game.loop.resetDelta();
        this.gameState.onTabReturn();
      }
    };

    this._contextLostHandler = (e: Event) => {
      e.preventDefault();
      console.warn('[Game] WebGL context lost');
      this._contextWasLost = true;
    };
    this._contextRestoredHandler = () => {
      console.log('[Game] WebGL context restored — rebuilding textures');
      this._contextWasLost = false;
      try {
        const map = this.gameState.gameMap;
        for (const sprite of map.riverBorderSprites) {
          sprite.destroy();
        }
        map.riverBorderSprites = [];
        map.scheduleRiverBorders();
        map.update();
        for (const biome of map.biomes) {
          if (biome.container) {
            const texture = biome.container.texture.key;
            if (texture) biome.container.setTexture(texture);
          }
        }
      } catch (e) {
        console.error('[Game] Failed to rebuild textures after context restore:', e);
      }
    };

    const canvas = this.game.canvas;
    canvas.addEventListener('webglcontextlost', this._contextLostHandler);
    canvas.addEventListener('webglcontextrestored', this._contextRestoredHandler);

    window.addEventListener('resize', this._resizeHandler);
    window.addEventListener('orientationchange', this._orientationHandler);
    document.addEventListener('fullscreenchange', this._orientationHandler);
    document.addEventListener('webkitfullscreenchange', this._orientationHandler as any);
    if ((window as any).visualViewport) {
      (window as any).visualViewport.addEventListener('resize', this._resizeHandler);
    }
    window.addEventListener('crazyGamesAdStarted', this._adStartHandler);
    window.addEventListener('crazyGamesAdFinished', this._adFinishHandler);
    document.addEventListener('visibilitychange', this._visibilityHandler);

    const lowMemoryDevice = (() => {
      try {
        const mem = (navigator as any).deviceMemory;
        return (this.game as any).isCanvasMode || (typeof mem === 'number' && mem <= 4);
      } catch (e) { return false; }
    })();
    if (lowMemoryDevice) {
      (GameState as any).skinCap = 20;
      let savedShadows: any;
      try { savedShadows = settingsManager.get().livingShadows; } catch (e) {}
      if (savedShadows === undefined) Settings.livingShadows = false;
      console.log('[Game] low-memory device profile active');
    }

    BaseEntity.setLivingShadowsEnabled(Settings.livingShadows !== false);
    window.addEventListener('livingShadowsChanged', (e: any) => {
      BaseEntity.setLivingShadowsEnabled(!!e?.detail?.enabled);
    });

    window.addEventListener('soundVolumeChanged', (e: any) => {
      const v = Number(e?.detail?.volume);
      if (!Number.isNaN(v)) this.soundManager.setVolume(v / 10);
    });

    this.applyFpsLimit(Number(Settings.fpsLimit) || 0);
    this.fpsLimitHandler = (e: any) => this.applyFpsLimit(Number(e?.detail?.limit) || 0);
    window.addEventListener('fpsLimitChanged', this.fpsLimitHandler);

    this.screenEffectsHandler = (e: any) => updateEffects({ enabled: !!e?.detail?.enabled });
    window.addEventListener('screenEffectsChanged', this.screenEffectsHandler);
  }

  shutdown() {
    // Kill the network first — everything below frees objects the socket
    // would otherwise keep writing into.
    this.gameState.destroy();
    this.gameState.gameMap.cancelDeferredWork();
    if (this._resizeHandler) {
      window.removeEventListener('resize', this._resizeHandler);
      if ((window as any).visualViewport) {
        (window as any).visualViewport.removeEventListener('resize', this._resizeHandler);
      }
      this._resizeHandler = null;
    }
    if (this._orientationHandler) {
      window.removeEventListener('orientationchange', this._orientationHandler);
      document.removeEventListener('fullscreenchange', this._orientationHandler);
      document.removeEventListener('webkitfullscreenchange', this._orientationHandler as any);
      this._orientationHandler = null;
    }
    if (this._adStartHandler) {
      window.removeEventListener('crazyGamesAdStarted', this._adStartHandler);
      this._adStartHandler = null;
    }
    if (this._adFinishHandler) {
      window.removeEventListener('crazyGamesAdFinished', this._adFinishHandler);
      this._adFinishHandler = null;
    }
    if (this._visibilityHandler) {
      document.removeEventListener('visibilitychange', this._visibilityHandler);
      this._visibilityHandler = null;
    }
    if (this.fpsLimitHandler) {
      window.removeEventListener('fpsLimitChanged', this.fpsLimitHandler);
      this.fpsLimitHandler = null;
    }
    if (this.screenEffectsHandler) {
      window.removeEventListener('screenEffectsChanged', this.screenEffectsHandler);
      this.screenEffectsHandler = null;
    }
    if (this._contextLostHandler) {
      this.game.canvas.removeEventListener('webglcontextlost', this._contextLostHandler);
      this._contextLostHandler = null;
    }
    if (this._contextRestoredHandler) {
      this.game.canvas.removeEventListener('webglcontextrestored', this._contextRestoredHandler);
      this._contextRestoredHandler = null;
    }
    this.controls.cleanup();
    this.hud.cleanup();
  }

  resize() {
    if (!this.game) return;

    const view = config.viewportSize;
    const resolution = Settings.resolution / 100;
    const dpr = Math.min(window.devicePixelRatio || 1, Game.maxRenderDpr);
    const scale = dpr * resolution;
    const width = document.documentElement.clientWidth * scale;
    const height = document.documentElement.clientHeight * scale;
    this.game.scale.resize(width, height);
    this.game.scale.setZoom(1 / scale);

    if (this.fxAttached && this.cameras?.main) {
      try { this.cameras.main.resetPostPipeline(true); } catch (e) { }
      this.fxAttached = false;
    }

    const cameraScale = Math.max(width / view, height / view);
    this.setScaleZoom(cameraScale);

    if (this.backgroundTile) {
      this.backgroundTile.setSize(width, height);
      this.backgroundTile.setPosition(width / 2, height / 2);
    }

    try { this.gameState.resize(); } catch (e) { console.warn('[Game] gameState.resize failed', e); }
    try { this.hud.resize(); } catch (e) { console.warn('[Game] hud.resize failed', e); }
  }

  applyFpsLimit(limit: number) {
    const loop: any = this.game?.loop;
    if (!loop) return;
    const n = Number(limit) > 0 ? Number(limit) : 0;
    loop.fpsLimit = n;
    loop.hasFpsLimit = n > 0;
    loop._limitRate = n > 0 ? 1000 / n : 0;
    loop.delta = 0;
    if (loop.raf) {
      loop.raf.callback = (loop.hasFpsLimit ? loop.stepLimitFPS : loop.step).bind(loop);
    }
  }

  updateZoom(zoom: number, duration = 1500) {
    this.zoom = zoom;
    this._isZooming = true;
    this.cameras.main.zoomTo(zoom * this.scaleZoom, duration, Phaser.Math.Easing.Cubic.InOut, true, (_cam: any, progress: number) => {
      if (progress >= 1) {
        this._isZooming = false;
      }
    });
  }

  setScaleZoom(zoom: number) {
    const prev = this.scaleZoom;
    this.scaleZoom = zoom;
    const camera: any = this.cameras.main;
    if (prev > 0 && zoom > 0 && prev !== zoom) camera.rescaleZoomEffect?.(zoom / prev);
    camera.setZoom(this.zoom * this.scaleZoom);
  }

  follow(entity: BaseEntity) {
    const camera = this.cameras.main;
    const sprite = entity.container;
    entity.following = false;
    camera.pan(sprite.x, sprite.y, 1500, Phaser.Math.Easing.Cubic.InOut, true, (camera, progress) => {
      if (progress === 1) {
        entity.following = true;
        camera.startFollow(sprite);
        this.gameState.spectator.disable();
      }
    });
  }

  private _smoothedDt: number = 16;
  private _dtVarianceAccum: number = 0;
  private _dtVarianceSamples: number = 0;
  private _lastRawDt: number = 16;
  realFrameCount = 0;

	update(time: number, dt: number) {
    this.realFrameCount++;
    tickPerfStats();
    dt = Math.min(dt, 50);

    const dtDiff = Math.abs(dt - this._lastRawDt);
    this._dtVarianceAccum += dtDiff;
    this._dtVarianceSamples++;
    this._lastRawDt = dt;

    if (this._dtVarianceSamples > 60) {
      this._dtVarianceAccum *= 0.5;
      this._dtVarianceSamples = Math.floor(this._dtVarianceSamples * 0.5);
    }
    const avgVariance = this._dtVarianceAccum / this._dtVarianceSamples;

    if (avgVariance > 3) {
      this._smoothedDt = this._smoothedDt * 0.8 + dt * 0.2;
      dt = this._smoothedDt;
    } else {
      this._smoothedDt = dt;
    }

    if (!this.isReady) {
      this.isReady = true;
      window.dispatchEvent(new CustomEvent('assetsLoadProgress', { detail: 1 }));
      console.log('Game is ready');
      this.loadDeferred();
    }
    if (this.fxAttached) {
      screenEffectsRuntime.scrollX = this.cameras.main.scrollX;
      screenEffectsRuntime.scrollY = this.cameras.main.scrollY;
    }

    updateWind(dt);
    if (!this.gameState.self.entity) resetBiomeEffects();
    else updateBiomeEffects(this.gameState.self.entity?.biome as number | undefined, dt);
    this.refreshScreenEffects();
    this.soundManager.update(dt);
    this.gameState.updateTick(dt);
    const camera = this.cameras.main as any;
    camera.advanceEffects(dt);
    if (!this._isZooming) {
      const expectedZoom = this.zoom * this.scaleZoom;
      if (Math.abs(camera.zoom - expectedZoom) > 0.02) {
        camera.setZoom(expectedZoom);
        this.zoomMismatchFrames++;
        if (this.zoomMismatchFrames >= 3) reportIntegrityViolation();
      } else {
        this.zoomMismatchFrames = 0;
      }
    }
    this.updateCameraDrift(dt);
    this.gameState.updateGraphics(dt);
    this.updateBackgroundTile();
    this.hud.update(dt);
    this.controls.update();
    this.updateAimLine();
  }

  private updateBackgroundTile() {
    if (!this.backgroundTile) return;
    const backdrop = this.gameState.gameMap?.riverBackdrop;
    const covered = !!backdrop && backdrop.visible;
    if (this.backgroundTile.visible === covered) this.backgroundTile.setVisible(!covered);
    if (covered) return;
    const camera = this.cameras.main;
    const tileScale = 2;
    this.backgroundTile.setDisplaySize(camera.displayWidth, camera.displayHeight);
    this.backgroundTile.setTileScale(camera.zoom * tileScale);
    this.backgroundTile.setTilePosition(
      (camera.scrollX - camera.displayWidth / 2) / tileScale,
      (camera.scrollY - camera.displayHeight / 2) / tileScale);
  }

  private updateCameraDrift(dt: number) {
    const cam: any = this.cameras.main;
    let targetX = 0;
    let targetY = 0;
    const self: any = this.gameState.self.entity;
    const enabled = Settings.cameraFollowsMouse !== false
      && !!self && !!self.following;
    if (enabled) {
      const hw = cam.width * 0.5;
      const hh = cam.height * 0.5;
      const intensity = 4 * 0.04;

      const displayHalfW = hw / cam.zoom;
      const displayHalfH = hh / cam.zoom;
      const longHalf = Math.max(displayHalfW, displayHalfH);
      const shortHalf = Math.min(displayHalfW, displayHalfH);
      const dRef = intensity * longHalf;
      const target = longHalf * (0.5625 + intensity);
      const d = Math.max(0, Math.min(dRef, target - shortHalf));

      if (this.isMobile) {
        const aim = this.controls.aim;
        if (aim && aim.force > 0) {
          targetX = Math.cos(aim.angle) * aim.force * d;
          targetY = Math.sin(aim.angle) * aim.force * d;
        }
      } else {
        const pointer = this.input.activePointer;
        const fracX = Math.max(-1, Math.min(1, (pointer.x - hw) / hw));
        const fracY = Math.max(-1, Math.min(1, (pointer.y - hh) / hh));
        targetX = fracX * d;
        targetY = fracY * d;
      }
    }
    const a = 1 - Math.exp(-dt / 250);
    cam.mouseOffsetX += (targetX - cam.mouseOffsetX) * a;
    cam.mouseOffsetY += (targetY - cam.mouseOffsetY) * a;
  }

  private updateAimLine() {
    const aim = this.controls?.aim;
    const self: any = this.gameState.self.entity;
    let g: any = this.aimLine;

    if (!self || !self.container || !aim || aim.force <= 0.05) {
      if (g && !g.destroyed && g.transform && g.visible) g.setVisible(false);
      return;
    }

    if (!g || g.destroyed || !g.transform) {
      g = this.aimLine = this.add.graphics();
      this.aimLineR = -1;
    }
    if (g.parent !== self.container) {
      (self.container as any).addChildAt(g, 0);
      g.x = 0;
      g.y = 0;
      g.renderable = true;
    }

    const r = (self.shape && self.shape.radius) || 60;
    if (this.aimLineR !== r) {
      this.aimLineR = r;
      const scale = (self.container && self.container.scale) || 1;
      const len = (r * 2.4) / scale;
      const w = Math.max(2.5, r * 0.038) / scale;
      g.clear();
      g.fillStyle(0x000000, 0.18);
      g.fillRect(0, -w * 1.6, len, w * 3.2);
      g.fillStyle(0xffffff, 0.5);
      g.fillRect(0, -w, len, w * 2);
    }

    g.rotation = aim.angle;
    if (!g.visible) g.setVisible(true);
  }
}
