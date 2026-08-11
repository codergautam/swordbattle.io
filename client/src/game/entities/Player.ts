import { BaseEntity } from './BaseEntity';
import { Shape } from '../physics/Shape';
import { Evolutions } from '../Evolutions';
import { Health } from '../components/Health';
import { BiomeTypes, EntityTypes, FlagTypes, InputTypes, EvolutionTypes, ShapeTypes, UpgradeTypes } from '../Types';
import { random } from '../../helpers';
import { Settings } from '../Settings';
import { MinorCardData, isMajorCard, isMinorCard, getMinorTotalPercent, countStacks } from '../CardData';
import * as cosmetics from '../cosmetics.json';
import { FootstepTrail } from '../effects/Footsteps';
import { screenEffectsRuntime } from '../effects/screenEffectsState';
import { skinBodyScales } from '../skinScales';
import { resolveNameStyle, CLAN_COLOR } from '../nameStyles';
import { buildNameTag } from '../pixiNameTag';
const {skins} = cosmetics;

const particlePool: Phaser.GameObjects.Sprite[] = [];
const graphicsPool: Phaser.GameObjects.Graphics[] = [];
const maxParticlePool = 200;
const maxGraphicsPool = 50;
const bishopTargetTypes = new Set<number>([
  EntityTypes.Player, EntityTypes.Zombie, EntityTypes.Wolf, EntityTypes.Bunny,
  EntityTypes.Moose, EntityTypes.Yeti, EntityTypes.Chimera, EntityTypes.Roku,
  EntityTypes.Cat, EntityTypes.Santa, EntityTypes.Ancient, EntityTypes.Fish,
  EntityTypes.AngryFish, EntityTypes.IceSpirit, EntityTypes.Sphinx,
]);
const bishopChakramCount = 36;

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
  if (particlePool.length < maxParticlePool) {
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
  if (graphicsPool.length < maxGraphicsPool) {
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
    'buffs', 'evolution', 'possibleEvolutions', 'possibleUpgrades', 'currentUpgrades',
    'isAbilityAvailable', 'abilityActive', 'abilityDuration', 'abilityCooldown',
    'swordSwingAngle', 'swordSwingProgress', 'swordSwingDuration', 'swordSwingArc', 'swordFlying', 'swordFlyingCooldown', 'swordBoomerangReturning',
    'swordRaising', 'swordDecreasing', 'offhandRaising', 'offhandDecreasing',
    'activeSelection', 'abilityCharges',
    'viewportZoom', 'chatMessage', 'skin', 'skinName', 'account', 'wideSwing', 'valorCrests',
    'cardOffers', 'chosenCards', 'choosingCard', 'cardTimer', 'cardPickNumber', 'availableUpgrades',
    'rerollsAvailable', 'pendingPicks', 'skipResults', 'isTutorial',
  ];
  static removeTransition = 500;
  static shadowOffsetX = 0;
  static shadowOffsetY = 12;

  static bodyScales: { [key: number]: number } = skinBodyScales;

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
  private footsteps?: FootstepTrail;
  shadowRT?: Phaser.GameObjects.RenderTexture;
  private evoShadowActive = false;

  protectionAura!: Phaser.GameObjects.Graphics;
  sparkleInterval?: number;

  isMe: boolean = false;
  bodyScale: number = 1;
  swordLerpProgress = 0;
  angleLerp = 0;
  localAimAngle: number | null = null;
  previousAngle = 0;
  following = false;

  survivalStarted: number = 0;
  swordRaiseStarted: boolean = false;
  swordDecreaseStarted: boolean = false;
  offhandLerpProgress = 0;
  offhandRaiseStarted: boolean = false;
  offhandDecreaseStarted: boolean = false;

  wideSwing: boolean = false;
  poisonParticlesLast: number = 0;
  private _lastSwordVisible: boolean | null = null;
  private _lastContainerScale: number = -1;
  private _lastSwordScale: number = -1;
  private _lastSwordLocalPullback: number = -1;
  private submergedAccum: number = 0;

  cardSummaryContainer: Phaser.GameObjects.Container | null = null;
  cardSummaryBg: Phaser.GameObjects.Graphics | null = null;
  cardSummaryItems: Phaser.GameObjects.GameObject[] = [];
  private _lastSummaryKey = '';

  discoFieldGraphic!: Phaser.GameObjects.Graphics;
  discoFieldAlpha: number = 0;
  hypnotizeSwirlSprite!: Phaser.GameObjects.Sprite;
  private _lastDiscoFieldActive: boolean = false;
  private _lastHypnotizeActive: boolean = false;

  static trackerZoneRadius = 1600;
  trackerZoneGraphic?: Phaser.GameObjects.Graphics;
  radarPulseGraphic?: Phaser.GameObjects.Graphics;
  private radarPulseElapsed: number = -1;
  private radarSweepAngle: number = 0;
  private _lastSilenced: boolean = false;
  protected usesDedicatedEventTextures: boolean = false;
  valorCrestContainer?: Phaser.GameObjects.Container;
  valorCrestCount?: Phaser.GameObjects.Text;
  bishopCannon?: Phaser.GameObjects.Sprite;
  bishopChakramContainer?: Phaser.GameObjects.Container;
  bishopChakrams: Phaser.GameObjects.Sprite[] = [];
  evolutionAbilityEffect?: Phaser.GameObjects.Sprite;
  reaperMarkEffect?: Phaser.GameObjects.Sprite;
  private abilityVisualStarted = 0;
  private abilityVisualWasActive = false;

  get survivalTime() {
    return (Date.now() - this.survivalStarted) / 1000;
  }

  get effectiveBodyWidth() { return this.body.width / this.bodyScale; }
  get effectiveBodyHeight() { return this.body.height / this.bodyScale; }

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
    this.bodyScale = Player.bodyScales[this.skin] ?? 1;
    if (this.skin === 459) {
      this.body.setScale(1.25);
    }
    const bodyShadowScale = (this.skin === 459 ? 1.25 : 1) * BaseEntity.shadow.scaleMul;
    this.shadow = this.createBakedOutlineShadow('playerBody', 0.5, 0.5).setRotation(-Math.PI / 2);
    this.shadow.setPosition(Player.shadowOffsetX, Player.shadowOffsetY);
    this.shadow.setScale(bodyShadowScale);
    this.shadow.setAlpha(1).setVisible(false);
    this.evolutionOverlay = this.game.add.sprite(0, 0, '').setRotation(-Math.PI / 2);
    this.evolutionOverlayShadow = this.game.add.sprite(Player.shadowOffsetX, Player.shadowOffsetY, '').setRotation(-Math.PI / 2);
    this.evolutionOverlayShadow.setAlpha(1).setVisible(false);
    this.updateEvolution();
    this.evolutionAbilityEffect = this.game.add.sprite(0, 0, '').setVisible(false);
    this.reaperMarkEffect = this.game.add.sprite(0, 0, 'reaperMark').setVisible(false);

    this.sword = this.game.add.sprite(this.effectiveBodyWidth / 2, this.effectiveBodyHeight / 2, 'playerSword').setRotation(Math.PI / 4);
    this.swordShadow = this.createBakedOutlineShadow('playerSword', 0.5, 0.5).setRotation(Math.PI / 4);
    this.swordShadow.setScale(BaseEntity.shadow.scaleMul);
    this.swordShadow.setAlpha(1).setVisible(false);
    this.swordContainer = this.game.add.container(0, 0, [this.sword]);

    this.protectionAura = this.game.add.graphics();
    const auraRadius = Math.max(this.effectiveBodyWidth, this.effectiveBodyHeight) * 0.75;
    this.protectionAura.fillStyle(0x33bbff, 0.12);
    this.protectionAura.fillCircle(0, 0, auraRadius);
    this.protectionAura.setBlendMode(Phaser.BlendModes.ADD);
    this.protectionAura.setDepth(1);
    this.protectionAura.setAlpha(0);
    this.protectionAura.setVisible(false);

    this.healthBar = new Health(this, {
      hideWhenFull: false,
      line: 0,
      offsetY: -this.effectiveBodyHeight / 2 - 40,
      isPlayer: true,
    });
    const nameY = -this.effectiveBodyHeight / 2 - 50;
    const ns = resolveNameStyle(this.name, !!this.account, 'game', !!this.account?.adSupporter)!;
    const nameTag = buildNameTag(this.name, ns, 42);
    const nameW = (nameTag as any).textWidth || 0;

    let clanText: Phaser.GameObjects.Text | null = null;
    if (this.clan) {
      clanText = this.game.add.text(0, nameY, `[${this.clan}] `);
      clanText.setFontFamily("'Saira', sans-serif");
      clanText.setFontSize(42);
      clanText.setFontStyle('700');
      clanText.setFill(CLAN_COLOR);
      clanText.setStroke('#000000', 5);
      clanText.setShadow(0, 0, '#000000', 0, false, false);
      clanText.setOrigin(0, 1);
      const total = clanText.width + nameW;
      clanText.x = -total / 2;
      clanText.y = nameY;
      nameTag.position.set(-total / 2 + clanText.width + nameW / 2, nameY);
    } else {
      nameTag.position.set(0, nameY);
    }

    this.messageText = this.game.add.text(0, -this.effectiveBodyHeight / 2 - 100, '', {
      fontFamily: "'Saira', sans-serif",
      fontStyle: '600',
      wordWrap: { width: 560, useAdvancedWrap: true },
      align: 'center',
    })
      .setFontSize(46)
      .setOrigin(0.5, 1)
      .setFill('#ffffff');


    this.cardSummaryBg = this.game.add.graphics();
    this.cardSummaryContainer = this.game.add.container(0, -this.effectiveBodyHeight / 2 - 130, [this.cardSummaryBg]);
    this.cardSummaryContainer.setAlpha(0);

    this.bodyContainer = this.game.add.container(0, 0, [this.protectionAura, this.reaperMarkEffect, this.evolutionAbilityEffect, this.swordContainer, this.body, this.evolutionOverlay]);

    const submergedRadius = this.effectiveBodyWidth * 0.6;
    this.submergedShadow = this.game.add.graphics();
    this.submergedShadow.fillStyle(0x000000, 1);
    this.submergedShadow.fillCircle(0, 0, submergedRadius);
    this.submergedShadow.setAlpha(0);

    this.container = this.game.add.container(this.shape.x, this.shape.y, [this.shadow, this.evolutionOverlayShadow, this.swordShadow, this.submergedShadow, this.bodyContainer, this.cardSummaryContainer, this.messageText]);
    this.container.addChildAt(nameTag, 6);
    if (clanText) this.container.add(clanText);

    const crestIcon = this.game.add.image(-7, 0, 'valorCrest').setDisplaySize(22, 22).setOrigin(1, 0.5);
    this.valorCrestCount = this.game.add.text(-2, 0, '', {
      fontFamily: "'Saira', sans-serif", fontSize: '18px', fontStyle: '700',
      color: '#dffcff', stroke: '#07152c', strokeThickness: 3,
    }).setOrigin(0, 0.5);
    this.valorCrestContainer = this.game.add.container(0, nameY + 38, [crestIcon, this.valorCrestCount]);
    this.valorCrestContainer.setVisible(false);
    this.container.add(this.valorCrestContainer);

    if (ogex) {
      try {
        const clearSparkle = () => {
          if (this.sparkleInterval) { clearInterval(this.sparkleInterval); this.sparkleInterval = undefined; }
        };
        this.game.events.once(Phaser.Scenes.Events.SHUTDOWN, clearSparkle);
        this.game.events.once(Phaser.Scenes.Events.DESTROY, clearSparkle);
        this.sparkleInterval = window.setInterval(() => {
          if (!this.game || !this.game.sys || !this.game.sys.events || !this.container) return;
          const fps = this.game.game.loop?.actualFps ?? 60;
          if (fps < 15) return;

          const sprite = getParticle(this.game, 'sparkleParticle');
          const rx = Phaser.Math.FloatBetween(-this.effectiveBodyWidth * 0.3, this.effectiveBodyWidth * 0.3);
          const ry = Phaser.Math.FloatBetween(-this.effectiveBodyHeight * 0.3, this.effectiveBodyHeight * 0.3);
          sprite.x = Math.round(this.container.x + rx + Phaser.Math.FloatBetween(-5, 5));
          sprite.y = Math.round(this.container.y + ry + Phaser.Math.FloatBetween(-5, 5));
          sprite.setScale(Phaser.Math.FloatBetween(0.4, 0.6))
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

    if (!Settings.unloadSkins && !this.usesDedicatedEventTextures) {
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
          const bodyKey = this.skinName + 'Body';
          const swordKey = this.skinName + 'Sword';
          if (this.game.textures.exists(bodyKey)) {
            this.body.setTexture(bodyKey);
            this.shadow.setTexture(this.createShadowTexture(bodyKey));
          }
          if (this.game.textures.exists(swordKey)) {
            this.sword.setTexture(swordKey);
            this.swordShadow.setTexture(this.createShadowTexture(swordKey));
          }
          this.updateEvolution();
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

  ensureChoosingText(): Phaser.GameObjects.Text | null {
    if (this.choosingText) return this.choosingText;
    if (!this.container) return null;
    this.choosingText = this.game.add.text(0, 0, 'Choosing an upgrade...', {
      fontFamily: 'Saira, sans-serif',
      fontSize: '60px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 6,
      align: 'center',
    }).setOrigin(0.5, 0.5).setAlpha(0);
    this.container.add(this.choosingText);
    return this.choosingText;
  }

  updateChoosingOverlay(choosing: boolean) {
    if (!choosing && !this.choosingText) return;
    const text = this.ensureChoosingText();
    if (!text) return;
    if (choosing) {
      text.setAlpha(1);
    } else {
      this.game.tweens.add({
        targets: text,
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

    const bsSequenced = ((this as any).currentUpgrades || []).includes(UpgradeTypes.Battleswords);
    if (!this.isMe || bsSequenced) {
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
    if (data.offhandRaising !== undefined && data.offhandRaising && !this.offhandRaiseStarted) {
      this.offhandRaiseStarted = true;
      this.offhandDecreaseStarted = false;
    }
    if (data.offhandDecreasing !== undefined && data.offhandDecreasing && !this.offhandDecreaseStarted) {
      this.offhandDecreaseStarted = true;
      this.offhandRaiseStarted = false;
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
    if (this.isMe && data.possibleEvolutions !== undefined) {
      this.game.hud.evolutionSelect.updateList = true;
    }
    if (this.isMe && (data.possibleUpgrades !== undefined || data.currentUpgrades !== undefined)) {
      this.game.hud.evolutionSelect.updateList = true;
    }
    if (data.chatMessage !== undefined) {
      this.updateChatMessage();
    }
    if (data.biome !== undefined) {
      const isTextWhite = data.biome === BiomeTypes.Fire || data.biome === BiomeTypes.Dirt;
      this.messageText?.setFill(isTextWhite ? '#ffffff' : '#000000');
    }

    if (data.biome !== undefined || (data.flags && data.flags[FlagTypes.RespawnShield] !== undefined)) {
      const biome = data.biome !== undefined ? data.biome : (this as any).biome;
      const hasRespawnShield = (data.flags && data.flags[FlagTypes.RespawnShield]) || ((this as any).flags && (this as any).flags[FlagTypes.RespawnShield]);
      const isProtected = (biome === BiomeTypes.Safezone) || !!hasRespawnShield;
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

      if (data.flags[FlagTypes.RadarPulse]) {
        this.radarPulseElapsed = 0;
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
      scale: 0.667,
      speed: 200,
    });
    particles.setDepth(45);
    particles.setBlendMode(Phaser.BlendModes.ADD);
    particles.once('complete', () => particles.destroy());
    this.game.time.delayedCall(2000, () => { try { if ((particles as any).scene) particles.destroy(); } catch (e) {} });
  }

  addDamagedParticles() {
    if (this.game.game.loop.actualFps < 30) return;
    try {
    const particles = this.game.add.particles(this.container.x, this.container.y, 'hitParticle', {
      maxParticles: 5,
      scale: 0.5,
      speed: 200,
    });
    particles.setDepth(45);
    particles.setBlendMode(Phaser.BlendModes.ADD);
    particles.once('complete', () => particles.destroy());
    this.game.time.delayedCall(2000, () => { try { if ((particles as any).scene) particles.destroy(); } catch (e) {} });
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
        scale: { start: 0.75, end: 0.25 },
        speed: { min: 300, max: 600 },
        lifespan: 800,
        angle: { min: 0, max: 360 },
        tint: 0xFF0000, // Red color
      });
      particles.setDepth(45);
      particles.setBlendMode(Phaser.BlendModes.ADD);
      particles.once('complete', () => particles.destroy());
    this.game.time.delayedCall(2000, () => { try { if ((particles as any).scene) particles.destroy(); } catch (e) {} });
    } catch (e) {
      console.log(e);
    }
  }

  addLightningParticles() {
    const fps = this.game.game.loop.actualFps;
    if (fps < 5) return;
    const now = Date.now();
    if (now - (this.lastLightningT || 0) < 130) return;
    this.lastLightningT = now;
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
          sprite.setScale(Phaser.Math.FloatBetween(0.8, 1.868)).setAlpha(1);

          const delay = Phaser.Math.Between(0, 80);
          this.game.tweens.add({
            targets: sprite,
            alpha: 0,
            scale: 0.0667,
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
          s.setScale(Phaser.Math.FloatBetween(0.8, 2.401))
            .setRotation(baseAngle + Phaser.Math.FloatBetween(-0.2, 0.2))
            .setAlpha(1);

          const delay = Phaser.Math.Between(0, 90);
          this.game.tweens.add({
            targets: s,
            alpha: 0,
            scale: 0.1334,
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
    if (now - this.abilityParticlesLast < 90) return;
    this.abilityParticlesLast = now;
    try {
      const count = fps < 30 ? 3 : 6;
      const R = (this.shape?.radius || this.body.displayWidth) * 1.0;
      for (let i = 0; i < count; i++) {
        const a = random(0, Math.PI * 2);
        const rad = R * random(0.7, 1.1);
        const s = getParticle(this.game, 'starParticle');
        s.setTexture('starParticle');
        s.x = this.container.x + Math.cos(a) * rad;
        s.y = this.container.y + Math.sin(a) * rad;
        s.setScale(Phaser.Math.FloatBetween(0.28, 0.45)).setAlpha(1).setDepth(45);
        this.game.tweens.add({
          targets: s,
          alpha: 0,
          scale: 0.0667,
          duration: Phaser.Math.Between(350, 520),
          onComplete: () => releaseParticle(s),
        });
      }
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
        s.setScale(Phaser.Math.FloatBetween(0.267, 0.6))
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

  upgradeParticlesLast: number = 0;

  addUpgradeParticles() {
    const fps = this.game.game.loop.actualFps;
    if (fps < 15) return;
    const now = Date.now();
    if (now - this.upgradeParticlesLast < 200) return;
    this.upgradeParticlesLast = now;
    try {
      const count = fps < 30 ? 1 : 2;
      const R = (this.shape?.radius || this.effectiveBodyWidth) * 0.95;
      for (let i = 0; i < count; i++) {
        const a = random(0, Math.PI * 2);
        const rad = R * Math.sqrt(random(0, 1));
        const r = Phaser.Math.Between(11, 19);
        const g = getGraphics(this.game);
        g.setScale(1);
        g.fillStyle(0x6dff88, 0.8);
        g.fillCircle(0, 0, r);
        g.setDepth(41);
        g.setBlendMode(Phaser.BlendModes.ADD);
        g.x = this.container.x + Math.cos(a) * rad;
        g.y = this.container.y + Math.sin(a) * rad;
        g.setAlpha(0.8);
        this.game.tweens.add({
          targets: g,
          y: g.y - random(18, 34),
          x: g.x + random(-10, 10),
          alpha: 0,
          scale: 0.7,
          duration: Phaser.Math.Between(1400, 2100),
          ease: 'Sine.easeInOut',
          onComplete: () => releaseGraphics(g),
        });
      }
    } catch (e) {
      console.log(e);
    }
  }

  private isDoubleHitSwing(): boolean {
    const c = (this as any).chosenCards || [];
    const u = (this as any).currentUpgrades || [];
    return c.includes(102) || u.includes(UpgradeTypes.Striketwice);
  }

  private sword2?: Phaser.GameObjects.Sprite;
  private swordContainer2?: Phaser.GameObjects.Container;
  private sword2Shadow?: Phaser.GameObjects.Sprite;
  private _swordVisibleForShadow = true;
  private _bsHideUntil = 0;
  updateOffhandSword(bodyAngle: number) {
    const has = ((this as any).currentUpgrades || []).includes(UpgradeTypes.Battleswords);
    if (!has) {
      if (this.swordContainer2) this.swordContainer2.setVisible(false);
      if (this.sword2Shadow) this.sword2Shadow.setVisible(false);
      return;
    }
    if (!this.sword2) {
      const tex = this.sword.texture.key;
      this.sword2 = this.game.add.sprite(this.effectiveBodyWidth / 2, -this.effectiveBodyHeight / 2, tex)
        .setRotation(-Math.PI / 4);
      this.sword2.setScale(this.sword.scaleX, -Math.abs(this.sword.scaleY));
      this.swordContainer2 = this.game.add.container(0, 0, [this.sword2]);
      this.bodyContainer.addAt(this.swordContainer2, 1);
      this.sword2Shadow = this.createBakedOutlineShadow(tex, 0.5, 0.5).setRotation(-Math.PI / 4);
      this.sword2Shadow.setScale(BaseEntity.shadow.scaleMul, -BaseEntity.shadow.scaleMul).setAlpha(1).setVisible(false);
      this.container.addAt(this.sword2Shadow, this.container.getIndex(this.swordShadow));
    }
    const swingAngle = (this as any).swordSwingArc || this.swordSwingAngle;
    let rot2 = -swingAngle * this.offhandLerpProgress;
    if (this.wideSwing) rot2 -= Math.PI / 4;
    this.swordContainer2!.setVisible(this.sword.visible);
    this.swordContainer2!.setRotation(rot2);
    if (this.sword2Shadow) {
      const sx = this.effectiveBodyWidth / 2;
      const sy = -this.effectiveBodyHeight / 2;
      const cos1 = Math.cos(rot2), sin1 = Math.sin(rot2);
      const rx = sx * cos1 - sy * sin1, ry = sx * sin1 + sy * cos1;
      const cos2 = Math.cos(bodyAngle), sin2 = Math.sin(bodyAngle);
      this.sword2Shadow.setPosition(
        rx * cos2 - ry * sin2 + Player.shadowOffsetX,
        rx * sin2 + ry * cos2 + Player.shadowOffsetY
      );
      this.sword2Shadow.setRotation(bodyAngle + rot2 - Math.PI / 4);
      this.sword2Shadow.setVisible(false);
    }
  }

  private fieldAura?: Phaser.GameObjects.Graphics;
  updateUpgradeFields() {
    const ups: number[] = (this as any).currentUpgrades || [];
    const lava = ups.includes(UpgradeTypes.Lavacopy);
    const pacifist = ups.includes(UpgradeTypes.Pacifist);
    if (!lava && !pacifist) { if (this.fieldAura) this.fieldAura.setVisible(false); return; }
    if (!this.fieldAura) {
      this.fieldAura = this.game.add.graphics();
      try { this.bodyContainer.addAt(this.fieldAura, 0); } catch (e) { this.bodyContainer.add(this.fieldAura); }
    }
    const r = Math.max(this.effectiveBodyWidth, this.effectiveBodyHeight) * 0.85;
    const color = lava ? 0xff5522 : 0x33dd66;
    this.fieldAura.setVisible(true).clear();
    this.fieldAura.fillStyle(color, 0.32);
    this.fieldAura.fillCircle(0, 0, r);
  }

  private blindStart = 0;
  updateBlindnessVignette() {
    const blinded = !!(this.flags && this.flags[FlagTypes.Blinded]);
    if (blinded) this.blindStart = Date.now();
    if (this.blindStart === 0) { screenEffectsRuntime.blind = 0; return; }
    const t = Math.max(0, 1 - (Date.now() - this.blindStart) / 2000);
    if (t <= 0) { this.blindStart = 0; screenEffectsRuntime.blind = 0; return; }
    screenEffectsRuntime.blind = t;
  }

  updateEvolution() {
    if (!this.evolutionOverlay) return;

    const evolutionClass = Evolutions[this.evolution];
    if (!evolutionClass) {
      this.evolutionOverlay.setVisible(false);
      this.evoShadowActive = false;
    } else {
      this.evolutionOverlay.setVisible(true);
      this.evolutionOverlay.setTexture(evolutionClass[1]);
      this.evolutionOverlay.setOrigin(evolutionClass[3][0], evolutionClass[3][1]);
      this.evolutionOverlay.setScale(this.effectiveBodyWidth / this.evolutionOverlay.width * evolutionClass[2]);

      if (this.evolutionOverlayShadow) {
        const shadowKey = this.createShadowTexture(evolutionClass[1]);
        this.evolutionOverlayShadow.setTexture(shadowKey);
        this.evolutionOverlayShadow.setOrigin(evolutionClass[3][0], evolutionClass[3][1]);
        this.evolutionOverlayShadow.setScale(this.effectiveBodyWidth / this.evolutionOverlayShadow.width * evolutionClass[2] * BaseEntity.shadow.scaleMul);
        this.evoShadowActive = true;
      }
    }
  }

  ensureBishopVisuals() {
    if (!this.container || this.bishopCannon || !this.game.textures.exists('bishopCannon')) return;
    this.bishopCannon = this.game.add.sprite(0, 0, 'bishopCannon')
      .setOrigin(0.18, 0.5)
      .setDisplaySize(this.effectiveBodyWidth * 1.35, this.effectiveBodyWidth * 0.42)
      .setVisible(false);
    this.bishopChakramContainer = this.game.add.container(0, 0).setVisible(false);
    for (let index = 0; index < bishopChakramCount; index++) {
      const chakram = this.game.add.sprite(0, 0, 'bishopChakram')
        .setDisplaySize(this.effectiveBodyWidth * 0.24, this.effectiveBodyWidth * 0.24);
      this.bishopChakramContainer.add(chakram);
      this.bishopChakrams.push(chakram);
    }
    const insertAt = Math.max(0, this.container.length - 2);
    this.container.addAt(this.bishopCannon, insertAt);
    this.container.addAt(this.bishopChakramContainer, insertAt + 1);
  }

  nearestBishopVisualTarget() {
    let best: any = null;
    let bestDistance = Infinity;
    const seen = new Set<number>();
    const inspect = (entry: any) => {
      const entity = entry?.gameWorldEntity || entry;
      if (!entity || entity === this || entity.id === this.id || entity.removed
        || !bishopTargetTypes.has(entity.type) || !entity.container || seen.has(entity.id)) return;
      seen.add(entity.id);
      const dx = entity.container.x - this.container.x;
      const dy = entity.container.y - this.container.y;
      const distance = dx * dx + dy * dy;
      if (distance < bestDistance) {
        best = entity;
        bestDistance = distance;
      }
    };
    Object.values(this.game.gameState.entities).forEach(inspect);
    Object.values(this.game.gameState.globalEntities).forEach(inspect);
    return best;
  }

  updateBishopEffects() {
    const isBishop = this.evolution === EvolutionTypes.Bishop;
    const isArsenal = this.evolution === EvolutionTypes.Arsenal;
    if (!isBishop && !isArsenal) {
      this.bishopCannon?.setVisible(false);
      this.bishopChakramContainer?.setVisible(false);
      return;
    }
    this.ensureBishopVisuals();
    if (!this.bishopCannon || !this.bishopChakramContainer) return;

    const cannonKey = isArsenal ? 'arsenalCannon' : 'bishopCannon';
    const chakramKey = isArsenal ? 'arsenalChakram' : 'bishopChakram';
    if (this.bishopCannon.texture.key !== cannonKey) this.bishopCannon.setTexture(cannonKey);
    this.bishopCannon.setDisplaySize(
      this.effectiveBodyWidth * (isArsenal ? 1.48 : 1.35),
      this.effectiveBodyWidth * (isArsenal ? 0.48 : 0.42),
    );
    for (const chakram of this.bishopChakrams) {
      if (chakram.texture.key !== chakramKey) chakram.setTexture(chakramKey);
      chakram.setDisplaySize(
        this.effectiveBodyWidth * (isArsenal ? 0.27 : 0.24),
        this.effectiveBodyWidth * (isArsenal ? 0.27 : 0.24),
      );
    }

    const chakramsActive = !!this.abilityActive;
    this.bishopCannon.setVisible(!chakramsActive);
    this.bishopChakramContainer.setVisible(chakramsActive);
    if (!chakramsActive) {
      const target = this.nearestBishopVisualTarget();
      const angle = target
        ? Math.atan2(target.container.y - this.container.y, target.container.x - this.container.x)
        : (this.angleLerp || 0);
      this.bishopCannon.setRotation(angle);
      return;
    }

    const radius = this.effectiveBodyWidth * (isArsenal ? 1.30 : 1.23);
    const spin = Date.now() / 1000 * 2.8;
    for (let index = 0; index < this.bishopChakrams.length; index++) {
      const angle = spin + index / bishopChakramCount * Math.PI * 2;
      const chakram = this.bishopChakrams[index];
      chakram.setPosition(Math.cos(angle) * radius, Math.sin(angle) * radius);
      chakram.setRotation(angle * 2.4);
    }
    this.bishopChakramContainer.setRotation(-spin * 0.2);
  }

  updateEvolutionAbilityVisual() {
    if (!this.evolutionAbilityEffect) return;
    const isPhasing = this.abilityActive
      && (this.evolution === EvolutionTypes.Phantom || this.evolution === EvolutionTypes.Wraith);
    const isHealing = this.abilityActive
      && (this.evolution === EvolutionTypes.Medic || this.evolution === EvolutionTypes.Seraph);
    const isExecuting = this.abilityActive && this.evolution === EvolutionTypes.Reaper;
    const visualActive = !!(isPhasing || isHealing || isExecuting);
    if (visualActive && !this.abilityVisualWasActive) this.abilityVisualStarted = Date.now();
    this.abilityVisualWasActive = visualActive;

    if (isPhasing) {
      const wraith = this.evolution === EvolutionTypes.Wraith;
      const key = wraith ? 'wraithPhase' : 'phantomPhase';
      if (this.evolutionAbilityEffect.texture.key !== key) this.evolutionAbilityEffect.setTexture(key);
      this.evolutionAbilityEffect
        .setVisible(true)
        .setDisplaySize(this.effectiveBodyWidth * (wraith ? 1.95 : 1.78), this.effectiveBodyWidth * (wraith ? 1.95 : 1.78))
        .setRotation(Date.now() / 1000 * (wraith ? -1.35 : 1.1))
        .setAlpha(this.isMe ? 0.78 : 0.10);
      const bodyAlpha = this.isMe ? 0.34 : 0.055;
      this.body.setAlpha(bodyAlpha);
      this.evolutionOverlay.setAlpha(bodyAlpha);
      this.sword.setAlpha(this.isMe ? 0.18 : 0.03);
      this.shadowRT?.setAlpha(BaseEntity.shadow.alpha * (this.isMe ? 0.16 : 0.02));
      return;
    }

    this.body.setAlpha(1);
    this.evolutionOverlay.setAlpha(1);
    this.sword.setAlpha(1);
    this.shadowRT?.setAlpha(BaseEntity.shadow.alpha * (1 - this._submergedProgress));
    if (isHealing) {
      const seraph = this.evolution === EvolutionTypes.Seraph;
      const key = seraph ? 'seraphPulse' : 'medicPulse';
      if (this.evolutionAbilityEffect.texture.key !== key) this.evolutionAbilityEffect.setTexture(key);
      const total = seraph ? 600 : 450;
      const progress = Phaser.Math.Clamp((Date.now() - this.abilityVisualStarted) / total, 0, 1);
      const size = this.effectiveBodyWidth * (0.72 + progress * (seraph ? 2.15 : 1.65));
      this.evolutionAbilityEffect
        .setVisible(true)
        .setDisplaySize(size, size)
        .setRotation(seraph ? Date.now() / 1000 * 0.8 : 0)
        .setAlpha((1 - progress) * 0.92);
      return;
    }
    if (isExecuting) {
      if (this.evolutionAbilityEffect.texture.key !== 'reaperExecution') {
        this.evolutionAbilityEffect.setTexture('reaperExecution');
      }
      const pulse = 0.94 + Math.sin(Date.now() / 90) * 0.08;
      this.evolutionAbilityEffect
        .setVisible(true)
        .setDisplaySize(this.effectiveBodyWidth * 2.05 * pulse, this.effectiveBodyWidth * 2.05 * pulse)
        .setRotation(-Date.now() / 1000 * 1.6)
        .setAlpha(0.88);
      return;
    }
    this.evolutionAbilityEffect.setVisible(false);
  }

  updateReaperMarkVisual() {
    if (!this.reaperMarkEffect) return;
    const markedBy = this.flags && this.flags[FlagTypes.ReaperMarked];
    const marked = markedBy !== false && markedBy !== undefined && markedBy !== null;
    if (!marked) {
      this.reaperMarkEffect.setVisible(false);
      return;
    }
    const pulse = 1 + Math.sin(Date.now() / 135) * 0.07;
    this.reaperMarkEffect
      .setVisible(true)
      .setDisplaySize(this.effectiveBodyWidth * 1.7 * pulse, this.effectiveBodyWidth * 1.7 * pulse)
      .setRotation(Date.now() / 1000 * 0.9)
      .setAlpha(0.9);
  }

  interpolate(dt: number) {
    const swordLerpDt = dt / (this.swordSwingDuration * 1000);
    if (this.swordRaiseStarted) {
      this.swordLerpProgress += swordLerpDt;
      if (this.swordLerpProgress >= 1) {
        this.swordLerpProgress = 1;
        this.swordRaiseStarted = false;
        if (this.isMe && this.game.controls.isInputUp(InputTypes.SwordSwing)) {
          this.swordDecreaseStarted = true;
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
    const offhandLerpDt = dt / (this.swordSwingDuration * 1000);
    if (this.offhandRaiseStarted) {
      this.offhandLerpProgress += offhandLerpDt;
      if (this.offhandLerpProgress >= 1) { this.offhandLerpProgress = 1; this.offhandRaiseStarted = false; }
    } else if (this.offhandDecreaseStarted) {
      this.offhandLerpProgress -= offhandLerpDt;
      if (this.offhandLerpProgress <= 0) { this.offhandLerpProgress = 0; this.offhandDecreaseStarted = false; }
    }
    if (this.isMe && this.swordFlying) {
      this.swordRaiseStarted = false;
      this.swordDecreaseStarted = false;
      this.swordLerpProgress = 0;
    }

    if (!this.isMe) {
      this.angleLerp = Math.min(this.angleLerp + dt / 120, 1);
      this.rotateBody(Phaser.Math.Angle.RotateTo(this.previousAngle, this.angle, this.angleLerp));
    }
  }

  rotateBody(angle: number) {
    const evolutionClass = Evolutions[this.evolution];
    const swingAngle = (this as any).swordSwingArc || this.swordSwingAngle;
    let swingProg = this.swordLerpProgress;
    if (this.swordDecreaseStarted && this.isDoubleHitSwing()) {
      const q = 1 - this.swordLerpProgress;
      if (q < 0.30) swingProg = 1 - (q / 0.30) * 0.85;
      else if (q < 0.62) swingProg = 0.15 + ((q - 0.30) / 0.32) * 0.85;
      else swingProg = 1 - (q - 0.62) / 0.38;
    }
    let swordRotation = swingAngle * swingProg;
    if (this.wideSwing) {
      swordRotation += Math.PI / 4;
    }
    if (this.evolution && evolutionClass[0] === "Rammer" && this.swordFlying) {
      return;
    }
    this.swordContainer.setRotation(swordRotation);
    this.updateOffhandSword(angle);
    this.bodyContainer.setRotation(angle);
    if (this.shadow) {
      this.shadow.setRotation(angle - Math.PI / 2);
    }
    if (this.evolutionOverlayShadow && this.evoShadowActive) {
      this.evolutionOverlayShadow.setRotation(angle - Math.PI / 2);
    }
    if (this.swordShadow) {
      const sx = this.effectiveBodyWidth / 2;
      const sy = this.effectiveBodyHeight / 2;
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

  predictSwingStart() {
    if (((this as any).currentUpgrades || []).includes(UpgradeTypes.Battleswords)) return;
    if (this.game.controls.isInputDown(InputTypes.SwordSwing)) {
      if (!(this.swordFlying || this.swordRaiseStarted || this.swordDecreaseStarted)) {
        this.swordRaiseStarted = true;
        this.game.controls.disableKeys([InputTypes.SwordThrow], true);
      }
    }
  }

  updatePrediction() {
    const isHypnotized = !!(this.flags && this.flags[FlagTypes.Hypnotized]);

    this.predictSwingStart();

    if (isHypnotized) {
      this.game.gameState.playerAngle = this.angle;
      this.rotateBody(this.angle);
      return;
    }

    let angle: number;
    if (this.game.isMobile) {
      const a = this.game.controls.aim;
      if (a && a.force > 0) this.localAimAngle = a.angle;
      angle = typeof this.localAimAngle === 'number'
        ? this.localAimAngle
        : (typeof this.angle === 'number' ? this.angle : 0);
    } else if ((this.game as any)._isZooming) {
      const pointer = this.game.input.activePointer;
      const camera = this.game.cameras.main;
      angle = Math.atan2(pointer.y - camera.height / 2, pointer.x - camera.width / 2);
    } else {
      const pointer = this.game.input.activePointer;
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
      if (biome.type === BiomeTypes.River) {
        if (this.biomeContains(biome, wx, wy)) return true;
        continue;
      }
      if (biome.type === BiomeTypes.Safezone || biome.type === BiomeTypes.TutorialZone) continue;
      if (this.biomeContains(biome, wx, wy)) return false;
    }
    return true;
  }

  private biomeContains(biome: any, wx: number, wy: number): boolean {
    const shape = biome.shape;
    if (!shape) return false;
    if (shape.type === ShapeTypes.Circle) {
      const dx = wx - shape.x;
      const dy = wy - shape.y;
      return dx * dx + dy * dy <= shape.radius * shape.radius;
    }
    if (shape.type === ShapeTypes.Polygon) {
      if (shape.polygonBounds && !Phaser.Geom.Rectangle.Contains(shape.polygonBounds, wx, wy)) return false;
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
      return inside;
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
    if (!this.isPointInRiver(wx, wy)) return false;

    const borderWidth = 240;
    const borderWidthSq = borderWidth * borderWidth;
    const biomes = this.game.gameState.gameMap.biomes;
    for (let i = 0; i < biomes.length; i++) {
      const biome = biomes[i];
      if (biome.type === BiomeTypes.River
        || biome.type === BiomeTypes.Safezone
        || biome.type === BiomeTypes.TutorialZone) continue;
      const shape = biome.shape as any;
      if (shape.type === ShapeTypes.Circle) {
        const dx = wx - shape.x;
        const dy = wy - shape.y;
        const d = Math.sqrt(dx * dx + dy * dy) - shape.radius;
        if (d < borderWidth) return false;
      } else if (shape.type === ShapeTypes.Polygon) {
        if (shape.polygonBounds) {
          const b = shape.polygonBounds as Phaser.Geom.Rectangle;
          const bdx = wx < b.x ? b.x - wx : wx > b.right ? wx - b.right : 0;
          const bdy = wy < b.y ? b.y - wy : wy > b.bottom ? wy - b.bottom : 0;
          if (bdx * bdx + bdy * bdy > borderWidthSq) continue;
        }
        const points = shape.points;
        const ox = shape.x;
        const oy = shape.y;
        for (let j = 0; j < points.length; j++) {
          const k = (j + 1) % points.length;
          const ax = ox + points[j].x, ay = oy + points[j].y;
          const bx = ox + points[k].x, by = oy + points[k].y;
          const edx = bx - ax, edy = by - ay;
          const lenSq = edx * edx + edy * edy;
          const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((wx - ax) * edx + (wy - ay) * edy) / lenSq));
          const px = ax + t * edx, py = ay + t * edy;
          const ddx = wx - px, ddy = wy - py;
          if (ddx * ddx + ddy * ddy < borderWidthSq) return false;
        }
      }
    }
    return true;
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

    if (this.shadowRT) {
      this.shadowRT.setAlpha(BaseEntity.shadow.alpha * (1 - this._submergedProgress));
    }
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
        fontFamily: 'Saira, sans-serif',
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

    if (!this.isMe) {
      const isTutorial = (this as any).isTutorial;
      if (isTutorial) {
        const text = this.ensureChoosingText();
        if (text) {
          text.setText('In Tutorial');
          text.setAlpha(1);
        }
      } else if (this.choosingText) {
        this.choosingText.setAlpha(0);
      }
    }

    this.updateCardSummary();
    const crests = Math.max(0, Math.floor(Number(this.valorCrests) || 0));
    this.valorCrestContainer?.setVisible(crests > 0);
    if (crests > 0 && this.valorCrestCount?.text !== String(crests)) this.valorCrestCount?.setText(String(crests));

    const ups = ((this as any).currentUpgrades || []);
    const throwHidesSword = ups.includes(UpgradeTypes.Battleswords) || ups.includes(UpgradeTypes.Kunais);
    if (throwHidesSword && this.flags?.[FlagTypes.SwordThrow]) this._bsHideUntil = Date.now() + 900;
    const bsThrowing = throwHidesSword && Date.now() < (this._bsHideUntil || 0);
    const swordVisible = !this.swordFlying && !bsThrowing;
    this._swordVisibleForShadow = swordVisible;
    if (this._lastSwordVisible !== swordVisible) {
      this.sword.setVisible(swordVisible);
      this._lastSwordVisible = swordVisible;
    }
    const newScale = (this.shape.radius * 2) / this.effectiveBodyWidth;
    if (this._lastContainerScale !== newScale) {
      this.container.scale = newScale;
      this._lastContainerScale = newScale;
    }
    const baseX = this.effectiveBodyWidth / 2;
    const baseY = this.effectiveBodyHeight / 2;
    if (this._lastSwordScale !== 1) {
      this.sword.setScale(1);
      if (this.swordShadow) this.swordShadow.setScale(BaseEntity.shadow.scaleMul);
      this._lastSwordScale = 1;
    }
    if (this._lastSwordLocalPullback !== 0) {
      this.sword.setPosition(baseX, baseY);
      this._lastSwordLocalPullback = 0;
    }

    if (this.isMe) this.predictSwingStart();
    this.interpolate(dt);
    this.updateBishopEffects();
    this.updateEvolutionAbilityVisual();
    this.updateReaperMarkVisual();

    if (this.abilityActive) {
      if (this.evolution) {
        const evolutionClass = Evolutions[this.evolution];
        if (evolutionClass[0] !== 'Stalker' && evolutionClass[0] !== 'Juggernaut'
          && evolutionClass[0] !== 'Phantom' && evolutionClass[0] !== 'Wraith'
          && evolutionClass[0] !== 'Medic' && evolutionClass[0] !== 'Seraph'
          && evolutionClass[0] !== 'Reaper') {
          this.addAbilityParticles();
        }
      } else {
        this.addAbilityParticles();
      }
     }
    if (this.flags && this.flags[FlagTypes.Upgraded]) {
      this.addUpgradeParticles();
    }
    this.updateUpgradeFields();
    if (this.isMe) this.updateBlindnessVignette();
    this.submergedAccum += dt;
    const submergeInterval = this.isMe ? 100 : 200;
    if (this.submergedAccum >= submergeInterval) {
      this.updateSubmergedEffect(this.submergedAccum);
      this.submergedAccum = 0;
    }
    this.updateDiscoEffects(dt);
    this.updateTrackerEffects(dt);
    this.updateSilencedEffect();
    if (this.following) {
      const cam: any = this.game.cameras.main;
      this.game.cameras.main.centerOn(
        this.container.x + (cam.mouseOffsetX || 0),
        this.container.y + (cam.mouseOffsetY || 0),
      );
    }
    if (this.isMe) {
      this.updatePrediction();
    }

    if (this.container) {
      if (!this.footsteps) this.footsteps = new FootstepTrail(this);
      this.footsteps.update(dt);
    }

    this.updateShadowRT();
  }

  private updateShadowRT() {
    if (!this.container) return;
    const on = BaseEntity.livingShadowsEnabled;

    const v = this.game.cameras.main.worldView;
    const cx = this.container.x, cy = this.container.y;
    const m = 600;
    const offCamera = cx < v.x - m || cx > v.right + m || cy < v.y - m || cy > v.bottom + m;

    let rt = this.shadowRT;
    if (!rt) {
      if (!on || offCamera) return;
      const fullSize = Math.ceil(Math.max(this.body.width, this.body.height) * 3.2);
      const rtSize = Math.min(1024, Math.ceil(fullSize / 2));
      rt = this.shadowRT = this.game.add.renderTexture(0, 0, rtSize, rtSize).setOrigin(0.5, 0.5);
      (rt as any).renderScale = rtSize / fullSize;
      (rt as any).shadowFullSize = fullSize;
      rt.setScale(fullSize / rtSize);
      rt.setAlpha(BaseEntity.shadow.alpha * (1 - this._submergedProgress));
      this.container.addAt(rt, 0);
    }

    if (rt.visible !== on) rt.setVisible(on);
    if (!on) return;
    if (offCamera) return;

    const evr = this.evoShadowActive ? Math.round(this.evolutionOverlayShadow.rotation * 25) : 0;
    const sig = Math.round(this.shadow.rotation * 25)
      + ((this.shadow.x / 2) | 0) * 7 + ((this.shadow.y / 2) | 0) * 13
      + Math.round(this.swordShadow.rotation * 25) * 17
      + ((this.swordShadow.x / 2) | 0) * 23 + ((this.swordShadow.y / 2) | 0) * 29
      + Math.round(this.swordShadow.scaleX * 100) * 37
      + (this.evoShadowActive ? 1 : 0) * 1000003
      + (this.swordFlying ? 1 : 0) * 1000033
      + (this._swordVisibleForShadow ? 0 : 900007)
      + (this.sword2Shadow && this.swordContainer2?.visible
          ? Math.round((this.sword2Shadow.rotation || 0) * 25) * 43 + (((this.sword2Shadow.x / 2) | 0)) * 47 : 0)
      + evr * 41;
    if (sig === this.shadowSig) return;
    const now = performance.now();
    if (now < this.shadowRTNextAt) return;
    this.shadowSig = sig;
    this.shadowRTNextAt = now + 33;

    const full = (rt as any).shadowFullSize || rt.width;
    const ox = full / 2, oy = full / 2;
    rt.beginDraw();
    rt.batchDraw(this.shadow, ox + this.shadow.x, oy + this.shadow.y);
    if (this.evoShadowActive) {
      rt.batchDraw(this.evolutionOverlayShadow, ox + this.evolutionOverlayShadow.x, oy + this.evolutionOverlayShadow.y);
    }
    if (this.sword2Shadow && this.swordContainer2?.visible && this._swordVisibleForShadow) {
      rt.batchDraw(this.sword2Shadow, ox + this.sword2Shadow.x, oy + this.sword2Shadow.y);
    }
    if (this._swordVisibleForShadow) {
      rt.batchDraw(this.swordShadow, ox + this.swordShadow.x, oy + this.swordShadow.y);
    }
    rt.endDraw();
  }
  private shadowSig = NaN;
  private shadowRTNextAt = 0;

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

  updateTrackerEffects(dt: number) {
    const zoneActive = this.isMe && this.evolution === EvolutionTypes.Tracker && !!this.container;
    if (zoneActive) {
      if (!this.trackerZoneGraphic) {
        const g = this.game.add.graphics();
        g.setDepth(2);
        g.lineStyle(10, 0xff2222, 0.55);
        const R = Player.trackerZoneRadius;
        const dashes = 48;
        for (let i = 0; i < dashes; i++) {
          const a0 = (i / dashes) * Math.PI * 2;
          g.beginPath();
          g.moveTo(Math.cos(a0) * R, Math.sin(a0) * R);
          g.arc(0, 0, R, a0, a0 + (Math.PI * 2 / dashes) * 0.55);
          g.strokePath();
        }
        this.trackerZoneGraphic = g;
      }
      this.trackerZoneGraphic.rotation += dt * 0.00005;
      this.trackerZoneGraphic.setPosition(this.container.x, this.container.y);
      this.trackerZoneGraphic.setVisible(true);
    } else if (this.trackerZoneGraphic) {
      this.trackerZoneGraphic.setVisible(false);
    }

    if (this.radarPulseElapsed >= 0 && this.container) {
      const duration = 2000;
      if (this.radarPulseElapsed === 0) this.radarSweepAngle = -Math.PI / 2;
      this.radarPulseElapsed += dt;
      const t = this.radarPulseElapsed / duration;
      if (!this.radarPulseGraphic) {
        this.radarPulseGraphic = this.game.add.graphics();
        this.radarPulseGraphic.setDepth(3);
      }
      const g = this.radarPulseGraphic;
      g.clear();
      if (t >= 1) {
        g.setVisible(false);
        this.radarPulseElapsed = -1;
      } else {
        const R = Player.trackerZoneRadius;
        const fade = 1 - t * 0.5;

        const pulseR = Math.max(30, R * t);
        g.fillStyle(0xff2222, 0.3 * (1 - t) * fade);
        g.fillCircle(0, 0, pulseR);

        this.radarSweepAngle += dt * (Math.PI * 2 / duration);
        g.lineStyle(5, 0xff3333, 0.6 * fade);
        g.lineBetween(0, 0, Math.cos(this.radarSweepAngle) * R, Math.sin(this.radarSweepAngle) * R);

        g.setPosition(this.container.x, this.container.y);
        g.setVisible(true);
      }
    }
  }

  updateSilencedEffect() {
    const silenced = !!(this.flags && this.flags[FlagTypes.Silenced]);
    if (silenced === this._lastSilenced) return;
    this._lastSilenced = silenced;
    if (!this.sword) return;
    if (silenced) {
      this.sword.setTint(0x555555);
      if (this.isMe) {
        this.game.hud.showAnnouncement("Silenced! You can't attack", '#cc66ff', 1500, 0.5, true);
      }
    } else {
      this.sword.clearTint();
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
      if (this.trackerZoneGraphic) this.trackerZoneGraphic.destroy();
      if (this.radarPulseGraphic) this.radarPulseGraphic.destroy();
    } catch (e) {}
  }
}

export default Player;
