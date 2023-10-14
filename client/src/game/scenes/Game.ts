import Phaser from 'phaser';
import GameState from '../GameState';
import { InputTypes } from '../Types';
import SoundManager from '../SoundManager';
import store from '../../Store';
import HUD from '../hud/HUD';
import River from '../biomes/River';
import Safezone from '../biomes/Safezone';
import Biome from '../biomes/Biome';

const publicPath = process.env.PUBLIC_URL as string;

export default class Game extends Phaser.Scene {
  gameState: GameState;
  soundManager: SoundManager;
  hud: HUD;

  isMobile: boolean = false;
  joystick: any = null;
  joystickPointer: any = null;

	constructor() {
		super('game');
    this.gameState = new GameState(this);
    this.soundManager = new SoundManager(this);
    this.hud = new HUD(this);
	}

	init() {
    this.gameState.initialize();
    this.game.canvas.oncontextmenu = (e) => e.preventDefault();
    this.isMobile = this.game.device.os.android || this.game.device.os.iOS;
  }

  preload() {
    this.load.image('fireTile', publicPath + '/assets/game/tiles/fire.jpg');
    this.load.image('earthTile', publicPath + '/assets/game/tiles/grass.jpg');
    this.load.image('iceTile', publicPath + '/assets/game/tiles/ice.png');

    this.load.image('coin', publicPath + '/assets/game/coin.png');
    this.load.image('house1', publicPath + '/assets/game/house1.png');
    this.load.image('house1roof', publicPath + '/assets/game/house1roof.png');
    this.load.image('mossyRock', publicPath + '/assets/game/Mossy_Rock.png');
    this.load.image('pond', publicPath + '/assets/game/Pond_Earth.png');
    this.load.image('bush', publicPath + '/assets/game/grass.png');
    this.load.image('iceMound', publicPath + '/assets/game/Ice_Mound.png');
    this.load.image('iceSpike', publicPath + '/assets/game/Ice_Spike.png');
    this.load.image('icePond', publicPath + '/assets/game/Ice_Pond.png');
    this.load.image('rock', publicPath + '/assets/game/Rock.png');
    this.load.image('lavaRock', publicPath + '/assets/game/Lava_Rock.png');
    this.load.image('lavaPool', publicPath + '/assets/game/Lava_Pool.png');

    this.load.image('wolfMobPassive', publicPath + '/assets/game/mobs/wolfPassive.png');
    this.load.image('wolfMobAggressive', publicPath + '/assets/game/mobs/wolfAggressive.png');
    this.load.image('bunny', publicPath + '/assets/game/mobs/bunny.png');
    this.load.image('moose', publicPath + '/assets/game/mobs/moose.png');
    this.load.image('chimera', publicPath + '/assets/game/mobs/chimera.png');
    this.load.image('yeti', publicPath + '/assets/game/mobs/yeti.png');
    this.load.image('roku', publicPath + '/assets/game/mobs/roku.png');
    this.load.image('fireball', publicPath + '/assets/game/mobs/fireball.png');

    this.load.image('chest1', publicPath + '/assets/game/Chest1.png');
    this.load.image('chest2', publicPath + '/assets/game/Chest2.png');
    this.load.image('chest3', publicPath + '/assets/game/Chest3.png');
    this.load.image('chest4', publicPath + '/assets/game/Chest4.png');
    this.load.image('chest5', publicPath + '/assets/game/Chest5.png');
    this.load.image('chest6', publicPath + '/assets/game/Chest6.png');

    this.load.image('player', publicPath + '/assets/game/player/player.png');
    this.load.image('sword', publicPath + '/assets/game/player/sword.png');
    this.load.image('crown', publicPath + '/assets/game/player/crown.png');
    this.load.image('tankSkin', publicPath + '/assets/game/player/tankSkin.png');
    this.load.image('berserkerSkin', publicPath + '/assets/game/player/berserkerSkin.png');

    this.soundManager.load(publicPath);
    River.createTexture(this);
    Safezone.createTexture(this);
    Biome.initialize(this);
  }

  create() {
    this.cameras.main.fadeOut(0);

    this.soundManager.initialize();
    this.hud.initialize();
    this.setupControls();
    this.resize();
  }

  fadeInScene() {
    this.cameras.main.setBackgroundColor('#006400');
    this.cameras.main.fadeIn(500);
  }

  updateZoom(zoom: number) {
    this.cameras.main.zoomTo(zoom, 1000, Phaser.Math.Easing.Cubic.InOut, true);
  }

  setupControls() {
    if (this.isMobile) {
      // @ts-ignore
      this.joystick = this.plugins.get('rexVirtualJoystick')?.add(this.hud.scene, {
        radius: 150,
      });
      this.joystick.on('pointerdown', (pointer: any) => {
        this.joystickPointer = pointer;
      });
      this.joystick.on('pointerup', () => {
        this.joystickPointer = null;
      })
      this.input.addPointer(2);
    } else {
      this.input.keyboard?.on('keydown-W', () => this.gameState.inputs.inputDown(InputTypes.Up));
      this.input.keyboard?.on('keydown-A', () => this.gameState.inputs.inputDown(InputTypes.Left));
      this.input.keyboard?.on('keydown-S', () => this.gameState.inputs.inputDown(InputTypes.Down));
      this.input.keyboard?.on('keydown-D', () => this.gameState.inputs.inputDown(InputTypes.Right));
      this.input.keyboard?.on('keyup-W', () => this.gameState.inputs.inputUp(InputTypes.Up));
      this.input.keyboard?.on('keyup-A', () => this.gameState.inputs.inputUp(InputTypes.Left));
      this.input.keyboard?.on('keyup-S', () => this.gameState.inputs.inputUp(InputTypes.Down));
      this.input.keyboard?.on('keyup-D', () => this.gameState.inputs.inputUp(InputTypes.Right));

      this.input.keyboard?.on('keydown-UP', () => this.gameState.inputs.inputDown(InputTypes.Up));
      this.input.keyboard?.on('keydown-LEFT', () => this.gameState.inputs.inputDown(InputTypes.Left));
      this.input.keyboard?.on('keydown-DOWN', () => this.gameState.inputs.inputDown(InputTypes.Down));
      this.input.keyboard?.on('keydown-RIGHT', () => this.gameState.inputs.inputDown(InputTypes.Right));
      this.input.keyboard?.on('keyup-UP', () => this.gameState.inputs.inputUp(InputTypes.Up));
      this.input.keyboard?.on('keyup-LEFT', () => this.gameState.inputs.inputUp(InputTypes.Left));
      this.input.keyboard?.on('keyup-DOWN', () => this.gameState.inputs.inputUp(InputTypes.Down));
      this.input.keyboard?.on('keyup-RIGHT', () => this.gameState.inputs.inputUp(InputTypes.Right));
    }

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      pointer.event.preventDefault();
      if (pointer.leftButtonDown()) {
        this.gameState.inputs.inputDown(InputTypes.SwordSwing);
      }
      if (pointer.rightButtonDown()) {
        this.gameState.inputs.inputDown(InputTypes.SwordThrow);
      }
    });
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      pointer.event.preventDefault();
      if (pointer.leftButtonReleased()) {
        this.gameState.inputs.inputUp(InputTypes.SwordSwing);
      }
      if (pointer.rightButtonReleased()) {
        this.gameState.inputs.inputUp(InputTypes.SwordThrow);
      }
    });

    window.addEventListener('blur', () => this.gameState.inputs.clear());
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => {
      if (window.orientation === 0 || window.orientation === 180) { // Portrait
        this.resize(window.innerWidth, window.innerHeight);
        // if (this.scale.isFullscreen) {
        //   this.scale.startFullscreen();
        // }
      } else { // Landscape
        this.resize(window.innerHeight, window.innerWidth);
        // this.scale.startFullscreen();
      }
    });
    this.resize();
  }

  follow(sprite: any) {
    this.cameras.main.startFollow(sprite);
  }

  resize(width?: any, height?: any) {
    if (!this.game) return;

    const scale = store.scale;
    if (width === undefined) width = window.innerWidth / scale;
    if (height === undefined) height = window.innerHeight / scale;
    this.game.scale.resize(width, height);
    this.game.scale.setParentSize(width, height);
    this.game.scale.setGameSize(width, height);
    this.game.scale.setZoom(scale);
    this.hud.resize();
    this.gameState.resize();

    this.joystick?.setPosition(200, this.scale.height / 1.5);
  }

	update(time: number, delta: number) {
    this.soundManager.update(delta);
    this.gameState.updateGraphics(time, delta);
    this.hud.update(delta);
  }
}
