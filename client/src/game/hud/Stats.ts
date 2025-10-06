import HudComponent from './HudComponent';

class Stats extends HudComponent {
  indent = 20;
  lastUpdate = 0;
  updateInterval = 1000;
  playersSprite: any;
  fpsSprite: any;
  tpsSprite: any;
  pingSprite: any;
  throwReadySprite: any;

  initialize() {
    const { indent } = this;
    const style: Phaser.Types.GameObjects.Text.TextStyle = {
      fontSize: 20,
      fontFamily: 'Arial',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
    };
    this.playersSprite = this.game.add.text(0, indent * 0, '', style);
    this.fpsSprite = this.game.add.text(0, indent * 1, '', style);
    this.tpsSprite = this.game.add.text(0, indent * 2, '', style);
    this.pingSprite = this.game.add.text(0, indent * 3, '', style);

    this.throwReadySprite = this.game.add.text(0, indent * 4, '', {
      ...style,
      color: '#00ff00',
    });
    this.throwReadySprite.setVisible(false);

    this.container = this.game.add.container(0, 0, [this.playersSprite, this.fpsSprite, this.tpsSprite, this.pingSprite, this.throwReadySprite]);
    this.hud.add(this.container);
  }

  resize() {
    if (!this.container) return;
    this.container.x = 10;
  this.container.y = this.game.scale.height - (this.indent * 6) * this.scale;
  }

  update() {
    if (!this.container) return;

    const now = Date.now();
    if (this.lastUpdate + this.updateInterval > now) return;
    this.lastUpdate = now;
    this.game.gameState.updatePing();

    const playersCount = this.game.gameState.getPlayers().length;
    const fps = Number(this.game.game.loop.actualFps.toFixed(1));
    const tps = this.game.gameState.tps;
    const ping = this.game.gameState.ping;
    const playerEntity = this.game.gameState.self.entity;
    if (playerEntity && playerEntity.swordFlyingCooldown !== undefined && playerEntity.swordFlyingCooldown <= 0) {
      const controlHint = this.game.isMobile ? '(Tap Button)' : '(C or Right Click)';
      this.throwReadySprite.text = `Throw Ready ${controlHint}`;
      this.throwReadySprite.setVisible(true);
    } else {
      this.throwReadySprite.setVisible(false);
    }

    this.playersSprite.text = `Players: ${playersCount}`;

    // FPS color
    if (fps < 15) {
      this.fpsSprite.setColor('#ff0000');
    } else if (fps < 30) {
      this.fpsSprite.setColor('#ffff00');
    } else {
      this.fpsSprite.setColor('#ffffff');
    }
    this.fpsSprite.text = `FPS: ${fps}`;

    // TPS color
    if (tps < 4) {
      this.tpsSprite.setColor('#ff0000');
    } else if (tps < 8) {
      this.tpsSprite.setColor('#ffff00');
    } else {
      this.tpsSprite.setColor('#ffffff');
    }
    this.tpsSprite.text = `TPS: ${tps}`;

    // Ping color
    if (ping > 1000) {
      this.pingSprite.setColor('#ff0000');
    } else if (ping > 350) {
      this.pingSprite.setColor('#ffff00');
    } else {
      this.pingSprite.setColor('#ffffff');
    }
    this.pingSprite.text = `Ping: ${ping}ms`;
  }
}

export default Stats;