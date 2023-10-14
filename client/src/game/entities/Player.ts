import { BaseEntity } from './BaseEntity';
import { Shape } from '../physics/Shape';
import { Evolutions } from '../Evolutions';

class Player extends BaseEntity {
  static stateFields = [
    ...BaseEntity.stateFields, 'name', 'angle',
    'health', 'maxHealth', 'kills', 'flags',
    'level', 'upgradePoints', 'coins', 'nextLevelCoins', 'previousLevelCoins',
    'buffs', 'evolution', 'possibleEvolutions',
    'swordSwingAngle', 'swordSwingProgress', 'swordSwingDuration', 'swordFlying', 'swordFlyingCooldown',
    'viewportZoom', 'chatMessage',
  ];

  body: any = null;
  sword: any = null;
  bodyContainer: any = null;
  healthBar: any = null;
  messageText!: Phaser.GameObjects.Text;

  isMe: boolean = false;
  isInBuilding: boolean = false;
  isTransparent: boolean = false;
  buildingId: number | null = null;
  swordLerpProgress = 0;
  angleLerp = 0;
  previousAngle = 0;

  survivalStarted: number = 0;
  healthChanged: boolean = false;
  swordRaiseStarted: boolean = false;
  swordDecreaseStarted: boolean = false;

  get survivalTime() {
    return Date.now() - this.survivalStarted;
  }

  createSprite() {
    this.isMe = this.id === this.game.gameState.self.id;

    this.shape = Shape.create(this.shapeData);
    this.survivalStarted = Date.now();
    this.body = this.game.physics.add.sprite(0, 0, 'player');
    this.sword = this.game.add.sprite(this.body.width / 2, this.body.height / 2, 'sword');
    this.sword.setRotation(Math.PI / 4);
    this.updateEvolution();

    const name = this.game.add.text(0, -this.body.height / 2 - 50, this.name);
    name.setFontFamily('Arial');
    name.setFontSize(30);
    name.setOrigin(0.5, 1);
    name.setFill('#000000');

    this.healthBar = this.game.add.graphics();
    this.healthBar.x = -100;
    this.healthBar.y = -175;
    this.updateHealth();

    this.messageText = this.game.add.text(0, -this.body.height / 2 - 100, '')
      .setFontFamily('Arial')
      .setFontSize(75)
      .setOrigin(0.5, 1)
      .setFill('#ffffff');

    this.bodyContainer = this.game.add.container(0, 0, [this.sword, this.body]);
    this.container = this.game.add.container(this.shape.x, this.shape.y, [this.bodyContainer, name, this.healthBar, this.messageText]);
    this.game.physics.world.enableBody(this.container);
    return this.container;
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
          }
        });
      } else {
        // Either just show message
        this.messageText.text = this.chatMessage;
        toggle(true);
      }
    }
  }

  updateHealth() {
    const barWidth = 200;
    const healthPercent = this.health / this.maxHealth;
    let healthColor = 65280;
    if (healthPercent < 0.3) {
      healthColor = 16711680;
    } else if (healthPercent < 0.5) {
      healthColor = 16776960;
    }

    this.healthBar.clear();
    this.healthBar.lineStyle(4, 0x000000);
    this.healthBar.strokeRect(0, 0, barWidth, 30);
    this.healthBar.fillStyle(healthColor);
    this.healthBar.fillRect(0, 0, barWidth * healthPercent, 30);
  }

  beforeStateUpdate(data: any): void {
    super.beforeStateUpdate(data);

    if (data.health !== undefined || data.maxHealth !== undefined) {
      this.healthChanged = true;
    }
    if (data.swordSwingProgress !== undefined) {
      if ( this.swordSwingProgress === 0 && data.swordSwingProgress !== 0) {
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
  }

  updateEvolution() {
    if (!this.body) return;
    const evolutionClass = Evolutions[this.evolution];
    this.body.setTexture(evolutionClass ? evolutionClass[1] : 'player');
    this.body.setRotation(-Math.PI / 2);
  }

  interpolate(dt: number) {
    const scale = dt / 60;
    this.container.x = Phaser.Math.Linear(this.container.x, this.shape.x, scale);
    this.container.y = Phaser.Math.Linear(this.container.y, this.shape.y, scale);

    const swordLerpDt = dt / (this.swordSwingDuration * 1000);
    if (this.swordRaiseStarted) {
      this.swordLerpProgress += swordLerpDt;
      if (this.swordLerpProgress >= 1) {
        this.swordLerpProgress = 1;
        this.swordRaiseStarted = false;
      }
    } else if (this.swordDecreaseStarted) {
      this.swordLerpProgress -= swordLerpDt;
      if (this.swordLerpProgress <= 0) {
        this.swordLerpProgress = 0;
        this.swordDecreaseStarted = false;
      }
    }
    if (!this.isMe) {
      this.angleLerp = Math.min(this.angleLerp + scale / 2, 1);
      this.rotateBody(Phaser.Math.Angle.RotateTo(this.previousAngle, this.angle, this.angleLerp));
    }
  }

  rotateBody(angle: number) {
    this.bodyContainer.setRotation(angle + this.swordSwingAngle * this.swordLerpProgress);
    this.body.setRotation(-1 * this.swordSwingAngle * this.swordLerpProgress - Math.PI / 2);
  }

  updateRotation() {
    let pointer = this.game.input.activePointer;
    if (this.game.isMobile) {
      pointer = this.game.joystickPointer === this.game.input.pointer1
        ? this.game.input.pointer2
        : this.game.input.pointer1;
    }
    pointer.updateWorldPoint(this.game.cameras.main);

    const cursorWorldPos = new Phaser.Geom.Point(pointer.worldX, pointer.worldY);
    const angle = Phaser.Math.Angle.BetweenPoints(this.container, cursorWorldPos);
    this.angle = this.game.gameState.playerAngle = angle;
    this.rotateBody(angle);
  }

  update(dt: number) {
    const { gameState } = this.game;
    const self = gameState.self.entity;

    this.container.scale = (this.shape.radius * 2) / this.body.width;
    this.sword.setVisible(!this.swordFlying);

    if (this.healthChanged) {
      this.updateHealth();
      this.healthChanged = false;
    }

    if (this.isMe) {
      this.updateRotation();

      if (this.game.joystick) {
        gameState.mouse.angle = this.game.joystick.angle * (Math.PI / 180);
        gameState.mouse.force = this.game.joystick.force;
      } else {
        const { activePointer } = this.game.input;
        const mousePos = {
          x: activePointer.worldX - this.container.x,
          y: activePointer.worldY - this.container.y,
        };
        const angle = Math.atan2(mousePos.y, mousePos.x);
        const force = Math.sqrt(mousePos.x ** 2 + mousePos.y ** 2);
        gameState.mouse.angle = angle;
        gameState.mouse.force = force;
      }
    } else {
      let isTransparent = this.isInBuilding && this.buildingId !== self?.buildingId;
      if (this.isTransparent !== isTransparent) {
        this.game.tweens.add({
          targets: this.container,
          alpha: isTransparent ? 0 : 1,
          duration: 100,
        });
        this.isTransparent = isTransparent;
      }
    }

    this.interpolate(dt);
    if (this.isMe) {
      this.game.cameras.main.centerOn(this.container.x, this.container.y);
    }
  }

  remove(): void {
    super.remove();

    this.flags = {}; // clear flags to stop all sounds
  }
}

export default Player;
