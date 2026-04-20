import { BaseEntity } from './BaseEntity';
import { Shape } from '../physics/Shape';
import { Evolutions } from '../Evolutions';
import { Health } from '../components/Health';
import { BiomeTypes, EntityTypes, FlagTypes, InputTypes, EvolutionTypes, ShapeTypes } from '../Types';
import { random } from '../../helpers';
import { Settings } from '../Settings';
import { MinorCardData, isMajorCard, isMinorCard, getMinorTotalPercent, countStacks } from '../CardData';
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
    'swordSwingAngle', 'swordSwingProgress', 'swordSwingDuration', 'swordSwingArc', 'swordFlying', 'swordFlyingCooldown', 'swordBoomerangReturning',
    'swordRaising', 'swordDecreasing',
    'viewportZoom', 'chatMessage', 'skin', 'skinName', 'account', 'wideSwing', 'coinShield',
    'cardOffers', 'chosenCards', 'choosingCard', 'cardTimer', 'cardPickNumber', 'availableUpgrades',
    'rerollsAvailable', 'pendingPicks', 'skipResults', 'isTutorial',
  ];
  static removeTransition = 500;
  static shadowOffsetX = 10;
  static shadowOffsetY = 10;

  static computeSwordReduction(r: number): number {
    if (r <= 260) return 0;
    if (r <= 300) return (r - 260) / 40 * 0.14;
    if (r <= 340) return 0.14 + (r - 300) / 40 * 0.11;
    if (r <= 416) return 0.25 + (r - 340) / 76 * 0.05;
    return Math.min(0.35, 0.30 + (r - 416) * 0.0005);
  }
  static computeSwordPullback(r: number): number {
    if (r <= 260) return 0;
    return Math.min((r - 260) * 0.08, 20) * (r / 100);
  }
  static abilitySwordScales: { [key: number]: number } = {
    1: 1.5,
    8: 1.4,
    10: 1.7,
  };

  body!: Phaser.GameObjects.Sprite;
  sword!: Phaser.GameObjects.Sprite;
  swordShadow!: Phaser.GameObjects.Sprite;
  bodyContainer!: Phaser.GameObjects.Container;
  swordContainer!: Phaser.GameObjects.Container;
  evolutionOverlay!: Phaser.GameObjects.Sprite;
  evolutionOverlayShadow!: Phaser.GameObjects.Sprite;
  shadow!: Phaser.GameObjects.Sprite;
  messageText!: Phaser.GameObjects.Text;
  choosingText!: Phaser.GameObjects.Text;
  submergedShadow!: Phaser.GameObjects.Graphics;
  private _submergedProgress: number = 0;

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
  private _lastSwordScale: number = -1;
  private _lastSwordLocalPullback: number = -1;
  private _submergedAccum: number = 0;

  cardSummaryContainer: Phaser.GameObjects.Container | null = null;
  cardSummaryBg: Phaser.GameObjects.Graphics | null = null;
  cardSummaryItems: Phaser.GameObjects.GameObject[] = [];
  private _lastSummaryKey = '';

  discoFieldGraphic!: Phaser.GameObjects.Graphics;
  discoFieldAlpha: number = 0;
  hypnotizeSwirlSprite!: Phaser.GameObjects.Sprite;
  private _lastDiscoFieldActive: boolean = false;
  private _lastHypnotizeActive: boolean = false;

  get survivalTime() {
    return (Date.now() - this.survivalStarted) / 1000;
  }

  createSprite() {
    this.isMe = this.id === this.game.gameState.self.id;
    if (this.account && this.account.clan && typeof this.account.clan === 'object' && this.account.clan.tag) {
      this.clan = this.account.clan.tag.toString().toUpperCase();
    } else if (this.account && typeof this.account.clan === 'string' && this.account.clan) {
      // Legacy server payload still sends a plain string clan tag — keep tolerant.
      this.clan = this.account.clan.toString().toUpperCase();
    }
    this.shape = Shape.create(this.shapeData);
    this.survivalStarted = Date.now();
    this.skinName = Object.values(skins).find(skin => skin.id === this.skin)?.name;
    const ogex = this.skinName?.includes("ogex") || false;
    this.body = this.game.add.sprite(0, 0, 'playerBody').setRotation(-Math.PI / 2);
    if (this.skin === 459) {
      this.body.setScale(1.25);
    }
    const bodyShadowKey = this.createShadowTexture('playerBody');
    this.shadow = this.game.add.sprite(Player.shadowOffsetX, Player.shadowOffsetY, bodyShadowKey).setRotation(-Math.PI / 2);
    this.shadow.setAlpha(0.085);
    if (this.skin === 459) {
      this.shadow.setScale(1.25);
    }
    this.evolutionOverlay = this.game.add.sprite(0, 0, '').setRotation(-Math.PI / 2);
    this.evolutionOverlayShadow = this.game.add.sprite(Player.shadowOffsetX, Player.shadowOffsetY, '').setRotation(-Math.PI / 2);
    this.evolutionOverlayShadow.setAlpha(0.085);
    this.evolutionOverlayShadow.setVisible(false);
    this.updateEvolution();

    this.sword = this.game.add.sprite(this.body.width / 2, this.body.height / 2, 'playerSword').setRotation(Math.PI / 4);
    const swordShadowKey = this.createShadowTexture('playerSword');
    this.swordShadow = this.game.add.sprite(0, 0, swordShadowKey).setRotation(Math.PI / 4);
    this.swordShadow.setAlpha(0.085);
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
      isPlayer: true,
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
      "amethyst nightveil": '#7802ab',
      oy: '#000000',
      bobz: '#000000',
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

    this.choosingText = this.game.add.text(0, 0, 'Choosing an upgrade...', {
      fontFamily: 'monospace',
      fontSize: '60px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 6,
      align: 'center',
    }).setOrigin(0.5, 0.5).setAlpha(0);

    this.cardSummaryBg = this.game.add.graphics();
    this.cardSummaryContainer = this.game.add.container(0, -this.body.height / 2 - 130, [this.cardSummaryBg]);
    this.cardSummaryContainer.setAlpha(0);

    this.bodyContainer = this.game.add.container(0, 0, [this.protectionAura, this.swordContainer, this.body, this.evolutionOverlay]);

    const submergedRadius = this.body.width * 0.6;
    this.submergedShadow = this.game.add.graphics();
    this.submergedShadow.fillStyle(0x000000, 1);
    this.submergedShadow.fillCircle(0, 0, submergedRadius);
    this.submergedShadow.setAlpha(0);

    this.container = this.game.add.container(this.shape.x, this.shape.y, [this.shadow, this.evolutionOverlayShadow, this.swordShadow, this.submergedShadow, this.bodyContainer, this.cardSummaryContainer, name, this.messageText, this.choosingText]);

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

    if (!Settings.unloadSkins) {
      if (Settings.loadskins) {
          this.loadSkin(this.skin).then(() => {
          const skinBase = skins.player.name;
          this.body.setTexture(skinBase+'Body');
          this.shadow.setTexture(this.createShadowTexture(skinBase+'Body'));
          this.sword.setTexture(skinBase+'Sword');
          this.swordShadow.setTexture(this.createShadowTexture(skinBase+'Sword'));
        }).catch(() => {
          console.log('failed to load skin', this.skin);
        });
      } else {
          this.loadSkin(this.skin).then(() => {
          this.body.setTexture(this.skinName+'Body');
          this.shadow.setTexture(this.createShadowTexture(this.skinName+'Body'));
          this.sword.setTexture(this.skinName+'Sword');
          this.swordShadow.setTexture(this.createShadowTexture(this.skinName+'Sword'));
        }).catch(() => {
          console.log('failed to load skin', this.skin);
        });
      }
    }

    this.discoFieldGraphic = this.game.add.graphics();
    this.discoFieldGraphic.setDepth(3);
    this.discoFieldGraphic.setVisible(false);

    this.hypnotizeSwirlSprite = this.game.add.sprite(0, 0, 'swirl');
    this.hypnotizeSwirlSprite.setDepth(2);
    this.hypnotizeSwirlSprite.setVisible(false);
    this.hypnotizeSwirlSprite.setAlpha(0);

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

  updateChoosingOverlay(choosing: boolean) {
    if (!this.choosingText) return;
    if (choosing) {
      this.choosingText.setAlpha(1);
    } else {
      this.game.tweens.add({
        targets: this.choosingText,
        alpha: 0,
        duration: 300,
      });
    }
  }

  updateChatMessage() {
    if (!this.messageText) return;

    if (!Settings.enableChat) {
      this.game.tweens.killTweensOf(this.messageText);
      this.messageText.setAlpha(0);
      this.messageText.text = '';
      return;
    }

    this.game.tweens.killTweensOf(this.messageText);
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

    if (!this.isMe) {
      if (data.swordRaising !== undefined) {
        if (data.swordRaising && !this.swordRaiseStarted) {
          this.swordRaiseStarted = true;
          this.swordDecreaseStarted = false;
        }
      }
      if (data.swordDecreasing !== undefined) {
        if (data.swordDecreasing && !this.swordDecreaseStarted) {
          this.swordDecreaseStarted = true;
          this.swordRaiseStarted = false;
        }
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

    if (data.biome !== undefined || data.coins !== undefined || (data.flags && data.flags[FlagTypes.RespawnShield] !== undefined)) {
      const coins = data.coins !== undefined ? data.coins : (this as any).coins;
      const biome = data.biome !== undefined ? data.biome : (this as any).biome;
      const hasRespawnShield = (data.flags && data.flags[FlagTypes.RespawnShield]) || ((this as any).flags && (this as any).flags[FlagTypes.RespawnShield]);
      const isProtected = (biome === BiomeTypes.Safezone) || (coins !== undefined && coins < this.coinShield) || !!hasRespawnShield;
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

      if (data.flags[FlagTypes.TutorialHitBlocked] && this.isMe) {
        this.game.hud.showAnnouncement('Complete the tutorial to fight other players!', '#ff4444', 2000, 0.5, true);
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
    if (now - this.abilityParticlesLast < 150) return;
    this.abilityParticlesLast = now;
    try {
      const s = getParticle(this.game, 'starParticle');
      s.x = this.container.x + random(-this.body.displayWidth, this.body.displayWidth) * 0.5;
      s.y = this.container.y + random(-this.body.displayHeight, this.body.displayHeight) * 0.5;
      s.setScale(0.05).setAlpha(1).setDepth(45);
      this.game.tweens.add({
        targets: s,
        alpha: 0,
        scale: 0.01,
        duration: 400,
        onComplete: () => releaseParticle(s),
      });
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
    if (now - this.poisonParticlesLast < 250) return;
    this.poisonParticlesLast = now;

    const count = fps < 30 ? 8 : 15;
    try {
      for (let i = 0; i < count; i++) {
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
      if (this.evolutionOverlayShadow) this.evolutionOverlayShadow.setVisible(false);
    } else {
      this.evolutionOverlay.setVisible(true);
      this.evolutionOverlay.setTexture(evolutionClass[1]);
      this.evolutionOverlay.setOrigin(evolutionClass[3][0], evolutionClass[3][1]);
      this.evolutionOverlay.setScale(this.body.width / this.evolutionOverlay.width * evolutionClass[2]);

      if (this.evolutionOverlayShadow) {
        const shadowKey = this.createShadowTexture(evolutionClass[1]);
        this.evolutionOverlayShadow.setTexture(shadowKey);
        this.evolutionOverlayShadow.setOrigin(evolutionClass[3][0], evolutionClass[3][1]);
        this.evolutionOverlayShadow.setScale(this.body.width / this.evolutionOverlayShadow.width * evolutionClass[2]);
        this.evolutionOverlayShadow.setVisible(true);
      }
    }
  }

  interpolate(dt: number) {
    const swordLerpDt = dt / (this.swordSwingDuration * 1000);
    if (this.swordRaiseStarted) {
      this.swordLerpProgress += swordLerpDt;
      if (this.swordLerpProgress >= 1) {
        this.swordLerpProgress = 1;
        this.swordRaiseStarted = false;
        if (this.isMe) {
          if (this.game.controls.isInputUp(InputTypes.SwordSwing)) {
            this.swordDecreaseStarted = true;
          }
        }
      }
    } else if (this.swordDecreaseStarted) {
      this.swordLerpProgress -= swordLerpDt;
      if (this.swordLerpProgress <= 0) {
        this.swordLerpProgress = 0;
        if (this.isMe && this.swordDecreaseStarted) {
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
    const swingAngle = (this as any).swordSwingArc || this.swordSwingAngle;
    let swordRotation = swingAngle * this.swordLerpProgress;
    if (this.wideSwing) {
      swordRotation += Math.PI / 4;
    }
    if (this.evolution && evolutionClass[0] === "Rammer" && this.swordFlying) {
      return;
    }
    this.swordContainer.setRotation(swordRotation);
    this.bodyContainer.setRotation(angle);
    if (this.shadow) {
      this.shadow.setRotation(angle - Math.PI / 2);
    }
    if (this.evolutionOverlayShadow && this.evolutionOverlayShadow.visible) {
      this.evolutionOverlayShadow.setRotation(angle - Math.PI / 2);
    }
    if (this.swordShadow) {
      const sx = this.body.width / 2;
      const sy = this.body.height / 2;
      const cos1 = Math.cos(swordRotation);
      const sin1 = Math.sin(swordRotation);
      const rx = sx * cos1 - sy * sin1;
      const ry = sx * sin1 + sy * cos1;
      const cos2 = Math.cos(angle);
      const sin2 = Math.sin(angle);
      this.swordShadow.setPosition(
        rx * cos2 - ry * sin2 + Player.shadowOffsetX,
        rx * sin2 + ry * cos2 + Player.shadowOffsetY
      );
      this.swordShadow.setRotation(angle + swordRotation + Math.PI / 4);
    }
  }

  updatePrediction() {
    const isHypnotized = !!(this.flags && this.flags[FlagTypes.Hypnotized]);

    let pointer = this.game.input.activePointer;
    if (this.game.isMobile) {
      pointer = this.game.controls.joystickPointer === this.game.input.pointer1
        ? this.game.input.pointer2
        : this.game.input.pointer1;
    }

    if (this.game.controls.isInputDown(InputTypes.SwordSwing)) {
      if (!(this.swordFlying || this.swordRaiseStarted || this.swordDecreaseStarted)) {
        if(!this.swordRaiseStarted) {
        this.swordRaiseStarted = true;
        this.game.controls.disableKeys([InputTypes.SwordThrow], true);
        }
      }
    }

    if (isHypnotized) {
      this.game.gameState.playerAngle = this.angle;
      this.rotateBody(this.angle);
      return;
    }

    let angle: number;
    if ((this.game as any)._isZooming) {
      const camera = this.game.cameras.main;
      const cx = camera.width / 2;
      const cy = camera.height / 2;
      angle = Math.atan2(pointer.y - cy, pointer.x - cx);
    } else {
      pointer.updateWorldPoint(this.game.cameras.main);
      angle = Math.atan2(pointer.worldY - this.container.y, pointer.worldX - this.container.x);
    }
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

  private isPointInRiver(wx: number, wy: number): boolean {
    const biomes = this.game.gameState.gameMap.biomes;
    for (let i = 0; i < biomes.length; i++) {
      const biome = biomes[i];
      if (biome.type !== BiomeTypes.River) continue;
      const shape = biome.shape as any;
      if (shape.type === ShapeTypes.Circle) {
        const dx = wx - shape.x;
        const dy = wy - shape.y;
        if (dx * dx + dy * dy <= shape.radius * shape.radius) return true;
      } else if (shape.type === ShapeTypes.Polygon) {
        if (shape.polygonBounds && !Phaser.Geom.Rectangle.Contains(shape.polygonBounds, wx, wy)) continue;
        const points = shape.points;
        const ox = shape.x;
        const oy = shape.y;
        let inside = false;
        for (let j = 0, k = points.length - 1; j < points.length; k = j++) {
          const xi = ox + points[j].x, yi = oy + points[j].y;
          const xk = ox + points[k].x, yk = oy + points[k].y;
          if ((yi > wy) !== (yk > wy) && wx < (xk - xi) * (wy - yi) / (yk - yi) + xi) {
            inside = !inside;
          }
        }
        if (inside) return true;
      }
    }
    return false;
  }

  private isPointInSafezone(wx: number, wy: number): boolean {
    const biomes = this.game.gameState.gameMap.biomes;
    for (let i = 0; i < biomes.length; i++) {
      const biome = biomes[i];
      if (biome.type !== BiomeTypes.Safezone) continue;
      const shape = biome.shape as any;
      if (shape.type === ShapeTypes.Circle) {
        const dx = wx - shape.x;
        const dy = wy - shape.y;
        if (dx * dx + dy * dy <= shape.radius * shape.radius) return true;
      } else if (shape.type === ShapeTypes.Polygon) {
        if (shape.polygonBounds && !Phaser.Geom.Rectangle.Contains(shape.polygonBounds, wx, wy)) continue;
        const points = shape.points;
        const ox = shape.x;
        const oy = shape.y;
        let inside = false;
        for (let j = 0, k = points.length - 1; j < points.length; k = j++) {
          const xi = ox + points[j].x, yi = oy + points[j].y;
          const xk = ox + points[k].x, yk = oy + points[k].y;
          if ((yi > wy) !== (yk > wy) && wx < (xk - xi) * (wy - yi) / (yk - yi) + xi) {
            inside = !inside;
          }
        }
        if (inside) return true;
      }
    }
    return false;
  }

  private isPointInDeepRiver(wx: number, wy: number): boolean {
    const borderWidth = 240;
    const biomes = this.game.gameState.gameMap.biomes;
    for (let i = 0; i < biomes.length; i++) {
      const biome = biomes[i];
      if (biome.type !== BiomeTypes.River) continue;
      const shape = biome.shape as any;
      if (shape.type === ShapeTypes.Circle) {
        const dx = wx - shape.x;
        const dy = wy - shape.y;
        const innerR = shape.radius - borderWidth;
        if (innerR > 0 && dx * dx + dy * dy <= innerR * innerR) return true;
      } else if (shape.type === ShapeTypes.Polygon) {
        if (shape.polygonBounds && !Phaser.Geom.Rectangle.Contains(shape.polygonBounds, wx, wy)) continue;
        const points = shape.points;
        const ox = shape.x;
        const oy = shape.y;
        let inside = false;
        for (let j = 0, k = points.length - 1; j < points.length; k = j++) {
          const xi = ox + points[j].x, yi = oy + points[j].y;
          const xk = ox + points[k].x, yk = oy + points[k].y;
          if ((yi > wy) !== (yk > wy) && wx < (xk - xi) * (wy - yi) / (yk - yi) + xi) {
            inside = !inside;
          }
        }
        if (!inside) continue;
        let minDist = Infinity;
        for (let j = 0; j < points.length; j++) {
          const k = (j + 1) % points.length;
          const ax = ox + points[j].x, ay = oy + points[j].y;
          const bx = ox + points[k].x, by = oy + points[k].y;
          const edx = bx - ax, edy = by - ay;
          const lenSq = edx * edx + edy * edy;
          const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((wx - ax) * edx + (wy - ay) * edy) / lenSq));
          const px = ax + t * edx, py = ay + t * edy;
          const d = Math.sqrt((wx - px) * (wx - px) + (wy - py) * (wy - py));
          if (d < minDist) minDist = d;
        }
        if (minDist >= borderWidth) return true;
      }
    }
    return false;
  }

  private updateSubmergedEffect(dt: number) {
    if (!this.submergedShadow || !this.shadow) return;

    const cx = this.container.x;
    const cy = this.container.y;
    const r = this.shape.radius;
    const edges: [number, number][] = [
      [cx, cy - r], [cx + r, cy], [cx, cy + r], [cx - r, cy],
    ];

    let allInRiver = true;
    let allInDeep = true;
    for (const [ex, ey] of edges) {
      if (!this.isPointInRiver(ex, ey) || this.isPointInSafezone(ex, ey)) {
        allInRiver = false;
        allInDeep = false;
        break;
      }
      if (!this.isPointInDeepRiver(ex, ey)) {
        allInDeep = false;
      }
    }

    let target: number;
    let speed: number;
    if (allInDeep) {
      target = 1;
      speed = 6;
    } else if (allInRiver) {
      target = 0;
      speed = 0.33;
    } else {
      target = 0;
      speed = 1;
    }

    const t = 1 - Math.exp(-speed * dt / 1500);
    this._submergedProgress += (target - this._submergedProgress) * t;

    if (this._submergedProgress < 0.001) this._submergedProgress = 0;
    if (this._submergedProgress > 0.999) this._submergedProgress = 1;

    this.submergedShadow.setScale(this._submergedProgress);
    this.submergedShadow.setAlpha(this._submergedProgress * 0.15);

    const shadowAlpha = 0.085 * (1 - this._submergedProgress * 0.5);
    this.shadow.setAlpha(shadowAlpha);
    if (this.swordShadow) this.swordShadow.setAlpha(shadowAlpha);
    if (this.evolutionOverlayShadow) this.evolutionOverlayShadow.setAlpha(shadowAlpha);
  }

  updateCardSummary() {
    if (!this.cardSummaryContainer) return;

    const chosenCards: number[] = (this as any).chosenCards || [];
    const key = chosenCards.join(',');

    const shouldShow = this.game.hud.cardSelect.isShowing && chosenCards.length > 0;

    if (shouldShow && key !== this._lastSummaryKey) {
      this._lastSummaryKey = key;
      this.rebuildCardSummary(chosenCards);
    }

    this.cardSummaryContainer.setAlpha(shouldShow ? 1 : 0);
  }

  rebuildCardSummary(chosenCards: number[]) {
    if (!this.cardSummaryContainer || !this.cardSummaryBg) return;

    for (const item of this.cardSummaryItems) item.destroy();
    this.cardSummaryItems = [];
    this.cardSummaryBg.clear();

    const stacks = countStacks(chosenCards);
    const majorPositions = this.game.gameState?.majorOfferPositions || {};

    const majorEntries: { id: number; offerPos: number }[] = [];
    const minorEntries: { id: number; stacks: number }[] = [];
    const seen = new Set<number>();

    for (const id of chosenCards) {
      if (seen.has(id)) continue;
      seen.add(id);
      if (isMajorCard(id)) {
        majorEntries.push({ id, offerPos: majorPositions[id] ?? 0 });
      } else if (isMinorCard(id)) {
        minorEntries.push({ id, stacks: stacks[id] || 1 });
      }
    }

    if (majorEntries.length === 0 && minorEntries.length === 0) return;

    const iconSz = 40;
    const gap = 12;
    const sepW = 12;
    const fontSize = 28;
    const hasMajors = majorEntries.length > 0;
    const hasMinors = minorEntries.length > 0;

    const majorW = majorEntries.length * (iconSz + gap) - (majorEntries.length > 0 ? gap : 0);
    const minorWidths: number[] = [];
    for (const { id, stacks: sc } of minorEntries) {
      const pct = getMinorTotalPercent(id, sc);
      const labelW = `+${pct}%`.length * (fontSize * 0.6);
      minorWidths.push(iconSz + 4 + labelW);
    }
    const minorW = minorWidths.length > 0 ? minorWidths.reduce((a, b) => a + b, 0) + (minorWidths.length - 1) * gap : 0;
    const sepSpace = (hasMajors && hasMinors) ? sepW + gap * 2 : 0;
    const totalW = majorW + sepSpace + minorW;

    this.cardSummaryBg.fillStyle(0x000000, 0.45);
    this.cardSummaryBg.fillRoundedRect(-totalW / 2 - 10, -iconSz / 2 - 5, totalW + 20, iconSz + 10, 12);

    let curX = -totalW / 2;

    for (const { id } of majorEntries) {
      const majorIndex = ((id - 101) % 3) + 1;
      const iconKey = `card_major${majorIndex}`;
      if (this.game.textures.exists(iconKey)) {
        const icon = this.game.add.image(curX + iconSz / 2, 0, iconKey);
        const s = Math.min(iconSz / icon.frame.width, iconSz / icon.frame.height);
        icon.setScale(s);
        this.cardSummaryContainer.add(icon);
        this.cardSummaryItems.push(icon);
      } else {
        const dot = this.game.add.graphics();
        dot.fillStyle(0xd4a017, 1);
        dot.fillCircle(curX + iconSz / 2, 0, iconSz / 3);
        dot.lineStyle(2, 0xffd700, 1);
        dot.strokeCircle(curX + iconSz / 2, 0, iconSz / 3);
        this.cardSummaryContainer.add(dot);
        this.cardSummaryItems.push(dot);
      }
      curX += iconSz + gap;
    }

    if (hasMajors && hasMinors) {
      const sep = this.game.add.graphics();
      sep.lineStyle(2, 0x666666, 0.7);
      sep.lineBetween(curX + sepW / 2, -iconSz / 2, curX + sepW / 2, iconSz / 2);
      this.cardSummaryContainer.add(sep);
      this.cardSummaryItems.push(sep);
      curX += sepW + gap;
    }

    for (let i = 0; i < minorEntries.length; i++) {
      const { id, stacks: sc } = minorEntries[i];
      const cardInfo = MinorCardData[id];
      if (!cardInfo) continue;

      const hexColor = '#' + cardInfo.color.toString(16).padStart(6, '0');

      if (this.game.textures.exists(cardInfo.icon)) {
        const icon = this.game.add.image(curX + iconSz / 2, 0, cardInfo.icon);
        const s = Math.min(iconSz / icon.frame.width, iconSz / icon.frame.height);
        icon.setScale(s);
        this.cardSummaryContainer.add(icon);
        this.cardSummaryItems.push(icon);
      } else {
        const dot = this.game.add.graphics();
        dot.fillStyle(cardInfo.color, 1);
        dot.fillCircle(curX + iconSz / 2, 0, iconSz / 3);
        this.cardSummaryContainer.add(dot);
        this.cardSummaryItems.push(dot);
      }

      const pct = getMinorTotalPercent(id, sc);
      const text = this.game.add.text(curX + iconSz + 4, 0, `+${pct}%`, {
        fontSize: `${fontSize}px`,
        fontFamily: 'Ubuntu, sans-serif',
        fontStyle: 'bold',
        color: hexColor,
        stroke: '#000000',
        strokeThickness: 3,
      }).setOrigin(0, 0.5);
      this.cardSummaryContainer.add(text);
      this.cardSummaryItems.push(text);

      curX += minorWidths[i] + gap;
    }
  }

  update(dt: number) {
    super.update(dt);

    if (this.choosingText && !this.isMe) {
      const isTutorial = (this as any).isTutorial;
      if (isTutorial) {
        this.choosingText.setText('In Tutorial');
        this.choosingText.setAlpha(1);
      } else {
        this.choosingText.setAlpha(0);
      }
    }

    this.updateCardSummary();

    const swordVisible = !this.swordFlying;
    if (this._lastSwordVisible !== swordVisible) {
      this.sword.setVisible(swordVisible);
      if (this.swordShadow) this.swordShadow.setVisible(swordVisible);
      this._lastSwordVisible = swordVisible;
    }
    const newScale = (this.shape.radius * 2) / this.body.width;
    if (this._lastContainerScale !== newScale) {
      this.container.scale = newScale;
      this._lastContainerScale = newScale;
    }
    const r = this.shape.radius;
    const baseX = this.body.width / 2;
    const baseY = this.body.height / 2;
    const abilityScale = (this.abilityActive && this.evolution != null)
      ? (Player.abilitySwordScales[this.evolution] ?? 1) : 1;
    const swordR = r / abilityScale;
    const swordReduction = Player.computeSwordReduction(swordR);
    const targetSwordScale = swordReduction > 0 ? 1 - swordReduction : 1;
    const targetLocalPullback = swordReduction > 0
      ? (newScale > 0 ? Player.computeSwordPullback(swordR) / newScale : 0)
      : 0;
    if (targetSwordScale !== this._lastSwordScale) {
      this.sword.setScale(targetSwordScale);
      if (this.swordShadow) this.swordShadow.setScale(targetSwordScale);
      this._lastSwordScale = targetSwordScale;
    }
    if (targetLocalPullback !== this._lastSwordLocalPullback) {
      this.sword.setPosition(baseX - targetLocalPullback, baseY - targetLocalPullback);
      this._lastSwordLocalPullback = targetLocalPullback;
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
    if (this.isMe) {
      this.updateSubmergedEffect(dt);
    } else {
      this._submergedAccum += dt;
      if (this._submergedAccum >= 200) {
        this.updateSubmergedEffect(this._submergedAccum);
        this._submergedAccum = 0;
      }
    }
    this.updateDiscoEffects(dt);
    if (this.following) {
      this.game.cameras.main.centerOn(this.container.x, this.container.y);
    }
    if (this.isMe) {
      this.updatePrediction();
    }
  }

  updateDiscoEffects(dt: number) {
    const discoFieldActive = this.evolution === EvolutionTypes.Disco && !!(this.flags && this.flags[FlagTypes.DiscoFieldActive]);
    if (discoFieldActive && !this._lastDiscoFieldActive) {
      this.discoFieldAlpha = 0.2;
      this._lastDiscoFieldActive = true;
    }
    if (this._lastDiscoFieldActive) {
      if (!discoFieldActive) {
        this.discoFieldAlpha -= dt / 300;
      }
      if (this.discoFieldAlpha > 0) {
        this.discoFieldGraphic.clear();
        this.discoFieldGraphic.fillStyle(0xffffff, this.discoFieldAlpha);
        this.discoFieldGraphic.fillCircle(0, 0, 1350);
        this.discoFieldGraphic.setPosition(this.container.x, this.container.y);
        this.discoFieldGraphic.setBlendMode(Phaser.BlendModes.ADD);
        this.discoFieldGraphic.setVisible(true);
      } else {
        this.discoFieldGraphic.setVisible(false);
        this.discoFieldGraphic.clear();
        this.discoFieldAlpha = 0;
        this._lastDiscoFieldActive = false;
      }
    }

    const hypnotizeActive = this.evolution === EvolutionTypes.Disco && this.abilityActive;
    if (hypnotizeActive) {
      const totalDuration = 7;
      const remaining = this.abilityDuration || 0;
      const elapsed = totalDuration - remaining;
      const maxRadius = 2000;

      const growFactor = Math.min(1, elapsed / 2);
      let alpha = 0.4;
      if (remaining <= 1) {
        alpha = 0.4 * remaining;
      }

      const targetDiameter = maxRadius * 2 * growFactor;
      const spriteScale = targetDiameter / 748;

      this.hypnotizeSwirlSprite.setPosition(this.container.x, this.container.y);
      this.hypnotizeSwirlSprite.setScale(spriteScale);
      this.hypnotizeSwirlSprite.setAlpha(alpha);
      this.hypnotizeSwirlSprite.setVisible(true);
      this.hypnotizeSwirlSprite.rotation += dt * 0.002;
      this._lastHypnotizeActive = true;
    } else if (this._lastHypnotizeActive) {
      this.hypnotizeSwirlSprite.setVisible(false);
      this.hypnotizeSwirlSprite.setAlpha(0);
      this._lastHypnotizeActive = false;
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
    try {
      if (this.discoFieldGraphic) this.discoFieldGraphic.destroy();
      if (this.hypnotizeSwirlSprite) this.hypnotizeSwirlSprite.destroy();
    } catch (e) {}
  }
}

export default Player;
