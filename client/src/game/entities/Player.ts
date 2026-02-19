import { BaseEntity } from './BaseEntity';
import { Shape } from '../physics/Shape';
import { Evolutions } from '../Evolutions';
import { Health } from '../components/Health';
import { BiomeTypes, EntityTypes, FlagTypes, InputTypes, EvolutionTypes } from '../Types';
import { random } from '../../helpers';
import { Settings } from '../Settings';
import * as cosmetics from '../cosmetics.json';
const {skins} = cosmetics;

const particlePool: Phaser.GameObjects.Sprite[] = [];
const graphicsPool: Phaser.GameObjects.Graphics[] = [];
const MAX_PARTICLE_POOL = 200;
const MAX_GRAPHICS_POOL = 50;

function getParticle(game: Phaser.Scene, key: string) {
  let p = particlePool.pop();
  if (!p) {
    p = game.add.sprite(0, 0, key);
    p.setDepth(40);
    p.setBlendMode(Phaser.BlendModes.ADD);
  }
  p.setActive(true).setVisible(true);
  return p;
}

function releaseParticle(p: Phaser.GameObjects.Sprite) {
  p.setActive(false).setVisible(false);
  p.x = 0; p.y = 0;
  if (particlePool.length < MAX_PARTICLE_POOL) {
    particlePool.push(p);
  } else {
    p.destroy();
  }
}

function getGraphics(game: Phaser.Scene) {
  let g = graphicsPool.pop();
  if (!g) {
    g = game.add.graphics();
  }
  g.clear();
  g.setActive(true).setVisible(true);
  return g;
}

function releaseGraphics(g: Phaser.GameObjects.Graphics) {
  g.clear();
  g.setActive(false).setVisible(false);
  if (graphicsPool.length < MAX_GRAPHICS_POOL) {
    graphicsPool.push(g);
  } else {
    g.destroy();
  }
}

class Player extends BaseEntity {
  static stateFields = [
    ...BaseEntity.stateFields, 'name', 'angle',
    'kills', 'flags', 'biome', 'level', 'upgradePoints',
    'coins', 'tokens', 'nextLevelCoins', 'previousLevelCoins',
    'buffs', 'evolution', 'possibleEvolutions',
    'isAbilityAvailable', 'abilityActive', 'abilityDuration', 'abilityCooldown',
    'swordSwingAngle', 'swordSwingProgress', 'swordSwingDuration', 'swordFlying', 'swordFlyingCooldown',
    'viewportZoom', 'chatMessage', 'skin', 'skinName', 'account', 'wideSwing', 'coinShield',
  ];
  static removeTransition = 500;

  body!: Phaser.GameObjects.Sprite;
  sword!: Phaser.GameObjects.Sprite;
  bodyContainer!: Phaser.GameObjects.Container;
  swordContainer!: Phaser.GameObjects.Container;
  evolutionOverlay!: Phaser.GameObjects.Sprite;
  messageText!: Phaser.GameObjects.Text;

  protectionAura!: Phaser.GameObjects.Graphics;
  sparkleInterval?: number;

  isMe: boolean = false;
  swordLerpProgress = 0;
  angleLerp = 0;
  previousAngle = 0;
  following = false;

  survivalStarted: number = 0;
  swordRaiseStarted: boolean = false;
  swordDecreaseStarted: boolean = false;

  wideSwing: boolean = false;
  poisonParticlesLast: number = 0;
  private _lastSwordVisible: boolean | null = null;
  private _lastContainerScale: number = -1;

  get survivalTime() {
    return (Date.now() - this.survivalStarted) / 1000;
  }

  createSprite() {
    this.isMe = this.id === this.game.gameState.self.id;
    if (this.account && this.account.clan && this.account.clan.toString().toUpperCase() !== "X79Q") {
      this.clan = this.account.clan.toString().toUpperCase();
    }
    this.shape = Shape.create(this.shapeData);
    this.survivalStarted = Date.now();
    this.skinName = Object.values(skins).find(skin => skin.id === this.skin)?.name;
    const ogex = this.skinName?.includes("ogex") || false;
    this.body = this.game.add.sprite(0, 0, 'playerBody').setRotation(-Math.PI / 2);
    this.evolutionOverlay = this.game.add.sprite(0, 0, '').setRotation(-Math.PI / 2);
    this.updateEvolution();

    this.sword = this.game.add.sprite(this.body.width / 2, this.body.height / 2, 'playerSword').setRotation(Math.PI / 4);
    this.swordContainer = this.game.add.container(0, 0, [this.sword]);

    this.protectionAura = this.game.add.graphics();
    const auraRadius = Math.max(this.body.width, this.body.height) * 0.75;
    this.protectionAura.fillStyle(0x33bbff, 0.12);
    this.protectionAura.fillCircle(0, 0, auraRadius);
    this.protectionAura.setBlendMode(Phaser.BlendModes.ADD);
    this.protectionAura.setDepth(1);
    this.protectionAura.setAlpha(0);
    this.protectionAura.setVisible(false);

    this.healthBar = new Health(this, {
      hideWhenFull: false,
      line: 0,
      offsetY: -this.body.height / 2 - 40,
    });
    const displayName = this.clan ? `[${this.clan}] ${this.name}`.replace(/\s+/, ' ') : this.name;
    const name = this.game.add.text(0, -this.body.height / 2 - 50, displayName);
    name.setFontFamily('Arial');
    name.setFontSize(50);
    name.setOrigin(0.5, 1);
    const specialColors: {
      [key: string]: string
    } = {
      codergautam: '#ff0000',
      angel: '#acfffc',
      "cool guy 53": '#0055ff',
      "update testing account": '#00ff00',
      amethystbladeyt: '#7802ab',
    };

    const applyNameColor = (hex: string) => {
      name.setFill(hex);
    };

    const special = specialColors[this.name?.toLowerCase() as keyof typeof specialColors];
    if (special) {
      applyNameColor(special);
    } else if (this.account) {
      applyNameColor('#0000ff');
    } else {
      applyNameColor('#000000');
    }

    this.messageText = this.game.add.text(0, -this.body.height / 2 - 100, '')
      .setFontFamily('Arial')
      .setFontSize(75)
      .setOrigin(0.5, 1)
      .setFill('#ffffff');

    this.bodyContainer = this.game.add.container(0, 0, [this.protectionAura, this.swordContainer, this.body, this.evolutionOverlay]);
    this.container = this.game.add.container(this.shape.x, this.shape.y, [this.bodyContainer, name, this.messageText]);

    if (ogex) {
      try {
        this.sparkleInterval = window.setInterval(() => {
          const fps = this.game.game.loop?.actualFps ?? 60;
          if (fps < 15 || !this.container) return;

          const sprite = getParticle(this.game, 'sparkleParticle');
          const rx = Phaser.Math.FloatBetween(-this.body.width * 0.3, this.body.width * 0.3);
          const ry = Phaser.Math.FloatBetween(-this.body.height * 0.3, this.body.height * 0.3);
          sprite.x = Math.round(this.container.x + rx + Phaser.Math.FloatBetween(-5, 5));
          sprite.y = Math.round(this.container.y + ry + Phaser.Math.FloatBetween(-5, 5));
          sprite.setScale(Phaser.Math.FloatBetween(0.06, 0.09))
            .setAlpha(1)
            .setRotation(Phaser.Math.FloatBetween(0, Math.PI * 2));
          sprite.setDepth(50);
          sprite.setBlendMode(Phaser.BlendModes.ADD);
          try { sprite.setTint(0xffdd88); } catch (e) {}

          const duration = Phaser.Math.Between(600, 1100);
          this.game.tweens.add({
            targets: sprite,
            alpha: 0,
            scale: 0.01,
            duration,
            ease: 'Cubic.easeOut',
            onComplete: () => releaseParticle(sprite),
          });
        }, 300);
      } catch (e) {
        //
      }
    }

    if (Settings.loadskins) {
        this.loadSkin(this.skin).then(() => {
        this.body.setTexture(skins.player.name+'Body');
        this.sword.setTexture(skins.player.name+'Sword');
      }).catch(() => {
        console.log('failed to load skin', this.skin);
      });
    } else {
        this.loadSkin(this.skin).then(() => {
        this.body.setTexture(this.skinName+'Body');
        this.sword.setTexture(this.skinName+'Sword');
      }).catch(() => {
        console.log('failed to load skin', this.skin);
      });
    }

    return this.container;
  }

  skinLoaded(id: number) {
    return this.game.textures.exists(Object.values(skins).find(skin => skin.id === id)?.name+'Body');
  }

  loadSkin(id: number) {
    return new Promise<void>((resolve, reject) => {
      if(this.skinLoaded(id)) {
        resolve();
      } else {
        if(this.game.gameState.failedSkinLoads[id]) reject();
        else {
        const skin = Object.values(skins).find(skin => skin.id === id);
        const publicPath = process.env.PUBLIC_URL as string;
        const basePath =  `${publicPath}/assets/game/player/`;

        if(skin) {
          console.log('loading skin', skin.name, basePath + skin.bodyFileName);
        this.game.load.image(skin.name+'Body', basePath + skin.bodyFileName);
        this.game.load.image(skin.name+'Sword', basePath + skin.swordFileName);

        this.game.load.once(Phaser.Loader.Events.COMPLETE, () => {
          resolve();
        });
        this.game.load.once(Phaser.Loader.Events.FILE_LOAD_ERROR, () => {
          // texture didnt load so use the placeholder
          this.game.gameState.failedSkinLoads[id] = true;
          reject();
        });

        this.game.load.start();
      } else {
        this.game.gameState.failedSkinLoads[id] = true;
          reject();
        }
      }
      }
    });
  }

  updateChatMessage() {
    if (!this.messageText) return;

    this.game.tweens.killTweensOf(this.messageText); // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
    const toggle = (show: boolean) => {
      this.game.add.tween({
        targets: this.messageText,
        alpha: show ? 1 : 0,
        duration: 200,
      });
    };

    // If current chat message is empty, then hide message
    if (!this.chatMessage) {
      toggle(false);
    } else {
      // If there's previous message, then hide it and show new
      if (this.messageText.text) {
        this.game.add.tween({
          targets: this.messageText,
          alpha: 0,
          duration: 100,
          onComplete: () => {
            this.messageText.text = this.chatMessage;
            toggle(true);
          }
        });
      } else {
        // Either just show message
        this.messageText.text = this.chatMessage;
        toggle(true);
      }
    }
  }

  beforeStateUpdate(data: any): void {
    super.beforeStateUpdate(data);

    if (data.wideSwing !== undefined) {
    this.wideSwing = data.wideSwing;
    }

    if (!this.isMe && data.swordSwingProgress !== undefined) {
      if (this.swordSwingProgress === 0 && data.swordSwingProgress !== 0) {
        this.swordRaiseStarted = true;
      }
      if (this.swordSwingProgress === 1 && data.swordSwingProgress !== 1) {
        this.swordDecreaseStarted = true;
      }
    }
    if (data.angle !== undefined) {
      this.previousAngle = this.angle;
      this.angleLerp = 0;
    }
    if (data.evolution !== this.evolution) {
      this.updateEvolution();
    }
  }

  afterStateUpdate(data: any): void {
    super.afterStateUpdate(data);

    if (this.isMe && data.viewportZoom !== undefined) {
      this.game.updateZoom(data.viewportZoom);
    }
    if (data.possibleEvolutions !== undefined) {
      this.game.hud.evolutionSelect.updateList = true;
    }
    if (data.chatMessage !== undefined) {
      this.updateChatMessage();
    }
    if (data.biome !== undefined) {
      const isTextBlack = data.biome !== BiomeTypes.Fire;
      this.messageText?.setFill(isTextBlack ? '#000000' : '#ffffff');
    }

    if (data.biome !== undefined || data.coins !== undefined) {
      const coins = data.coins !== undefined ? data.coins : (this as any).coins;
      const biome = data.biome !== undefined ? data.biome : (this as any).biome;
      const isProtected = (biome === BiomeTypes.Safezone) || (coins !== undefined && coins < this.coinShield);
      this.updateProtectionAura(isProtected);
    }

    if (data.flags) {
      if (data.flags[FlagTypes.EnemyHit]) {
        const entity = this.game.gameState.entities[data.flags[FlagTypes.EnemyHit]];
        if (entity && entity.type !== EntityTypes.Player) this.addHitParticles(entity);
      }

      if (data.flags[FlagTypes.PoisonDamaged]) {
        try {
          if (this.evolution === EvolutionTypes.Plaguebearer && this.game.soundManager) {
            this.game.soundManager.play(FlagTypes.PoisonDamaged);
          }
        } catch (e) {}
      }

      if (data.flags[FlagTypes.Damaged]) {
        this.addDamagedParticles();
      }
      if (data.flags[FlagTypes.ChainDamaged]) {
        try {
          if (!this.game.gameState.chainDamagedTimestamps) this.game.gameState.chainDamagedTimestamps = {};
          (this.game.gameState.chainDamagedTimestamps as any)[this.id] = Date.now();
        } catch (e) {}
        this.addLightningParticles();
      }

      if (data.flags[FlagTypes.ShockwaveHit]) {
        this.addShockwaveParticles();
      }
    }
  }

  updateProtectionAura(show: boolean) {
    if (!this.protectionAura) return;
    if (show && this.protectionAura.visible && this.protectionAura.alpha >= 0.95) return;
    if (!show && !this.protectionAura.visible) return;

    this.game.tweens.killTweensOf(this.protectionAura);
    if (show) {
      this.protectionAura.setVisible(true);
      this.game.tweens.add({
        targets: this.protectionAura,
        alpha: 1,
        duration: 200,
        ease: 'Power2',
      });
    } else {
      this.game.tweens.add({
        targets: this.protectionAura,
        alpha: 0,
        duration: 200,
        ease: 'Power2',
        onComplete: () => {
          this.protectionAura.setVisible(false);
        }
      });
    }
  }

  addHitParticles(entity: BaseEntity) {
    if (this.game.game.loop.actualFps < 30) return;

    const particles = this.game.add.particles(entity.container.x, entity.container.y, 'starParticle', {
      maxParticles: 5,
      scale: 0.1,
      speed: 200,
    });
    particles.setDepth(45);
    particles.setBlendMode(Phaser.BlendModes.ADD);
    particles.once('complete', () => particles.destroy());
  }

  addDamagedParticles() {
    if (this.game.game.loop.actualFps < 30) return;
    try {
    const particles = this.game.add.particles(this.container.x, this.container.y, 'hitParticle', {
      maxParticles: 5,
      scale: 0.01,
      speed: 200,
    });
    particles.setDepth(45);
    particles.setBlendMode(Phaser.BlendModes.ADD);
    particles.once('complete', () => particles.destroy());
  } catch (e) {
    console.log(e);
  }
  }

  addShockwaveParticles() {
    if (this.game.game.loop.actualFps < 30) return;
    try {
      // Create burst of red particles emanating from player
      const particles = this.game.add.particles(this.container.x, this.container.y, 'hitParticle', {
        maxParticles: 30,
        scale: { start: 0.015, end: 0.005 },
        speed: { min: 300, max: 600 },
        lifespan: 800,
        angle: { min: 0, max: 360 },
        tint: 0xFF0000, // Red color
      });
      particles.setDepth(45);
      particles.setBlendMode(Phaser.BlendModes.ADD);
      particles.once('complete', () => particles.destroy());
    } catch (e) {
      console.log(e);
    }
  }

  addLightningParticles() {
    const fps = this.game.game.loop.actualFps;
    if (fps < 5) return;
    try {
      const entitiesMap = this.game.gameState.entities;
      const allEntities: BaseEntity[] = [];
      for (const id in entitiesMap) allEntities.push(entitiesMap[id] as BaseEntity);
      const maxTargets = 3;
      const maxDistance = 3250;
      const now = Date.now();
      const cache = (this.game.gameState as any).chainDamagedTimestamps || {};
      const chainNodes = allEntities
        .filter(e => e && e.type === EntityTypes.Player && e.container)
        .map(e => {
          const hasFlag = !!(e.flags && e.flags[FlagTypes.ChainDamaged]);
          const recent = !!(cache[e.id] && (now - cache[e.id] <= 600));
          return {
            e,
            id: e.id,
            d: Phaser.Math.Distance.Between(this.container.x, this.container.y, e.container.x, e.container.y),
            hasFlag,
            recent,
            ts: cache[e.id] || (hasFlag ? now : 0)
          };
        })
        .filter(n => n.d <= maxDistance && (n.hasFlag || n.recent));

      const selfTs = cache[this.id] || now;
      chainNodes.push({ e: this as any as BaseEntity, id: this.id, d: 0, hasFlag: true, recent: true, ts: selfTs });

      chainNodes.sort((a, b) => (a.ts - b.ts) || (a.d - b.d));

      const myIndex = chainNodes.findIndex(n => n.id === this.id);
      let neighbors: typeof chainNodes = [];
      if (myIndex !== -1) {
        if (myIndex - 1 >= 0) neighbors.push(chainNodes[myIndex - 1]);
        if (myIndex + 1 < chainNodes.length) neighbors.push(chainNodes[myIndex + 1]);
      }
      if (neighbors.length === 0) {
        neighbors = chainNodes
          .filter(n => n.id !== this.id)
          .sort((a, b) => a.d - b.d)
          .slice(0, maxTargets);
      }

      if (neighbors.length === 0) {
        const total = fps < 30 ? 8 : 20;
        const sx = this.container.x;
        const sy = this.container.y;
        for (let i = 0; i < total; i++) {
          const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
          const radius = Phaser.Math.Between(20, 140);
          const px = sx + Math.cos(angle) * radius + random(-6, 6);
          const py = sy + Math.sin(angle) * radius + random(-6, 6);

          const sprite = getParticle(this.game, 'lightningParticle');
          sprite.x = px;
          sprite.y = py;
          sprite.setScale(Phaser.Math.FloatBetween(0.12, 0.28)).setAlpha(1);

          const delay = Phaser.Math.Between(0, 80);
          this.game.tweens.add({
            targets: sprite,
            alpha: 0,
            scale: 0.01,
            duration: 500,
            delay,
            ease: 'Linear',
            onComplete: () => releaseParticle(sprite),
          });
        }
        return;
      }

      neighbors.forEach(node => {
        const target = node.e;
        const sx = this.container.x;
        const sy = this.container.y;
        const tx = target.container.x;
        const ty = target.container.y;
        const dist = Phaser.Math.Distance.Between(sx, sy, tx, ty);
        const baseAngle = Phaser.Math.Angle.Between(sx, sy, tx, ty);

        const lineG = getGraphics(this.game);
        lineG.lineStyle(Math.max(2, Math.min(6, Math.round(dist / 300))), 0x99ccff, 0.95);
        const wobble = (x: number, y: number, f = 6) => [x + random(-f, f), y + random(-f, f)];
        const [sxw, syw] = wobble(sx, sy, 6);
        const [txw, tyw] = wobble(tx, ty, 6);
        lineG.beginPath();
        lineG.moveTo(sxw, syw);
        const midCount = Math.min(3, Math.floor(dist / 200));
        for (let m = 1; m <= midCount; m++) {
          const t = m / (midCount + 1);
          const mx = Phaser.Math.Linear(sx, tx, t) + random(-18, 18);
          const my = Phaser.Math.Linear(sy, ty, t) + random(-18, 18);
          lineG.lineTo(mx, my);
        }
        lineG.lineTo(txw, tyw);
        lineG.strokePath();
        lineG.setDepth(48);
        lineG.setBlendMode(Phaser.BlendModes.ADD);
        lineG.setAlpha(1);

        const baseSparks = fps < 30 ? 16 : 36;
        const sparks = Math.max(4, Math.floor(baseSparks / Math.max(1, neighbors.length)));
        for (let i = 0; i < sparks; i++) {
          const t = sparks === 1 ? 0.5 : (i / (sparks - 1));
          const jitterAlong = Phaser.Math.FloatBetween(-6, 6);
          const px = Phaser.Math.Linear(sx, tx, t) + Math.cos(baseAngle + Math.PI / 2) * jitterAlong + random(-4, 4);
          const py = Phaser.Math.Linear(sy, ty, t) + Math.sin(baseAngle + Math.PI / 2) * jitterAlong + random(-4, 4);

          const s = getParticle(this.game, 'lightningParticle');
          s.x = px;
          s.y = py;
          s.setScale(Phaser.Math.FloatBetween(0.12, 0.36))
            .setRotation(baseAngle + Phaser.Math.FloatBetween(-0.2, 0.2))
            .setAlpha(1);

          const delay = Phaser.Math.Between(0, 90);
          this.game.tweens.add({
            targets: s,
            alpha: 0,
            scale: 0.02,
            duration: 500,
            delay,
            ease: 'Cubic.easeOut',
            onComplete: () => releaseParticle(s),
          });
        }

        this.game.tweens.add({
          targets: lineG,
          alpha: 0,
          duration: 500,
          ease: 'Linear',
          onComplete: () => releaseGraphics(lineG),
        });
      });
    } catch (e) {
      console.log(e);
    }
  }

  abilityParticlesLast: number = 0;

  addAbilityParticles() {
    const fps = this.game.game.loop.actualFps;
    if (fps < 5) return;
    const now = Date.now();
    if (now - this.abilityParticlesLast < 100) return;
    this.abilityParticlesLast = now;
    try {
    const particles = this.game.add.particles(
      this.container.x + random(-this.body.displayWidth, this.body.displayWidth) * 0.5,
      this.container.y + random(-this.body.displayHeight, this.body.displayHeight) * 0.5,
      'starParticle',
      { scale: 0.05, speed: 200, maxParticles: 1 },
    );
    particles.setDepth(45);
    particles.once('complete', () => particles.destroy());
    if (this.evolution === EvolutionTypes.Plaguebearer && this.abilityActive) {
      this.addPoisonFieldParticles();
    }
    } catch (e) {
      console.log(e);
    }
  }

  
  addPoisonFieldParticles() {
    const fps = this.game.game.loop.actualFps;
    if (fps < 5) return;
    const now = Date.now();
    if (now - this.poisonParticlesLast < 180) return; // 5-6 times per sec
    this.poisonParticlesLast = now;

    try {
      for (let i = 0; i < 30; i++) {
        const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
        const rr = Math.sqrt(Phaser.Math.FloatBetween(0, 1)) * 2000;
        const px = this.container.x + Math.cos(angle) * rr + random(-8, 8);
        const py = this.container.y + Math.sin(angle) * rr + random(-8, 8);

        const s = getParticle(this.game, 'poisonParticle');
        s.x = px;
        s.y = py;
        s.setScale(Phaser.Math.FloatBetween(0.04, 0.09))
          .setAlpha(0.9)
          .setRotation(Phaser.Math.FloatBetween(0, Math.PI * 2));

        const rot = Phaser.Math.FloatBetween(-0.25, 0.25);
        const delay = Phaser.Math.Between(0, 120);
        this.game.tweens.add({
          targets: s,
          angle: s.angle + rot,
          alpha: 0,
          duration: 500,
          delay,
          ease: 'Sine.easeInOut',
          onComplete: () => releaseParticle(s),
        });
      }
    } catch (e) {
      console.log(e);
    }
  }

  updateEvolution() {
    if (!this.evolutionOverlay) return;

    const evolutionClass = Evolutions[this.evolution];
    if (!evolutionClass) {
      this.evolutionOverlay.setVisible(false);
    } else {
      this.evolutionOverlay.setVisible(true);
      this.evolutionOverlay.setTexture(evolutionClass[1]);
      this.evolutionOverlay.setOrigin(evolutionClass[3][0], evolutionClass[3][1]);
      this.evolutionOverlay.setScale(this.body.width / this.evolutionOverlay.width * evolutionClass[2]);
    }
  }

  interpolate(dt: number) {
    const swordLerpDt = dt / (this.swordSwingDuration * 1000);
    if (this.swordRaiseStarted) {
      this.swordLerpProgress += swordLerpDt;
      if (this.swordLerpProgress >= 1) {
        this.swordLerpProgress = 1;
        this.swordRaiseStarted = false;
        // start decrease animation when the player is not holding it
        if (this.game.controls.isInputUp(InputTypes.SwordSwing)) {
          this.swordDecreaseStarted = true;
        }
      }
    } else if (this.swordDecreaseStarted) {
      this.swordLerpProgress -= swordLerpDt;
      if (this.swordLerpProgress <= 0) {
        this.swordLerpProgress = 0;
        if(this.isMe && this.swordDecreaseStarted) {
          this.game.controls.enableKeys([InputTypes.SwordThrow]);
        }
        this.swordDecreaseStarted = false;
      }
    }
    if (!this.isMe) {
      this.angleLerp = Math.min(this.angleLerp + dt / 120, 1);
      this.rotateBody(Phaser.Math.Angle.RotateTo(this.previousAngle, this.angle, this.angleLerp));
    }
  }

  rotateBody(angle: number) {
    const evolutionClass = Evolutions[this.evolution];
    let swordRotation = this.swordSwingAngle * this.swordLerpProgress;
    if (this.wideSwing) {
      swordRotation += Math.PI / 4;
    }
    if (this.evolution && evolutionClass[0] === "Rammer" && this.swordFlying) {
      return;
    }
    this.swordContainer.setRotation(swordRotation);
    this.bodyContainer.setRotation(angle);
  }

  updatePrediction() {
    let pointer = this.game.input.activePointer;
    if (this.game.isMobile) {
      pointer = this.game.controls.joystickPointer === this.game.input.pointer1
        ? this.game.input.pointer2
        : this.game.input.pointer1;
    }
    pointer.updateWorldPoint(this.game.cameras.main);

    if (this.game.controls.isInputDown(InputTypes.SwordSwing)) {
      if (!(this.swordFlying || this.swordRaiseStarted || this.swordDecreaseStarted)) {
        if(!this.swordRaiseStarted) {
        this.swordRaiseStarted = true;
        this.game.controls.disableKeys([InputTypes.SwordThrow], true);
        }
      }
    }

    let angle = Math.atan2(pointer.worldY - this.container.y, pointer.worldX - this.container.x);
    // Round to 2 decimal places
    angle = Math.round(angle * 100) / 100;

    // Normalize
    if (angle <= 0) {
      angle += Math.PI * 2;
    }
    this.angle = this.game.gameState.playerAngle = angle;

    this.rotateBody(angle);
  }

  updateRotation(): void {}

  update(dt: number) {
    super.update(dt);

    const swordVisible = !this.swordFlying;
    if (this._lastSwordVisible !== swordVisible) {
      this.sword.setVisible(swordVisible);
      this._lastSwordVisible = swordVisible;
    }
    const newScale = (this.shape.radius * 2) / this.body.width;
    if (this._lastContainerScale !== newScale) {
      this.container.scale = newScale;
      this._lastContainerScale = newScale;
    }
    this.interpolate(dt);

    if (this.abilityActive) {
      if (this.evolution) {
        const evolutionClass = Evolutions[this.evolution];
        if (evolutionClass[0] !== 'Stalker' && evolutionClass[0] !== 'Juggernaut') {
          this.addAbilityParticles();
        }
      } 
     }
    if (this.following) {
      this.game.cameras.main.centerOn(this.container.x, this.container.y);
    }
    if (this.isMe) {
      this.updatePrediction();
    }
  }

  remove() {
    super.remove();
    this.flags = {}; // clear flags to stop all sounds
    try { // clear ogex particle
      if (this.sparkleInterval) {
        clearInterval(this.sparkleInterval);
        this.sparkleInterval = undefined;
      }
    } catch (e) {}
  }
}

export default Player;
