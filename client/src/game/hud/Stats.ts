import HudComponent from './HudComponent';

class Stats extends HudComponent {
  indent = 20;
  lastUpdate = 0;
  updateInterval = 1000;
  playersSprite: any;
  fpsSprite: any;
  tpsSprite: any;
  pingSprite: any;

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

    this.container = this.game.add.container(0, 0, [this.playersSprite, this.fpsSprite, this.tpsSprite, this.pingSprite]);
    this.hud.add(this.container);
  }

  resize() {
    if (!this.container) return;
    this.container.x = 10;
    this.container.y = this.game.scale.height - (this.indent * 5) * this.scale;
  }

  update() {
    if (!this.container) return;

    const now = Date.now();
    if (this.lastUpdate + this.updateInterval > now) return;
    this.lastUpdate = now;
    this.game.gameState.updatePing();

    const playersCount = this.game.gameState.getPlayers().length;
    const fps = this.game.game.loop.actualFps.toFixed(1);
    const tps = this.game.gameState.tps;
    const ping = this.game.gameState.ping;
    this.playersSprite.text = `Players: ${playersCount}`;
    this.fpsSprite.text = `FPS: ${fps}`;
    this.tpsSprite.text = `TPS: ${tps}`;
    this.pingSprite.text = `Ping: ${ping}`;
  }
}

export default Stats;