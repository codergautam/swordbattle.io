import { BaseEntity } from "./BaseEntity";
import { Shape } from "../physics/Shape";
import { Evolutions } from "../Evolutions";
import { Health } from "../components/Health";
import { BiomeTypes, EntityTypes, FlagTypes, InputTypes } from "../Types";
import { random } from "../../helpers";
import * as cosmetics from "../cosmetics.json";
const { skins } = cosmetics;
class Player extends BaseEntity {
  static stateFields = [
    ...BaseEntity.stateFields,
    "name",
    "angle",
    "kills",
    "flags",
    "biome",
    "level",
    "upgradePoints",
    "coins",
    "nextLevelCoins",
    "previousLevelCoins",
    "buffs",
    "evolution",
    "possibleEvolutions",
    "isAbilityAvailable",
    "abilityActive",
    "abilityDuration",
    "abilityCooldown",
    "swordSwingAngle",
    "swordSwingProgress",
    "swordSwingDuration",
    "swordFlying",
    "swordFlyingCooldown",
    "viewportZoom",
    "chatMessage",
    "skin",
    "skinName",
    "account",
  ];
  static removeTransition = 500;

  body!: Phaser.GameObjects.Sprite;
  sword!: Phaser.GameObjects.Sprite;
  bodyContainer!: Phaser.GameObjects.Container;
  swordContainer!: Phaser.GameObjects.Container;
  evolutionOverlay!: Phaser.GameObjects.Sprite;
  messageText!: Phaser.GameObjects.Text;

  isMe: boolean = false;
  swordLerpProgress = 0;
  angleLerp = 0;
  previousAngle = 0;
  following = false;

  survivalStarted: number = 0;
  swordRaiseStarted: boolean = false;
  swordDecreaseStarted: boolean = false;

  get survivalTime() {
    return (Date.now() - this.survivalStarted) / 1000;
  }

  createSprite() {
    this.isMe = this.id === this.game.gameState.self.id;

    this.shape = Shape.create(this.shapeData);
    this.survivalStarted = Date.now();
    this.skinName = Object.values(skins).find(
      (skin) => skin.id === this.skin
    )?.name;
    this.body = this.game.add
      .sprite(0, 0, "playerBody")
      .setRotation(-Math.PI / 2);
    this.evolutionOverlay = this.game.add
      .sprite(0, 0, "")
      .setRotation(-Math.PI / 2);
    this.updateEvolution();

    this.sword = this.game.add
      .sprite(this.body.width / 2, this.body.height / 2, "playerSword")
      .setRotation(Math.PI / 4);
    this.swordContainer = this.game.add.container(0, 0, [this.sword]);

    this.healthBar = new Health(this, {
      hideWhenFull: false,
      offsetY: -this.body.height / 2 - 40,
    });

    const name = this.game.add.text(0, -this.body.height / 2 - 50, this.name);
    name.setFontFamily("Arial");
    name.setFontSize(50);
    name.setOrigin(0.5, 1);
    const specialColors: { [key: string]: string } = {
      codergautam: "#ff0000",
      angel: "#acfffc",
    };
    name.setFill(
      this.account
        ? specialColors[this.name?.toLowerCase() as keyof typeof specialColors]
          ? specialColors[
              this.name?.toLowerCase() as keyof typeof specialColors
            ]
          : "#0000ff"
        : "#000000"
    );

    this.messageText = this.game.add
      .text(0, -this.body.height / 2 - 100, "")
      .setFontFamily("Arial")
      .setFontSize(75)
      .setOrigin(0.5, 1)
      .setFill("#ffffff");

    this.bodyContainer = this.game.add.container(0, 0, [
      this.swordContainer,
      this.body,
      this.evolutionOverlay,
    ]);
    this.container = this.game.add.container(this.shape.x, this.shape.y, [
      this.bodyContainer,
      name,
      this.messageText,
    ]);

    this.loadSkin(this.skin)
      .then(() => {
        this.body.setTexture(this.skinName + "Body");
        this.sword.setTexture(this.skinName + "Sword");
      })
      .catch(() => {
        console.log("failed to load skin", this.skin);
      });

    return this.container;
  }

  skinLoaded(id: number) {
    return this.game.textures.exists(
      Object.values(skins).find((skin) => skin.id === id)?.name + "Body"
    );
  }

  loadSkin(id: number) {
    return new Promise<void>((resolve, reject) => {
      if (this.skinLoaded(id)) {
        resolve();
      } else {
        if (this.game.gameState.failedSkinLoads[id]) reject();
        else {
          const skin = Object.values(skins).find((skin) => skin.id === id);
          const publicPath = process.env.PUBLIC_URL as string;
          const basePath = `${publicPath}/assets/game/player/`;

          if (skin) {
            console.log(
              "loading skin",
              skin.name,
              basePath + skin.bodyFileName
            );
            this.game.load.image(
              skin.name + "Body",
              basePath + skin.bodyFileName
            );
            this.game.load.image(
              skin.name + "Sword",
              basePath + skin.swordFileName
            );

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
          },
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
      this.messageText?.setFill(isTextBlack ? "#000000" : "#ffffff");
    }
    if (data.flags) {
      if (data.flags[FlagTypes.EnemyHit]) {
        const entity =
          this.game.gameState.entities[data.flags[FlagTypes.EnemyHit]];
        if (entity && entity.type !== EntityTypes.Player)
          this.addHitParticles(entity);
      }
      if (data.flags[FlagTypes.Damaged]) {
        this.addDamagedParticles();
      }
    }
  }

  addHitParticles(entity: BaseEntity) {
    if (this.game.game.loop.actualFps < 30) return;

    const particles = this.game.add.particles(
      entity.container.x,
      entity.container.y,
      "starParticle",
      {
        maxParticles: 5,
        scale: 0.1,
        speed: 200,
      }
    );
    particles.setDepth(45);
    particles.setBlendMode(Phaser.BlendModes.ADD);
  }

  addDamagedParticles() {
    if (this.game.game.loop.actualFps < 30) return;
    try {
      const particles = this.game.add.particles(
        this.container.x,
        this.container.y,
        "hitParticle",
        {
          maxParticles: 5,
          scale: 0.01,
          speed: 200,
        }
      );
      particles.setDepth(45);
      particles.setBlendMode(Phaser.BlendModes.ADD);
    } catch (e) {
      console.log(e);
    }
  }

  addAbilityParticles() {
    const fps = this.game.game.loop.actualFps;
    if (fps < 5) return;
    try {
      const particles = this.game.add.particles(
        this.container.x +
          random(-this.body.displayWidth, this.body.displayWidth) * 0.5,
        this.container.y +
          random(-this.body.displayHeight, this.body.displayHeight) * 0.5,
        "starParticle",
        { scale: 0.05, speed: 200, maxParticles: 1 }
      );
      particles.setDepth(45);
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
      this.evolutionOverlay.setOrigin(
        evolutionClass[3][0],
        evolutionClass[3][1]
      );
      this.evolutionOverlay.setScale(
        (this.body.width / this.evolutionOverlay.width) * evolutionClass[2]
      );
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
        if (this.isMe && this.swordDecreaseStarted) {
          this.game.controls.enableKeys([InputTypes.SwordThrow]);
        }
        this.swordDecreaseStarted = false;
      }
    }
    if (!this.isMe) {
      this.angleLerp = Math.min(this.angleLerp + dt / 120, 1);
      this.rotateBody(
        Phaser.Math.Angle.RotateTo(
          this.previousAngle,
          this.angle,
          this.angleLerp
        )
      );
    }
  }

  rotateBody(angle: number) {
    const swordRotation = this.swordSwingAngle * this.swordLerpProgress;
    this.swordContainer.setRotation(swordRotation);
    this.bodyContainer.setRotation(angle);
  }

  updatePrediction() {
    let pointer = this.game.input.activePointer;
    if (this.game.isMobile) {
      pointer =
        this.game.controls.joystickPointer === this.game.input.pointer1
          ? this.game.input.pointer2
          : this.game.input.pointer1;
    }
    pointer.updateWorldPoint(this.game.cameras.main);

    if (this.game.controls.isInputDown(InputTypes.SwordSwing)) {
      if (
        !(
          this.swordFlying ||
          this.swordRaiseStarted ||
          this.swordDecreaseStarted
        )
      ) {
        if (!this.swordRaiseStarted) {
          this.swordRaiseStarted = true;
          this.game.controls.disableKeys([InputTypes.SwordThrow], true);
        }
      }
    }

    const cursorWorldPos = new Phaser.Geom.Point(
      pointer.worldX,
      pointer.worldY
    );
    let angle = Phaser.Math.Angle.BetweenPoints(this.container, cursorWorldPos);
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

    this.sword.setVisible(!this.swordFlying);
    this.container.scale = (this.shape.radius * 2) / this.body.width;
    this.interpolate(dt);

    if (this.abilityActive) {
      this.addAbilityParticles();
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
  }
}

export default Player;
