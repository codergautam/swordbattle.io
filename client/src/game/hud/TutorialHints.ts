import HudComponent from './HudComponent';
import { BiomeTypes, EntityTypes } from '../Types';

const storageKey = 'swordbattle:tutorialProgress';
const devMode = false;
const isMobile = () => /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

interface HintProgress {
  controlsShown: boolean;
  leaveShown: boolean;
  coinInfoShown: boolean;
  chestShown: boolean;
  mobShown: boolean;
  fightShown: boolean;
  evolutionShown: boolean;
  biomeShown: boolean;
  captureZoneShown: boolean;
  complete: boolean;
}

function loadProgress(): HintProgress {
  if (devMode) return freshProgress();
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) return { ...freshProgress(), ...JSON.parse(raw) };
  } catch (e) {}
  return freshProgress();
}

function freshProgress(): HintProgress {
  return {
    controlsShown: false,
    leaveShown: false,
    coinInfoShown: false,
    chestShown: false,
    mobShown: false,
    fightShown: false,
    evolutionShown: false,
    biomeShown: false,
    captureZoneShown: false,
    complete: false,
  };
}

function saveProgress(p: HintProgress): void {
  if (devMode) return;
  try { localStorage.setItem(storageKey, JSON.stringify(p)); } catch (e) {}
}

class TutorialHints extends HudComponent {
  hintText!: Phaser.GameObjects.Text;
  arrowSprite!: Phaser.GameObjects.Triangle;
  progress: HintProgress;
  currentHint: string | null = null;
  hintTimer = 0;
  hintDuration = 0;
  fadingOut = false;
  playTime = 0;
  lastCoins = -1;
  playerActive = false;
  hudVisible = false;
  arrowWorldTarget: { x: number; y: number } | null = null;

  constructor(hud: any) {
    super(hud);
    this.progress = loadProgress();
  }

  initialize() {
    if (!this.hud.scene) return;

    this.hintText = this.hud.scene.add.text(0, 0, '', {
      fontSize: 22,
      fontFamily: 'Ubuntu, sans-serif',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 5,
      align: 'center',
      wordWrap: { width: 600 },
    }).setOrigin(0.5).setAlpha(0);

    this.arrowSprite = this.hud.scene.add.triangle(0, -40, 0, -24, -6, 8, 6, 8, 0xffd700);
    this.arrowSprite.setOrigin(0.5, 0.5).setAlpha(0).setStrokeStyle(2, 0x000000);

    this.container = this.hud.scene.add.container(0, 0, [this.arrowSprite, this.hintText]);
    this.container.setDepth(200);
    this.hud.add(this.container);
  }

  resize() {
    if (!this.container) return;
    const { width, height } = this.game.scale;
    this.container.x = width / 2;
    this.container.y = height - 150 * this.scale;
  }

  showHint(text: string, duration: number, pointAtWorld?: { x: number; y: number }) {
    if (this.currentHint === text) return;
    this.currentHint = text;
    this.hintText.setText(text);
    this.hintTimer = 0;
    this.hintDuration = duration;
    this.fadingOut = false;
    this.hintText.setAlpha(0);
    this.arrowWorldTarget = pointAtWorld || null;

    if (pointAtWorld) {
      this.updateArrowRotation(pointAtWorld);
      this.arrowSprite.setAlpha(0);
    } else {
      this.arrowSprite.setAlpha(0);
    }

    this.hud.scene!.tweens.add({
      targets: this.hintText,
      alpha: 1,
      duration: 200,
    });
    if (pointAtWorld) {
      this.hud.scene!.tweens.add({
        targets: this.arrowSprite,
        alpha: 1,
        duration: 200,
      });
    }
  }

  hideHint() {
    if (!this.currentHint || this.fadingOut) return;
    this.fadingOut = true;
    this.hud.scene!.tweens.add({
      targets: [this.hintText, this.arrowSprite],
      alpha: 0,
      duration: 300,
      onComplete: () => {
        this.currentHint = null;
        this.arrowWorldTarget = null;
        this.fadingOut = false;
      },
    });
  }

  private updateArrowRotation(worldTarget: { x: number; y: number }) {
    const player = this.game.gameState.self.entity;
    if (!player?.shape) return;
    const dx = worldTarget.x - player.shape.x;
    const dy = worldTarget.y - player.shape.y;
    this.arrowSprite.setRotation(Math.atan2(dy, dx) + Math.PI / 2);
  }

  update(dt: number) {
    if (!this.container) return;
    if (!devMode && this.progress.complete) return;

    const player = this.game.gameState.self.entity;
    if (!player) {
      if (this.playerActive) {
        this.playerActive = false;
        this.hudVisible = false;
        this.playTime = 0;
        this.lastCoins = -1;
        this.currentHint = null;
        this.fadingOut = false;
        this.arrowWorldTarget = null;
        this.hintText.setAlpha(0);
        this.arrowSprite.setAlpha(0);
      }
      return;
    }

    if (!this.playerActive) {
      this.playerActive = true;
      this.hudVisible = false;
      this.playTime = 0;
      this.lastCoins = -1;
      if (devMode) this.progress = loadProgress();
    }

    if (!this.hudVisible) {
      if (this.container.alpha > 0.5) {
        this.hudVisible = true;
        this.playTime = 0;
      } else {
        return;
      }
    }

    this.playTime += dt / 1000;

    if (this.arrowWorldTarget && this.currentHint && !this.fadingOut) {
      this.updateArrowRotation(this.arrowWorldTarget);
      this.arrowSprite.setScale(0.85 + Math.sin(this.playTime * 4) * 0.15);
    }

    if (this.currentHint && !this.fadingOut) {
      this.hintTimer += dt / 1000;
      if (this.hintTimer >= this.hintDuration) {
        this.hideHint();
      }
    }

    if (this.currentHint) return;

    const mobile = isMobile();
    const coins = player.coins ?? 0;

    if (!this.progress.controlsShown && this.playTime < 8) {
      this.progress.controlsShown = true;
      saveProgress(this.progress);
      if (mobile) {
        this.showHint('Tap to swing your sword! Use the Throw button to throw it from afar.', 4);
      } else {
        this.showHint('Space or Click to swing | Right-Click or C to throw your sword!', 4);
      }
      return;
    }

    if (!this.progress.leaveShown && this.progress.controlsShown && player.biome === BiomeTypes.Safezone) {
      this.progress.leaveShown = true;
      saveProgress(this.progress);
      const forestDir = { x: player.shape.x - 2000, y: player.shape.y };
      this.showHint('Leave the safezone! Head left to the Forest, it\'s the safest biome to start.', 6, forestDir);
      return;
    }
    if (!this.progress.leaveShown && player.biome !== BiomeTypes.Safezone) {
      this.progress.leaveShown = true;
      saveProgress(this.progress);
    }

    if (!this.progress.coinInfoShown) {
      const currentCoins = coins;
      if (this.lastCoins >= 0 && currentCoins > this.lastCoins) {
        this.progress.coinInfoShown = true;
        saveProgress(this.progress);
        this.showHint('Coins make you bigger and stronger! Collect enough to unlock Evolutions.', 5);
        this.lastCoins = currentCoins;
        return;
      }
      if (this.lastCoins < 0) this.lastCoins = currentCoins;
      else this.lastCoins = currentCoins;
    }

    if (!this.progress.chestShown && player.shape) {
      const chest = this.findNearest(EntityTypes.Chest, player, 2000);
      if (chest) {
        this.progress.chestShown = true;
        saveProgress(this.progress);
        this.showHint('Break that chest! Chests are the fastest way to get coins, huge ones can drop thousands!', 6, chest);
        return;
      }
    }

    if (!this.progress.mobShown && player.shape) {
      const mobTypes = [EntityTypes.Wolf, EntityTypes.Cat, EntityTypes.Bunny, EntityTypes.Moose];
      for (const t of mobTypes) {
        const mob = this.findNearest(t, player, 1500);
        if (mob) {
          this.progress.mobShown = true;
          saveProgress(this.progress);
          this.showHint('Kill mobs for coins! Each biome also has bosses, they drop tons but fight back hard.', 5, mob);
          return;
        }
      }
    }

    if (!this.progress.fightShown && coins >= 500) {
      this.progress.fightShown = true;
      saveProgress(this.progress);
      this.showHint('Your shield is gone! Other players can attack you now, but you can run away if you don\'t want to fight!', 5);
      return;
    }

    if (!this.progress.evolutionShown && player.possibleEvolutions && Object.keys(player.possibleEvolutions).length > 0) {
      this.progress.evolutionShown = true;
      saveProgress(this.progress);
      if (mobile) {
        this.showHint('You unlocked Evolutions! Pick one at the top, use the Ability button for its special power!', 7);
      } else {
        this.showHint('You unlocked Evolutions! Pick one at the top, each comes with a special Ability and other powers!!', 7);
      }
      return;
    }

    if (!this.progress.biomeShown && player.biome && player.biome !== BiomeTypes.Safezone && player.biome !== BiomeTypes.Earth) {
      this.progress.biomeShown = true;
      saveProgress(this.progress);
      const names: Record<number, string> = {
        [BiomeTypes.Fire]: 'Lava',
        [BiomeTypes.Ice]: 'Snow',
        [BiomeTypes.River]: 'River',
      };
      const biomeName = names[player.biome] || 'Special';
      this.showHint(`You entered the ${biomeName} biome! Each biome has unique effects and mobs.`, 4);
      return;
    }

    if (!this.progress.captureZoneShown && player.shape) {
      const globalEntities = this.game.gameState.globalEntities;
      for (const id in globalEntities) {
        const ge = globalEntities[id];
        if (ge.type === EntityTypes.CaptureZone && ge.shape) {
          const dx = player.shape.x - ge.shape.x;
          const dy = player.shape.y - ge.shape.y;
          if (Math.sqrt(dx * dx + dy * dy) < ge.shape.radius + 500) {
            this.progress.captureZoneShown = true;
            saveProgress(this.progress);
            this.showHint('You found a Capture Zone! Coins spawn inside, but you take a small amount of damage over time.', 7, { x: ge.shape.x, y: ge.shape.y });
            return;
          }
        }
      }
    }

    if (this.progress.controlsShown && this.progress.leaveShown && this.progress.coinInfoShown && this.progress.fightShown) {
      this.progress.complete = true;
      saveProgress(this.progress);
    }
  }

  private findNearest(type: number, player: any, maxDist: number): { x: number; y: number } | null {
    let best: { x: number; y: number } | null = null;
    let bestDist = maxDist;
    const entities = this.game.gameState.entities;
    for (const id in entities) {
      const e = entities[id] as any;
      if (e && e.type === type && e.shape) {
        const dx = player.shape.x - e.shape.x;
        const dy = player.shape.y - e.shape.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < bestDist) {
          bestDist = dist;
          best = { x: e.shape.x, y: e.shape.y };
        }
      }
    }
    return best;
  }
}

export default TutorialHints;
