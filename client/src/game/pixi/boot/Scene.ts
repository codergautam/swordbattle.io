import { Container, utils } from 'pixi.js';
import { GameObjectFactory } from '../scene-services/GameObjectFactory';
import { Loader } from '../scene-services/Loader';
import { TextureManager } from '../scene-services/TextureManager';
import { Camera } from '../scene-services/Camera';
import { InputManager } from '../scene-services/InputManager';
import { TweenManager } from '../scene-services/TweenManager';
import { ParticleManager } from '../scene-services/ParticleEmitter';
import { SoundSystem } from '../scene-services/SoundSystem';
import {
  InputStub, TimeStub, PhysicsStub, ScenePluginStub,
} from '../scene-services/stubs';

export interface SceneRoots { world: Container; fixed: Container; hud: Container; }

export class Scene {
  key: string;
  game: any = null;
  add!: GameObjectFactory;
  make!: GameObjectFactory;
  load!: Loader;
  textures!: TextureManager;
  cameras!: { main: Camera };
  tweens: any;
  particleManager: any;
  input: any;
  sound: any;
  time: any;
  physics: any;
  scene: any;
  scale: any = null;
  renderer: any = null;
  sys: any = null;
  events: any;

  children: any;
  worldRoot!: Container;
  fixedRoot!: Container;
  hudRoot!: Container;

  constructor(config?: string | { key?: string }) {
    this.key = typeof config === 'string' ? config : (config && config.key) || 'default';
    this.events = new utils.EventEmitter();
  }

  _boot(game: any, roots: SceneRoots): void {
    this.game = game;
    this.worldRoot = roots.world;
    this.fixedRoot = roots.fixed;
    this.hudRoot = roots.hud;
    this.children = this.worldRoot;
    this.scale = game.scale;
    this.renderer = game.renderer;
    this.textures = new TextureManager(game.antialias);
    this.sound = new SoundSystem();
    this.load = new Loader(this.textures, this.sound);
    this.add = new GameObjectFactory(this, true);
    this.make = new GameObjectFactory(this, false);
    this.cameras = {
      main: new Camera(
        this.worldRoot,
        () => ({ width: this.scale.width, height: this.scale.height }),
        (c: number) => game.setBackground(c),
        this.fixedRoot,
      ),
    };
    this.cameras.main.onScreenFX = (on: boolean) => { try { game.setScreenEffects(on); } catch (e) { } };
    this.tweens = new TweenManager();
    this.particleManager = new ParticleManager();
    this.input = game.canvas
      ? new InputManager(game.canvas, () => ({ width: this.scale.width, height: this.scale.height }), window)
      : new InputStub();
    this.time = new TimeStub();
    this.physics = new PhysicsStub();
    this.scene = new ScenePluginStub(() => Scene.createSubScene(game, this.hudRoot, this));
    this.sys = { displayList: this.worldRoot, game, settings: { key: this.key } };
  }

  static createSubScene(game: any, displayRoot: Container, main: Scene): Scene {
    const s = new Scene('HUD');
    s.game = game;
    s.worldRoot = displayRoot; s.fixedRoot = displayRoot; s.hudRoot = displayRoot;
    s.children = displayRoot;
    s.scale = game.scale; s.renderer = game.renderer;
    s.textures = main.textures; s.load = main.load;
    s.add = new GameObjectFactory(s, true);
    s.make = new GameObjectFactory(s, false);
    s.cameras = { main: new Camera(displayRoot, () => ({ width: s.scale.width, height: s.scale.height }), () => {}) };
    s.tweens = main.tweens;
    s.particleManager = main.particleManager;
    s.input = main.input;
    s.time = main.time; s.sound = main.sound; s.physics = main.physics; s.scene = main.scene;
    s.sys = { displayList: displayRoot, game, settings: { key: 'HUD' } };
    return s;
  }

  addToDisplayList(obj: any): void {
    const target = obj._scrollFactorX === 0 ? this.fixedRoot : this.worldRoot;
    target.addChild(obj);
  }

  reparentByScrollFactor(obj: any): void {
    const target = obj._scrollFactorX === 0 ? this.fixedRoot : this.worldRoot;
    if (obj.parent !== target) target.addChild(obj);
  }

  init(..._args: any[]): void { }
  preload(): void { }
  create(..._args: any[]): void { }
  update(_time: number, _delta: number): void { }
  shutdown(): void { }
}
