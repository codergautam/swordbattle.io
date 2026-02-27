import HudComponent from './HudComponent';

class CoinCounter extends HudComponent {
  indent = 20;
  lastUpdate = 0;
  updateInterval = 200;
  lastCoins = 0;
  lastTokens = 0;
  lastUltimacy = 0;
  hasEverHadSnowWalker = false; // Toggle: true after SnowWalker evolution, false after player dies
  showTokens = false; // Toggle: set to true to show tokens for seasonal events
  style: Phaser.Types.GameObjects.Text.TextStyle = {
    fontStyle: 'bold',
    stroke: '#000000',
    fontFamily:'Courier',
    shadow: {
      offsetX: 3,
      offsetY: 3,
      color: '#00000052',
      stroke: true,
      fill: true,
    },
    strokeThickness: 8,
    color: '#ffffff',
    fontSize: '50px',
  };
  textObj: Phaser.GameObjects.Text;
  tokenTextObj: Phaser.GameObjects.Text;
  tokenMultiplierLabel: Phaser.GameObjects.Text;
  coinImg: Phaser.GameObjects.Image;
  tokenImg: Phaser.GameObjects.Image;
  stabImg: Phaser.GameObjects.Image;
  ultimacyImg: Phaser.GameObjects.Image;

  initialize() {
    const { indent } = this;


    this.coinImg = new Phaser.GameObjects.Image(this.game, 0, indent * 0, 'coin').setOrigin(0, 0);
    this.coinImg.setScale(0.35);
    this.tokenImg = new Phaser.GameObjects.Image(this.game, 0, (indent * 0) + this.coinImg.displayHeight + 3, 'token').setOrigin(0, 0);
    this.tokenImg.displayHeight = this.coinImg.displayHeight;
    this.tokenImg.displayWidth = this.coinImg.displayWidth;
    this.tokenImg.setVisible(this.showTokens);

    // Position kills and ultimacy based on whether tokens are shown
    const killsYOffset = this.showTokens ? this.coinImg.displayHeight * 2 + 6 : this.coinImg.displayHeight + 3;
    const ultimacyYOffset = this.showTokens ? this.coinImg.displayHeight * 3 + 9 : this.coinImg.displayHeight * 2 + 6;

    this.stabImg = new Phaser.GameObjects.Image(this.game, 0, (indent * 0) + killsYOffset, 'kill').setOrigin(0, 0);
    this.stabImg.displayHeight = this.coinImg.displayHeight;
    this.stabImg.displayWidth = this.coinImg.displayWidth;
    this.ultimacyImg = new Phaser.GameObjects.Image(this.game, 0, (indent * 0) + ultimacyYOffset, 'mastery').setOrigin(0, 0);
    this.ultimacyImg.displayHeight = this.coinImg.displayHeight;
    this.ultimacyImg.displayWidth = this.coinImg.displayWidth;
    this.textObj = new Phaser.GameObjects.Text(this.game, this.coinImg.displayWidth + 5, indent * 0, '', this.style);

    // Create separate token text object for cyan color overlay
    const tokenStyle = { ...this.style };
    this.tokenTextObj = new Phaser.GameObjects.Text(this.game, this.coinImg.displayWidth + 5, (indent * 0) + this.coinImg.displayHeight + 3, '', tokenStyle);
    this.tokenTextObj.setVisible(false);

    // Create "2x" multiplier label (initially hidden)
    const multiplierStyle = { ...this.style, fontSize: '30px', color: '#00ffff' };
    this.tokenMultiplierLabel = new Phaser.GameObjects.Text(this.game, 0, 0, '2x', multiplierStyle);
    this.tokenMultiplierLabel.setVisible(false);

    this.container = new Phaser.GameObjects.Container(this.game, 0, 0, [this.textObj, this.tokenTextObj, this.tokenMultiplierLabel, this.coinImg, this.tokenImg, this.stabImg, this.ultimacyImg]);


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
  const tokens = this.game.gameState.self.entity.tokens || 0;
  const evolution = this.game.gameState.self.entity.evolution;
  
  if (coins === 0 && this.lastCoins > 0) {
    this.hasEverHadSnowWalker = false;
  }
  
  if (evolution === 21) {
    this.hasEverHadSnowWalker = true;
  } else if (!this.hasEverHadSnowWalker && evolution !== 0) {
    this.hasEverHadSnowWalker = false;
  }
  
  const hasBonusTokens = this.hasEverHadSnowWalker;
  let newUltimacy = 0;

  if (coins >= 1250000) {
    newUltimacy = Math.floor((coins / 794) ** 1.5);
  } else {
    newUltimacy = Math.floor((coins / 5000) ** 2);
  }

  this.lastUpdate = now;

  const kills = this.game.gameState.self.entity.kills;

  if (this.lastCoins !== coins || this.lastTokens !== tokens || this.lastUltimacy !== newUltimacy) {
    const fromCoins = this.lastCoins;
    const toCoins = coins;
    const fromTokens = this.lastTokens;
    const toTokens = tokens;
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
        const currentTokens = Math.floor(Phaser.Math.Interpolation.Linear([fromTokens, toTokens], progress));
        const currentUltimacy = Math.floor(Phaser.Math.Interpolation.Linear([fromUltimacy, toUltimacy], progress));
        if (this.showTokens) {
          this.textObj.text = `${currentCoins}\n${currentTokens}\n${kills}\n${currentUltimacy}`;
        } else {
          this.textObj.text = `${currentCoins}\n${kills}\n${currentUltimacy}`;
        }

        if (hasBonusTokens && this.showTokens) {
          this.tokenTextObj.text = `${currentTokens}`;
        }
      },
    });

    this.lastCoins = coins;
    this.lastTokens = tokens;
    this.lastUltimacy = newUltimacy;
  } else {
    if (this.showTokens) {
      this.textObj.text = `${coins}\n${tokens}\n${kills}\n${newUltimacy}`;
    } else {
      this.textObj.text = `${coins}\n${kills}\n${newUltimacy}`;
    }

    if (hasBonusTokens && this.showTokens) {
      this.tokenTextObj.text = `${tokens}`;
    }
  }

  if (hasBonusTokens && this.showTokens) {
    this.tokenTextObj.setVisible(true);
    this.tokenTextObj.setColor('#00ffff');
    this.tokenMultiplierLabel.setVisible(true);

    const tokenTextWidth = this.tokenTextObj.width;
    this.tokenMultiplierLabel.setPosition(
      this.tokenTextObj.x + tokenTextWidth + 10,
      this.tokenTextObj.y
    );
  } else {
    this.tokenTextObj.setVisible(false);
    this.tokenMultiplierLabel.setVisible(false);
  }
}
}

export default CoinCounter;