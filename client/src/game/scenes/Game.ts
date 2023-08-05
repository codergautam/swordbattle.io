import Phaser from 'phaser';
import store from '../../Store';
import GameState from '../GameState';
import SoundManager from '../SoundManager';
import { InputTypes } from '../Types';
import HUD from '../components/HUD';

const publicPath = process.env.PUBLIC_URL;

export default class Game extends Phaser.Scene {
  cursors: any;
  gameState: GameState;
  background: any;
  soundManager: SoundManager;
  hud: HUD;
  isMobile: boolean = false;
  joystick: any = null;
  joystickPointer: any = null;
  zoom = 0.8;

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
    this.load.image('background', publicPath + '/assets/game/background.png');
    this.load.image('player', publicPath + '/assets/game/player.png');
    this.load.image('coin', publicPath + '/assets/game/coin.png');
    this.load.image('sword', publicPath + '/assets/game/sword.png');
    this.load.image('house1', publicPath + '/assets/game/house1.png');
    this.load.image('house1roof', publicPath + '/assets/game/house1roof.png');
    this.load.image('tank', publicPath + "/assets/game/tankSkin.png");
    this.load.image('berserker', publicPath + "/assets/game/berserkerSkin.png");

    this.load.audio('damage', publicPath + '/assets/sound/damage.mp3');
    this.load.audio('hitenemy', publicPath + '/assets/sound/hitenemy.wav');
    this.load.audio('coin', publicPath + '/assets/sound/coin.m4a');
  }

  create() {
    this.cameras.main.setZoom(this.zoom);
    this.cameras.main.fadeOut(0);
    this.background = this.add.tileSprite(0, 0, this.scale.width, this.scale.height, 'background');
    this.background.setOrigin(0, 0);
    this.soundManager.initialize();
    this.hud.initialize();
    this.setupControls();
    this.resize();
  }

  fadeInScene() {
    this.cameras.main.setBackgroundColor('#006400');
    this.cameras.main.fadeIn(500);
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
      
      this.cursors = this.input.keyboard?.createCursorKeys();
      this.cursors.up.on('down', () => this.gameState.inputs.inputDown(InputTypes.Up));
      this.cursors.left.on('down', () => this.gameState.inputs.inputDown(InputTypes.Left));
      this.cursors.down.on('down', () => this.gameState.inputs.inputDown(InputTypes.Down));
      this.cursors.right.on('down', () => this.gameState.inputs.inputDown(InputTypes.Right));
      this.cursors.up.on('up', () => this.gameState.inputs.inputUp(InputTypes.Up));
      this.cursors.left.on('up', () => this.gameState.inputs.inputUp(InputTypes.Left));
      this.cursors.down.on('up', () => this.gameState.inputs.inputUp(InputTypes.Down));
      this.cursors.right.on('up', () => this.gameState.inputs.inputUp(InputTypes.Right));
    }

    this.input.on('pointerdown', (pointer: any) => {
      if (pointer.leftButtonDown()) {
        this.gameState.inputs.inputDown(InputTypes.SwordSwing);
      }
    });
    this.input.on('pointerup', (pointer: any) => {
      if (pointer.leftButtonReleased()) {
        this.gameState.inputs.inputUp(InputTypes.SwordSwing);
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

  updateMap(mapData: any) {
    this.physics.world.setBounds(0, 0, mapData.width, mapData.height);
    this.background.setSize(mapData.width, mapData.height);
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

    this.joystick?.setPosition(200, this.scale.height / 1.5);
  }

	update(time: number, delta: number) {
    this.soundManager.update(delta);
    this.gameState.updateGraphics(time, delta);
    this.hud.update();
  }
}
