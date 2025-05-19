import HudComponent from './HudComponent';

class CoinCounter extends HudComponent {
  indent = 20;
  lastUpdate = 0;
  updateInterval = 200;
  lastCoins = 0;
  lastUltimacy = 0;
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
  ultimacyImg: Phaser.GameObjects.Image;

  initialize() {
    const { indent } = this;


    this.coinImg = new Phaser.GameObjects.Image(this.game, 0, indent * 0, 'coin').setOrigin(0, 0);
    this.coinImg.setScale(0.35);
    this.stabImg = new Phaser.GameObjects.Image(this.game, 0, (indent * 0) + this.coinImg.displayHeight + 3, 'kill').setOrigin(0, 0);
    this.stabImg.displayHeight = this.coinImg.displayHeight;
    this.stabImg.displayWidth = this.coinImg.displayWidth;
    this.ultimacyImg = new Phaser.GameObjects.Image(this.game, 0, (indent * 0) + this.coinImg.displayHeight * 2 + 6, 'mastery').setOrigin(0, 0);
    this.ultimacyImg.displayHeight = this.coinImg.displayHeight;
    this.ultimacyImg.displayWidth = this.coinImg.displayWidth;
    this.textObj = new Phaser.GameObjects.Text(this.game, this.coinImg.displayWidth + 5, indent * 0, '', this.style);

    this.container = new Phaser.GameObjects.Container(this.game, 0, 0, [this.textObj, this.coinImg, this.stabImg, this.ultimacyImg]);


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
  if (!this.game.gameState.self.entity) return;

  const coins = this.game.gameState.self.entity.coins;
  let newUltimacy = 0;

  if (coins >= 1250000) {
    newUltimacy = Math.floor((coins / 794) ** 1.5);
  } else {
    newUltimacy = Math.floor((coins / 5000) ** 2);
  }

  this.lastUpdate = now;

  const kills = this.game.gameState.self.entity.kills;

  if (this.lastCoins !== coins || this.lastUltimacy !== newUltimacy) {
    const fromCoins = this.lastCoins;
    const toCoins = coins;
    const fromUltimacy = this.lastUltimacy;
    const toUltimacy = newUltimacy;

    this.game.tweens.add({
      targets: { progress: 0 },
      progress: 1,
      duration: 200,
      ease: Phaser.Math.Easing.Sine.InOut,
      onUpdate: (tween: Phaser.Tweens.Tween, target: any) => {
        const progress = target.progress;
        const currentCoins = Math.floor(Phaser.Math.Interpolation.Linear([fromCoins, toCoins], progress));
        const currentUltimacy = Math.floor(Phaser.Math.Interpolation.Linear([fromUltimacy, toUltimacy], progress));
        this.textObj.text = `${currentCoins}\n${kills}\n${currentUltimacy}`;
      },
    });

    this.lastCoins = coins;
    this.lastUltimacy = newUltimacy;
  } else {
    this.textObj.text = `${coins}\n${kills}\n${newUltimacy}`;
  }
}
}

export default CoinCounter;