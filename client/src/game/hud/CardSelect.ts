import HudComponent from './HudComponent';
import { MinorCardData, MajorCardData, isMinorCard, isMajorCard, getMinorTotalPercent, getMinorNextValue, countStacks } from '../CardData';

const cardWidth = 180;
const cardHeight = 260;
const cardGap = 30;
const iconSize = 48;

const bgColor = 0x141414;
const borderColor = 0x2f2f2f;
const textColor = '#e7e7e7';

const accentMinor = 0x4488ff;
const accentMajor = 0xd4a017;

class CardSelect extends HudComponent {
  backdrop: Phaser.GameObjects.Graphics | null = null;
  headerText: Phaser.GameObjects.Text | null = null;
  timerText: Phaser.GameObjects.Text | null = null;
  cardContainers: Phaser.GameObjects.Container[] = [];
  cardIdMap: Map<number, Phaser.GameObjects.Container> = new Map();
  isShowing = false;
  lastOffersKey = '';
  timerPulse: Phaser.Tweens.Tween | null = null;
  wasChoosing = false;
  lastChosenCards: number[] = [];
  playerClicked = false;
  hiding = false;

  isMajorPick = false;
  actionButton: Phaser.GameObjects.Container | null = null;
  actionButtonUsed = false;

  initialize() {
    if (!this.hud.scene) return;
    const scene = this.hud.scene;

    this.backdrop = scene.add.graphics();
    this.backdrop.setDepth(100);

    this.headerText = scene.add.text(0, 0, 'SELECT AN UPGRADE', {
      fontSize: '28px',
      fontFamily: 'Ubuntu, sans-serif',
      fontStyle: 'bold',
      color: textColor,
    }).setOrigin(0.5).setDepth(101);

    this.timerText = scene.add.text(0, 0, '', {
      fontSize: '22px',
      fontFamily: 'Ubuntu, sans-serif',
      fontStyle: 'bold',
      color: textColor,
    }).setOrigin(0.5).setDepth(101);

    this.container = scene.add.container(0, 0, [this.backdrop, this.headerText, this.timerText]);
    this.container.setDepth(100);
    this.container.setAlpha(0);
    this.container.setVisible(false);
  }

  resize() {
    if (!this.backdrop) return;
    this.rebuildLayout();
  }

  rebuildLayout() {
    if (!this.backdrop || !this.headerText || !this.timerText) return;
    const { width, height } = this.game.scale;

    this.backdrop.clear();
    this.backdrop.fillStyle(0x000000, 0.7);
    this.backdrop.fillRect(0, 0, width / this.scale, height / this.scale);

    this.headerText.setPosition(width / (2 * this.scale), height * 0.15 / this.scale);
    this.timerText.setPosition(width / (2 * this.scale), height * 0.22 / this.scale);

    const player = this.game.gameState.self.entity;
    const isTutorial = player && (player as any).isTutorial;
    this.headerText.setVisible(!isTutorial);
  }

  showCards(offers: number[], chosenCards: number[]) {
    if (!this.hud.scene || !this.container) return;
    const scene = this.hud.scene;
    const { width, height } = this.game.scale;

    this.clearCards();

    const stacks = countStacks(chosenCards);
    const totalWidth = offers.length * cardWidth + (offers.length - 1) * cardGap;
    const startX = (width / this.scale - totalWidth) / 2;
    const cardY = height * 0.35 / this.scale;

    const hasMajor = offers.some(id => isMajorCard(id));
    this.isMajorPick = hasMajor;

    for (let i = 0; i < offers.length; i++) {
      const cardId = offers[i];
      const x = startX + i * (cardWidth + cardGap) + cardWidth / 2;
      const cardContainer = this.createCard(scene, cardId, stacks[cardId] || 0, x, cardY, i);
      (this.container as Phaser.GameObjects.Container).add(cardContainer);
      this.cardContainers.push(cardContainer);
      this.cardIdMap.set(cardId, cardContainer);
    }

    const player = this.game.gameState.self.entity;
    const isTutorial = player && (player as any).isTutorial;
    if (!isTutorial) {
      const rerolls: number = player ? (player as any).rerollsAvailable || 0 : 0;
      this.createActionButton(scene, hasMajor, rerolls);
    }
  }

  createCard(scene: Phaser.Scene, cardId: number, currentStacks: number, x: number, y: number, offerIndex: number): Phaser.GameObjects.Container {
    const isMajor = isMajorCard(cardId);
    const accentColor = isMajor ? accentMajor : accentMinor;
    const cardInfo = isMajor ? MajorCardData[cardId] : MinorCardData[cardId];
    if (!cardInfo) {
      return scene.add.container(x, y);
    }

    const elements: Phaser.GameObjects.GameObject[] = [];

    const bg = scene.add.graphics();
    bg.fillStyle(bgColor, 1);
    bg.fillRoundedRect(-cardWidth / 2, 0, cardWidth, cardHeight, 10);
    bg.lineStyle(3, borderColor, 1);
    bg.strokeRoundedRect(-cardWidth / 2, 0, cardWidth, cardHeight, 10);
    elements.push(bg);

    const accentLine = scene.add.graphics();
    accentLine.fillStyle(accentColor, 1);
    accentLine.fillRoundedRect(-cardWidth / 2 + 3, 3, cardWidth - 6, 4, 2);
    elements.push(accentLine);

    const catText = isMajor ? 'MAJOR' : cardInfo.category.toUpperCase();
    const catLabel = scene.add.text(0, 18, catText, {
      fontSize: '10px',
      fontFamily: 'Ubuntu, sans-serif',
      fontStyle: 'bold',
      color: isMajor ? '#d4a017' : '#7799cc',
    }).setOrigin(0.5);
    elements.push(catLabel);

    const iconKey = isMajor ? `card_major${offerIndex + 1}` : cardInfo.icon;
    const iconY = 62;
    if (scene.textures.exists(iconKey)) {
      const iconImg = scene.add.image(0, iconY, iconKey);
      const frame = iconImg.frame;
      const scale = Math.min(iconSize / frame.width, iconSize / frame.height);
      iconImg.setScale(scale);
      elements.push(iconImg);
    } else {
      const fallbackBg = scene.add.graphics();
      fallbackBg.fillStyle(accentColor, 0.15);
      fallbackBg.fillRoundedRect(-iconSize / 2, iconY - iconSize / 2, iconSize, iconSize, 8);
      fallbackBg.lineStyle(1, accentColor, 0.4);
      fallbackBg.strokeRoundedRect(-iconSize / 2, iconY - iconSize / 2, iconSize, iconSize, 8);
      elements.push(fallbackBg);

      const fallbackText = scene.add.text(0, iconY, '?', {
        fontSize: '24px',
        fontFamily: 'Ubuntu, sans-serif',
        fontStyle: 'bold',
        color: '#555555',
      }).setOrigin(0.5);
      elements.push(fallbackText);
    }

    const title = scene.add.text(0, 100, cardInfo.name, {
      fontSize: '14px',
      fontFamily: 'Ubuntu, sans-serif',
      fontStyle: 'bold',
      color: textColor,
      align: 'center',
      wordWrap: { width: cardWidth - 20 },
    }).setOrigin(0.5, 0);
    elements.push(title);

    if (isMinorCard(cardId)) {
      const minorInfo = MinorCardData[cardId];
      const nextVal = getMinorNextValue(cardId, currentStacks);
      const totalPct = getMinorTotalPercent(cardId, currentStacks);

      const valueText = nextVal !== null ? `+${nextVal}% ${minorInfo.description}` : 'MAXED';
      const valColor = nextVal !== null ? '#66ff66' : '#ff6666';
      const valDisplay = scene.add.text(0, 135, valueText, {
        fontSize: '13px',
        fontFamily: 'Ubuntu, sans-serif',
        fontStyle: 'bold',
        color: valColor,
        align: 'center',
      }).setOrigin(0.5, 0);
      elements.push(valDisplay);

      const stackText = `${currentStacks}/${minorInfo.max} stacks`;
      const stackDisplay = scene.add.text(0, 158, stackText, {
        fontSize: '11px',
        fontFamily: 'Ubuntu, sans-serif',
        color: '#888888',
      }).setOrigin(0.5, 0);
      elements.push(stackDisplay);

      if (totalPct > 0) {
        const totalDisplay = scene.add.text(0, 176, `Total: +${totalPct}%`, {
          fontSize: '11px',
          fontFamily: 'Ubuntu, sans-serif',
          color: '#7799cc',
        }).setOrigin(0.5, 0);
        elements.push(totalDisplay);
      }

      const barWidth = cardWidth - 40;
      const barX = -barWidth / 2;
      const barY = 210;
      const barBg = scene.add.graphics();
      barBg.fillStyle(0x2a2a2a, 1);
      barBg.fillRoundedRect(barX, barY, barWidth, 6, 3);
      const fillWidth = barWidth * (currentStacks / minorInfo.max);
      if (fillWidth > 0) {
        barBg.fillStyle(accentColor, 1);
        barBg.fillRoundedRect(barX, barY, fillWidth, 6, 3);
      }
      elements.push(barBg);

    } else {
      const majorInfo = MajorCardData[cardId];

      const posText = scene.add.text(0, 135, majorInfo.positiveText, {
        fontSize: '11px',
        fontFamily: 'Ubuntu, sans-serif',
        color: '#66ff66',
        align: 'center',
        wordWrap: { width: cardWidth - 20 },
      }).setOrigin(0.5, 0);
      elements.push(posText);

      const divider = scene.add.graphics();
      divider.lineStyle(1, 0x2f2f2f, 1);
      divider.lineBetween(-cardWidth / 2 + 15, 185, cardWidth / 2 - 15, 185);
      elements.push(divider);

      const negText = scene.add.text(0, 193, majorInfo.negativeText, {
        fontSize: '11px',
        fontFamily: 'Ubuntu, sans-serif',
        color: '#ff6666',
        align: 'center',
        wordWrap: { width: cardWidth - 20 },
      }).setOrigin(0.5, 0);
      elements.push(negText);
    }

    const cardContainer = scene.add.container(x, y, elements) as Phaser.GameObjects.Container;

    const hitZone = scene.add.zone(0, cardHeight / 2, cardWidth, cardHeight).setInteractive();
    cardContainer.add(hitZone);

    hitZone.on('pointerover', () => {
      scene.tweens.add({
        targets: cardContainer,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 100,
        ease: 'Power2',
      });
    });

    hitZone.on('pointerout', () => {
      scene.tweens.add({
        targets: cardContainer,
        scaleX: 1,
        scaleY: 1,
        duration: 100,
        ease: 'Power2',
      });
    });

    hitZone.on('pointerdown', () => {
      const flash = scene.add.graphics();
      flash.fillStyle(0xffffff, 0.3);
      flash.fillRoundedRect(-cardWidth / 2, 0, cardWidth, cardHeight, 10);
      cardContainer.add(flash);
      scene.tweens.add({
        targets: flash,
        alpha: 0,
        duration: 200,
        onComplete: () => flash.destroy(),
      });

      this.playerClicked = true;
      this.game.gameState.selectedCard = cardId;

      if (isMajorCard(cardId)) {
        this.game.gameState.majorOfferPositions[cardId] = offerIndex;
      }

      scene.tweens.add({
        targets: cardContainer,
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 100,
        yoyo: true,
      });
    });

    return cardContainer;
  }

  createActionButton(scene: Phaser.Scene, isMajor: boolean, rerollsAvailable: number) {
    if (this.actionButton) {
      this.actionButton.destroy();
      this.actionButton = null;
    }

    const disabled = !isMajor && (rerollsAvailable <= 0 || this.actionButtonUsed);

    const { width, height } = this.game.scale;
    const btnW = 200;
    const btnH = 40;
    const btnX = width / (2 * this.scale);
    const btnY = height * 0.78 / this.scale;

    const elements: Phaser.GameObjects.GameObject[] = [];

    const bg = scene.add.graphics();
    const btnColor = isMajor ? 0xd4a017 : (disabled ? 0x555555 : 0x4488ff);
    bg.fillStyle(btnColor, disabled ? 0.08 : 0.15);
    bg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 8);
    bg.lineStyle(2, btnColor, disabled ? 0.3 : 0.6);
    bg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 8);
    elements.push(bg);

    const label = isMajor ? 'Skip (3 random cards)' : (this.actionButtonUsed ? 'Reroll Used' : `Reroll (${rerollsAvailable})`);
    const btnTextColor = disabled ? '#555555' : (isMajor ? '#d4a017' : '#4488ff');
    const text = scene.add.text(0, 0, label, {
      fontSize: '15px',
      fontFamily: 'Ubuntu, sans-serif',
      fontStyle: 'bold',
      color: btnTextColor,
    }).setOrigin(0.5);
    elements.push(text);

    const btnContainer = scene.add.container(btnX, btnY, elements);

    if (!disabled) {
      const hitZone = scene.add.zone(0, 0, btnW, btnH).setInteractive();
      btnContainer.add(hitZone);

      hitZone.on('pointerover', () => {
        if (this.actionButtonUsed) return;
        scene.tweens.add({ targets: btnContainer, scaleX: 1.05, scaleY: 1.05, duration: 80 });
      });
      hitZone.on('pointerout', () => {
        scene.tweens.add({ targets: btnContainer, scaleX: 1, scaleY: 1, duration: 80 });
      });
      hitZone.on('pointerdown', () => {
        if (this.actionButtonUsed) return;
        this.actionButtonUsed = true;
        if (isMajor) {
          btnContainer.setAlpha(0.4);
          this.game.gameState.skipMajorCard = true;
        } else {
          this.game.gameState.rerollCard = true;
          bg.clear();
          bg.fillStyle(0x555555, 0.08);
          bg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 8);
          bg.lineStyle(2, 0x555555, 0.3);
          bg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 8);
          text.setText('Reroll Used');
          text.setColor('#555555');
          hitZone.disableInteractive();
        }
      });
    }

    this.actionButton = btnContainer;
    (this.container as Phaser.GameObjects.Container).add(btnContainer);
  }

  clearCards() {
    for (const card of this.cardContainers) {
      card.destroy();
    }
    this.cardContainers = [];
    this.cardIdMap.clear();
    if (this.actionButton) {
      this.actionButton.destroy();
      this.actionButton = null;
    }
  }

  show() {
    if (!this.container) return;
    this.isShowing = true;
    this.container.setVisible(true);
    this.container.setAlpha(0);
    this.rebuildLayout();
    this.hud.scene?.tweens.add({
      targets: this.container,
      alpha: 1,
      duration: 200,
    });
  }

  flashCardAndHide(cardId: number) {
    if (this.hiding) return;
    this.hiding = true;
    const cardContainer = this.cardIdMap.get(cardId);
    const scene = this.hud.scene;

    if (cardContainer && scene) {
      const flash = scene.add.graphics();
      flash.fillStyle(0xffffff, 0.3);
      flash.fillRoundedRect(-cardWidth / 2, 0, cardWidth, cardHeight, 10);
      cardContainer.add(flash);

      scene.tweens.add({
        targets: cardContainer,
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 150,
        yoyo: true,
      });

      scene.tweens.add({
        targets: flash,
        alpha: 0,
        duration: 300,
      });

      scene.time.delayedCall(400, () => {
        this.hide();
      });
    } else {
      this.hide();
    }
  }

  hide() {
    if (!this.container || !this.isShowing) return;
    this.isShowing = false;
    this.hiding = false;
    this.hud.scene?.tweens.add({
      targets: this.container,
      alpha: 0,
      duration: 150,
      onComplete: () => {
        this.container?.setVisible(false);
        this.clearCards();
        this.lastOffersKey = '';
      },
    });
    if (this.timerPulse) {
      this.timerPulse.destroy();
      this.timerPulse = null;
    }
  }

  update(dt: number) {
    const player = this.game.gameState.self.entity;
    if (!player || !this.container) return;

    const choosingCard = (player as any).choosingCard;
    const cardOffers: number[] = (player as any).cardOffers || [];
    const chosenCards: number[] = (player as any).chosenCards || [];
    const cardTimer: number = (player as any).cardTimer || 0;

    if (choosingCard && !this.wasChoosing) {
      this.actionButtonUsed = false;
    }

    if (choosingCard && cardOffers.length > 0) {
      const offersKey = cardOffers.join(',');
      if (offersKey !== this.lastOffersKey) {
        this.lastOffersKey = offersKey;
        this.playerClicked = false;
        this.hiding = false;
        if (this.isShowing) {
          this.clearCards();
        }
        this.showCards(cardOffers, chosenCards);
        if (!this.isShowing) {
          this.show();
        }
      }

      if (this.timerText) {
        if (cardTimer > 900) {
          this.timerText.setText('');
        } else {
          const seconds = Math.ceil(cardTimer);
          this.timerText.setText(`\u23F1 ${seconds}s`);

          if (cardTimer <= 5) {
            this.timerText.setColor('#ff4444');
            if (!this.timerPulse && this.hud.scene) {
              this.timerPulse = this.hud.scene.tweens.add({
                targets: this.timerText,
                scaleX: 1.2,
                scaleY: 1.2,
                duration: 400,
                yoyo: true,
                repeat: -1,
              });
            }
          } else {
            this.timerText.setColor(textColor);
            if (this.timerPulse) {
              this.timerPulse.destroy();
              this.timerPulse = null;
              this.timerText.setScale(1);
            }
          }
        }
      }
    } else if (this.isShowing && !this.hiding) {
      if (!this.playerClicked && chosenCards.length > this.lastChosenCards.length) {
        const autoSelectedId = chosenCards[chosenCards.length - 1];
        this.flashCardAndHide(autoSelectedId);
      } else {
        this.hide();
      }
    }

    this.wasChoosing = choosingCard;
    this.lastChosenCards = chosenCards;
  }
}

export default CardSelect;
