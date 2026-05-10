import HudComponent from './HudComponent';

class Stats extends HudComponent {
  indent = 18;
  lastUpdate = 0;
  updateInterval = 1000;
  playersSprite: any;
  fpsSprite: any;
  tpsSprite: any;
  pingSprite: any;
  blockHintSprite: any;
  initialize() {
    if (this.game.isMobile) return;
    const { indent } = this;
    const style: Phaser.Types.GameObjects.Text.TextStyle = {
      fontSize: 18,
      fontFamily: 'Arial',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
    };
    this.playersSprite = this.game.add.text(0, indent * 0, '', style);
    this.fpsSprite = this.game.add.text(0, indent * 1, '', style);
    this.tpsSprite = this.game.add.text(0, indent * 2, '', style);
    this.pingSprite = this.game.add.text(0, indent * 3, '', style);
    this.blockHintSprite = this.game.add.text(0, indent * 4, 'Hold attack to block', {
      ...style,
      color: '#33aaff',
    });

    this.container = this.game.add.container(0, 0, [this.playersSprite, this.fpsSprite, this.tpsSprite, this.pingSprite, this.blockHintSprite]);
    this.hud.add(this.container);
  }

  resize() {
    if (!this.container) return;
    this.container.x = 10;
  this.container.y = this.game.scale.height - (this.indent * 5.7) * this.scale;
  }

  update() {
    if (!this.container) return;

    const now = Date.now();
    if (this.lastUpdate + this.updateInterval > now) return;
    this.lastUpdate = now;
    this.game.gameState.updatePing();

    const playersCount = this.game.gameState.realPlayersCnt;
    const fps = Number(this.game.game.loop.actualFps.toFixed(1));
    const tps = this.game.gameState.tps;
    const ping = this.game.gameState.ping;
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