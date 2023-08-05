import { BaseEntity } from './BaseEntity';

class Player extends BaseEntity {
  static stateFields = [
    ...BaseEntity.stateFields, 'radius', 'speed', 'name', 'coinBalance', 'angle',
    'health', 'maxHealth', 'kills', 'isHit', 'isDamaged',
    'swordSwingAngle', 'swordSwingProgress', 'swordSwingDuration',
    'level', 'evolutions', 'skin',
  ];

  body: any = null;
  sword: any = null;
  bodyContainer: any = null;
  isMe: boolean = false;
  healthBar: any = null;
  healthChanged: boolean = false;
  survivalStarted: number = 0;
  skin: any = null;
  skinChanged: boolean = false;

  isInBuilding: boolean = false;
  isTransparent: boolean = false;
  buildingId: number | null = null;
  swordLerpProgress = 0;
  angleLerp = 0;
  previousAngle = 0;

  swordRaiseStarted: boolean = false;
  swordDecreaseStarted: boolean = false;

  get survivalTime() {
    return Date.now() - this.survivalStarted;
  }

  createSprite() {
    this.survivalStarted = Date.now();
    this.body = this.game.physics.add.sprite(0, 0, 'player');
    this.sword = this.game.physics.add.sprite(this.body.width / 2, this.body.height / 2, 'sword');
    this.sword.setRotation(Math.PI / 4);

    const name = this.game.add.text(0, -this.body.height / 2 - 50, this.name);
    name.setFontFamily('Arial');
    name.setFontSize(30);
    name.setOrigin(0.5, 1);
    name.setFill('#000000');
    
    this.healthBar = this.game.add.graphics();
    this.healthBar.x = -100;
    this.healthBar.y = -175;
    this.updateHealth();

    this.bodyContainer = this.game.add.container(0, 0, [this.sword, this.body]);
    this.container = this.game.add.container(this.x, this.y, [this.bodyContainer, name, this.healthBar]);
    this.container.scale = (this.radius * 2) / this.body.width;
    this.container.setDepth(10);
    this.game.physics.world.enableBody(this.container);
    return this.container;
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

  updateSkin() {
    this.body.setTexture(this.skin);
  }

  beforeStateUpdate(data: any): void {
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
    if (data.skin !== undefined && this.skin !== data.skin) {
      this.skinChanged = true;
    }
  }

  interpolate(dt: number) {
    const scale = dt / 60;
    this.container.x = Phaser.Math.Linear(this.container.x, this.x, scale);
    this.container.y = Phaser.Math.Linear(this.container.y, this.y, scale);

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
  }

  updateRotation() {
    this.game.cameras.main.centerOn(this.container.x, this.container.y);
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
    this.isMe = this.id === gameState.self.id;

    if (this.healthChanged) {
      this.updateHealth();
      this.healthChanged = false;
    }

    if (this.skinChanged) {
      this.updateSkin();
      this.skinChanged = false;
    }
    
    if (this.isMe) {
      this.updateRotation();

      if (this.isHit) {
        this.game.soundManager.hit?.play();
        this.isHit = false;
      }
      if (this.isDamaged) {
        this.game.soundManager.damage?.play();
        this.isDamaged = false;
      }
      
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

      if (this.evolutions.length) {
        this.game.game.events.emit('openModal', { evolutions: this.evolutions });
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
  }
}

export default Player;
