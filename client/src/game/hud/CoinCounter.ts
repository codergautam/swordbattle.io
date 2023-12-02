import HudComponent from './HudComponent';

class CoinCounter extends HudComponent {
  indent = 20;
  lastUpdate = 0;
  updateInterval = 200;
  lastCoins = 0;
  style: Phaser.Types.GameObjects.Text.TextStyle = {
    fontStyle: 'bold',
    stroke: '#000000',
    fontFamily:'Courier',
    shadow: {
      offsetX: 2,
      offsetY: 2,
      color: '#000',
      blur: 2,
      stroke: true,
      fill: true,
    },
    strokeThickness: 8,
    color: '#ffffff',
    fontSize: '50px',
  };
  textObj: Phaser.GameObjects.Text;
  coinImg: Phaser.GameObjects.Image;
  stabImg: Phaser.GameObjects.Image;

  initialize() {
    const { indent } = this;


    this.coinImg = new Phaser.GameObjects.Image(this.game, 0, indent * 0, 'coin').setOrigin(0, 0);
    this.coinImg.setScale(0.35);
    this.stabImg = new Phaser.GameObjects.Image(this.game, 0, (indent * 0) + this.coinImg.displayHeight + 5, 'kill').setOrigin(0, 0);
    this.stabImg.displayHeight = this.coinImg.displayHeight;
    this.stabImg.displayWidth = this.coinImg.displayWidth;
    this.textObj = new Phaser.GameObjects.Text(this.game, this.coinImg.displayWidth+ 5, indent * 0, '', this.style);

    this.container = new Phaser.GameObjects.Container(this.game, 0, 0, [this.textObj, this.coinImg, this.stabImg]);


    this.hud.add(this.container);
  }

  resize() {
    if (!this.container) return;
    this.container.x = 10;
  }

  update() {
    if (!this.container) return;
    this.container.y = this.hud.buffsSelect.height + 30;

    const now = Date.now();
    if (this.lastUpdate + this.updateInterval > now) return;
    if(!this.game.gameState.self.entity) return;

    this.lastUpdate = now;
    if(this.lastCoins !== this.game.gameState.self.entity.coins) {
      this.game.tweens.addCounter({
        from: this.lastCoins,
        to: this.game.gameState.self.entity.coins,
        duration: 200,
        onUpdate: (tween: Phaser.Tweens.Tween) => {
          this.textObj.text = `${Math.floor(tween.getValue())}\n${this.game.gameState?.self?.entity?.kills}`;
        },
        ease: Phaser.Math.Easing.Sine.InOut,
      });
      this.lastCoins = this.game.gameState.self.entity.coins;

    } else {
      this.textObj.text = `${this.game.gameState.self.entity.coins}\n${this.game.gameState.self.entity.kills}`;
    }
  }
}

export default CoinCounter;
