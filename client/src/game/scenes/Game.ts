import Phaser from 'phaser';
import VirtualJoyStickPlugin from 'phaser3-rex-plugins/plugins/virtualjoystick-plugin';
import GameState from '../GameState';
import SoundManager from '../SoundManager';
import HUD from '../hud/HUD';
import Safezone from '../biomes/Safezone';
import Biome from '../biomes/Biome';
import { BaseEntity } from '../entities/BaseEntity';
import { Settings } from '../Settings';
import { config } from '../../config';
import { Controls } from '../Controls';
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
    // this.isMobile = true
  }

  preload() {
    // Signal that asset loading has started
    crazygamesSDK.loadingStart();

    this.load.image('fireTile', publicPath + '/assets/game/tiles/fire.jpg');
    this.load.image('earthTile', publicPath + '/assets/game/tiles/grass.jpg');
    this.load.image('iceTile', publicPath + '/assets/game/tiles/ice-new.png');
    this.load.image('river', publicPath + '/assets/game/tiles/river.png');
    this.load.image('safezone', publicPath + '/assets/game/tiles/spawn.png');

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
    this.load.image('bushFaded', publicPath + '/assets/game/grass-50.png');
    this.load.image('iceMound', publicPath + '/assets/game/Ice_Mound-new.png');
    this.load.image('iceMoundFaded', publicPath + '/assets/game/Ice_Mound-50.png');
    this.load.image('iceSpike', publicPath + '/assets/game/Ice_Spike.png');
    this.load.image('icePond', publicPath + '/assets/game/Ice_Pond-new.png');
    this.load.image('rock', publicPath + '/assets/game/Rock.png');
    this.load.image('lavaRock', publicPath + '/assets/game/Lava_Rock.png');
    this.load.image('lavaPool', publicPath + '/assets/game/Lava_Pool.png');

    this.load.image('wolfMobPassive', publicPath + '/assets/game/mobs/wolfPassive.png');
    this.load.image('wolfMobAggressive', publicPath + '/assets/game/mobs/wolfAggressive.png');
    this.load.image('wolfShadow', publicPath + '/assets/game/mobs/wolfShadow.png');
    this.load.image('catMobPassive', publicPath + '/assets/game/mobs/cat.png');
    this.load.image('catShadow', publicPath + '/assets/game/mobs/catShadow.png');
    this.load.image('bunny', publicPath + '/assets/game/mobs/bunny.png');
    this.load.image('bunnyShadow', publicPath + '/assets/game/mobs/bunnyShadow.png');
    this.load.image('moose', publicPath + '/assets/game/mobs/moose.png');
    this.load.image('mooseShadow', publicPath + '/assets/game/mobs/mooseShadow.png');
    this.load.image('fish', publicPath + '/assets/game/mobs/bluefish.png');
    this.load.image('fishShadow', publicPath + '/assets/game/mobs/fishShadow.png');
    this.load.image('angryFish', publicPath + '/assets/game/mobs/angryfish.png');
    this.load.image('angryFishShadow', publicPath + '/assets/game/mobs/angryFishShadow.png');
    this.load.image('chimera', publicPath + '/assets/game/mobs/chimera.png');
    this.load.image('chimeraShadow', publicPath + '/assets/game/mobs/chimeraShadow.png');
    this.load.image('yeti', publicPath + '/assets/game/mobs/yeti.png'); // add winter
    this.load.image('yetiShadow', publicPath + '/assets/game/mobs/yetiShadow.png');
    this.load.image('iceSpirit', publicPath + '/assets/game/mobs/icespirit.png');
    this.load.image('iceSpiritShadow', publicPath + '/assets/game/mobs/iceSpiritShadow.png');
    this.load.image('santa', publicPath + '/assets/game/mobs/santa.png'); // Unused for now
    this.load.image('santaShadow', publicPath + '/assets/game/mobs/santaShadow.png');
    this.load.image('roku', publicPath + '/assets/game/mobs/roku.png');
    this.load.image('rokuShadow', publicPath + '/assets/game/mobs/rokuShadow.png');
    this.load.image('ancient', publicPath + '/assets/game/mobs/ancient.png');
    this.load.image('ancientShadow', publicPath + '/assets/game/mobs/ancientShadow.png');
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
    this.load.image('chest8', publicPath + '/assets/game/Chest8.png');

    this.load.image('crown', publicPath + '/assets/game/player/crown-new.png');
    this.load.image('playerShadow', publicPath + '/assets/game/player/playerShadow.png');
    this.load.image('swordShadow', publicPath + '/assets/game/player/swordShadow.png');

    // evols
    this.load.image('tankOverlay', publicPath + '/assets/game/player/tank.png');
    this.load.image('berserkerOverlay', publicPath + '/assets/game/player/berserker.png');
    this.load.image('vampireOverlay', publicPath + '/assets/game/player/vampire.png');
    this.load.image('knightOverlay', publicPath + '/assets/game/player/knight.png');
    this.load.image('samuraiOverlay', publicPath + '/assets/game/player/samurai.png');
    this.load.image('rookOverlay', publicPath + '/assets/game/player/rook.png');
    this.load.image('stalkerOverlay', publicPath + '/assets/game/player/stalker.png');
    this.load.image('warriorOverlay', publicPath + '/assets/game/player/warrior.png');
    this.load.image('lumberjackOverlay', publicPath + '/assets/game/player/lumberjack.png');
    this.load.image('defenderOverlay', publicPath + '/assets/game/player/defender.png');
    this.load.image('fighterOverlay', publicPath + '/assets/game/player/fighter.png');
    this.load.image('fishermanOverlay', publicPath + '/assets/game/player/fisherman.png');
    this.load.image('archerOverlay', publicPath + '/assets/game/player/archer.png');
    this.load.image('superArcherOverlay', publicPath + '/assets/game/player/superarcher.png');
    this.load.image('sniperOverlay', publicPath + '/assets/game/player/sniper.png');
    this.load.image('rammerOverlay', publicPath + '/assets/game/player/rammer.png');
    this.load.image('juggernautOverlay', publicPath + '/assets/game/player/juggernaut.png');
    this.load.image('slasherOverlay', publicPath + '/assets/game/player/slasher.png');
    this.load.image('strikerOverlay', publicPath + '/assets/game/player/striker.png');
    this.load.image('plaguebearerOverlay', publicPath + '/assets/game/player/plaguebearer.png');
    this.load.image('snowWalkerOverlay', publicPath + '/assets/game/player/snowwalker.png');
    this.load.image('candyWalkerOverlay', publicPath + '/assets/game/player/candywalker.png');
    this.load.image('treeOverlay', publicPath + '/assets/game/player/tree.png');
    this.load.image('festiveOverlay', publicPath + '/assets/game/player/festive.png');
    this.load.image('iceSniperOverlay', publicPath + '/assets/game/player/icesniper.png');
    this.load.image('snowboarderOverlay', publicPath + '/assets/game/player/snowboarder.png');
    this.load.image('snowtrekkerOverlay', publicPath + '/assets/game/player/snowtrekker.png');
    this.load.image('iceSpikeOverlay', publicPath + '/assets/game/player/icespike.png');
    this.load.image('iceKingOverlay', publicPath + '/assets/game/player/iceking.png');
    this.load.image('drifterOverlay', publicPath + '/assets/game/player/drifter.png');
    this.load.image('colossalOverlay', publicPath + '/assets/game/player/colossal.png');
    this.load.image('medicOverlay', publicPath + '/assets/game/player/medic.png');

    this.load.image('hitParticle', publicPath + '/assets/game/particles/hit.png');
    this.load.image('starParticle', publicPath + '/assets/game/particles/star.png');
    this.load.image('arrowParticle', publicPath + '/assets/game/particles/arrow.png');
    this.load.image('lightningParticle', publicPath + '/assets/game/particles/lightning.png');
    this.load.image('poisonParticle', publicPath + '/assets/game/particles/poison.png');
    this.load.image('sparkleParticle', publicPath + '/assets/game/particles/sparkle.png');

    this.load.image('chatButton', publicPath + '/assets/game/ui/chat.png');
    if (this.isMobile) {
      this.load.image('abilityButton', publicPath + '/assets/game/ui/ability.png');
    } else {
      this.load.image('abilityButton', publicPath + '/assets/game/ui/abilityText.png');
    }
    this.load.image('swordThrowButton', publicPath + '/assets/game/ui/swordThrow.png');

    // load skins
    const basePath =  `${publicPath}/assets/game/player/`;
    // for (const skin of Object.values(skins)) {
    //   this.load.image(skin.name+'Body', basePath + skin.bodyFileName);
    //   this.load.image(skin.name+'Sword', basePath + skin.swordFileName);
    // }
    this.load.image(skins.player.name+'Body', basePath + skins.player.bodyFileName);
    this.load.image(skins.player.name+'Sword', basePath + skins.player.swordFileName);



    this.load.plugin('rexVirtualJoystick', VirtualJoyStickPlugin, true);

    this.soundManager.load(publicPath);
    Biome.initialize(this);

    // log progress on load
    this.load.on('progress', (value: number) => {
      if(!this.isReady) window.dispatchEvent(new CustomEvent('assetsLoadProgress', { detail: value }));
    });
  }

  create() {
    // Signal that asset loading has finished
    crazygamesSDK.loadingStop();

    this.cameras.main.setBackgroundColor('#006400');

    this.soundManager.initialize();
    this.hud.initialize();
    this.hud.setShow(false);
    this.controls.initialize();
    this.resize();

    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => {
      if (window.orientation === 0 || window.orientation === 180) { // Portrait
        // if (this.scale.isFullscreen) {
        //   this.scale.startFullscreen();
        // }
      } else { // Landscape
        // this.scale.startFullscreen();
      }
    });

    // CrazyGames ad pause/mute handling
    let previousVolume = this.soundManager.volume;
    window.addEventListener('crazyGamesAdStarted', () => {
      console.log('[Game] Ad started - pausing and muting game');
      previousVolume = this.soundManager.volume;
      this.soundManager.setVolume(0); // Mute audio
      this.scene.pause(); // Pause game
    });

    window.addEventListener('crazyGamesAdFinished', () => {
      console.log('[Game] Ad finished - resuming and unmuting game');
      this.soundManager.setVolume(previousVolume); // Restore audio
      this.scene.resume(); // Resume game
    });

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.game.loop.resetDelta();
      }
    });
  }

  resize() {
    if (!this.game) return;

    const view = config.viewportSize;
    const resolution = Settings.resolution / 100;
    const scale = window.devicePixelRatio * resolution;
    const width = document.documentElement.clientWidth * scale;
    const height = document.documentElement.clientHeight * scale;
    this.game.scale.resize(width, height);
    this.game.scale.setZoom(1 / scale);

    const cameraScale = Math.max(width / view, height / view);
    this.setScaleZoom(cameraScale);

    this.hud.resize();
    this.gameState.resize();
  }

  updateZoom(zoom: number, duration = 1500) {
    this.zoom = zoom;
    this.cameras.main.zoomTo(zoom * this.scaleZoom, duration, Phaser.Math.Easing.Cubic.InOut, true);
  }

  setScaleZoom(zoom: number) {
    this.scaleZoom = zoom;
    this.cameras.main.setZoom(this.zoom * this.scaleZoom);
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

	update(time: number, dt: number) {
    dt = Math.min(dt, 100);

    if (!this.isReady) {
      this.isReady = true;
      window.dispatchEvent(new CustomEvent('assetsLoadProgress', { detail: 1 }));
      console.log('Game is ready');
    }
    this.soundManager.update(dt);
    this.gameState.updateGraphics(dt);
    this.hud.update(dt);
    this.controls.update();
  }
}
