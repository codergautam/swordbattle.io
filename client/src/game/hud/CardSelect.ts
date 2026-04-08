import HudComponent from './HudComponent';
import { MinorCardData, MajorCardData, StarterCardData, isMinorCard, isMajorCard, isStarterCard, getMinorTotalPercent, getMinorNextValue, countStacks } from '../CardData';

const bgColor = 0x141414;
const borderColor = 0x2f2f2f;
const textColor = '#e7e7e7';
const accentMinor = 0x4488ff;
const accentMajor = 0xd4a017;

const cardAspect = 7 / 5;

const panelPad = 14;
const slideDuration = 300;
const gradientWidth = 40;
const panelOpacity = 0.85;

class CardSelect extends HudComponent {
  backdrop: Phaser.GameObjects.Graphics | null = null;
  panelBg: Phaser.GameObjects.Graphics | null = null;
  panelGradient: Phaser.GameObjects.Graphics | null = null;
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
  isSliding = false;

  isMajorPick = false;
  actionButton: Phaser.GameObjects.Container | null = null;
  actionButtonUsed = false;
  closeButton: Phaser.GameObjects.Container | null = null;
  remainingText: Phaser.GameObjects.Text | null = null;

  _currentOffers: number[] = [];
  _currentChosenCards: number[] = [];

  initialize() {
    if (!this.hud.scene) return;
    const scene = this.hud.scene;

    this.backdrop = scene.add.graphics().setDepth(100);
    this.panelBg = scene.add.graphics().setDepth(100);
    this.panelGradient = scene.add.graphics().setDepth(100);

    this.headerText = scene.add.text(0, 0, 'SELECT AN\nUPGRADE', {
      fontSize: '18px', fontFamily: 'Ubuntu, sans-serif', fontStyle: 'bold',
      color: textColor, align: 'center',
    }).setOrigin(0.5).setDepth(101);

    this.timerText = scene.add.text(0, 0, '', {
      fontSize: '22px', fontFamily: 'Ubuntu, sans-serif', fontStyle: 'bold', color: textColor,
    }).setOrigin(0.5).setDepth(101);

    this.remainingText = scene.add.text(0, 0, '', {
      fontSize: '12px', fontFamily: 'Ubuntu, sans-serif', fontStyle: 'bold', color: '#888888',
    }).setOrigin(0.5).setDepth(101);

    this.container = scene.add.container(0, 0, [
      this.backdrop, this.panelBg, this.panelGradient,
      this.headerText, this.timerText, this.remainingText,
    ]);
    this.container.setDepth(100).setAlpha(0).setVisible(false);
  }

  resize() {
    if (!this.backdrop) return;
    this.rebuildLayout();
    if (this.isShowing && this._currentOffers.length > 0 && !this.isSliding) {
      this.clearCards();
      this.showCards(this._currentOffers, this._currentChosenCards);
    }
  }

  _isPortrait(): boolean {
    const { width, height } = this.game.scale;
    return height > width * 0.85;
  }

  _getPanelScreenWidth(): number {
    const { width } = this.game.scale;
    if (this._isPortrait()) return Math.max(260, Math.min(400, width * 0.55));
    return Math.max(190, Math.min(280, width * 0.17));
  }

  _getUiScale(cardW: number): number {
    return Math.max(0.7, cardW / 180);
  }

  _getPanelLayout() {
    const { height } = this.game.scale;
    const portrait = this._isPortrait();
    const panelScreenW = this._getPanelScreenWidth();
    const panelW = panelScreenW / this.scale;
    const panelH = height / this.scale;
    const pad = panelPad / this.scale;
    const centerX = panelW / 2;

    const uiS = this._getUiScale(panelScreenW - panelPad * 2);

    const closeBtnR = portrait ? 20 : 16;
    const closeY = pad + closeBtnR + 6 / this.scale;

    const headerFontSize = portrait ? 24 : 16;
    const headerY = closeY + closeBtnR + 8 / this.scale;
    const headerH = (headerFontSize * 2.2 + 6) / this.scale;
    const remainingFontSize = portrait ? 16 : 11;
    const remainingY = headerY + headerH;
    const remainingH = (remainingFontSize + 6) / this.scale;

    const cardsTopY = remainingY + remainingH;
    const actionBtnH = (portrait ? 44 : 28) / this.scale;
    const actionFontSize = portrait ? 18 : 12;
    const cardsBottomY = panelH - pad - actionBtnH - 10 / this.scale;
    const actionBtnY = panelH - pad - actionBtnH / 2;

    return { panelW, panelH, panelScreenW, pad, centerX, closeY, headerY, headerFontSize, remainingY, remainingFontSize, cardsTopY, cardsBottomY, actionBtnY, actionBtnH, actionFontSize, portrait, uiS };
  }

  rebuildLayout() {
    if (!this.backdrop || !this.headerText || !this.timerText || !this.panelBg || !this.panelGradient) return;

    this.backdrop.clear().setVisible(false);
    const layout = this._getPanelLayout();

    this.panelBg.clear();
    this.panelBg.fillStyle(0x000000, panelOpacity);
    this.panelBg.fillRoundedRect(-60 / this.scale, 0, layout.panelW + 60 / this.scale, layout.panelH, { tl: 0, tr: 12, bl: 0, br: 12 } as any);
    this.panelBg.setVisible(true);

    this.panelGradient.clear();
    this.panelGradient.setVisible(false);

    this.headerText.setPosition(layout.centerX, layout.headerY);
    this.headerText.setFontSize(layout.headerFontSize).setText('SELECT AN\nUPGRADE');
    this.headerText.setVisible(true);
    this.timerText.setPosition(layout.centerX, layout.headerY + 20 / this.scale);
    if (this.remainingText) {
      this.remainingText.setPosition(layout.centerX, layout.remainingY).setFontSize(layout.remainingFontSize);
    }
  }

  showCards(offers: number[], chosenCards: number[]) {
    if (!this.hud.scene || !this.container) return;
    const scene = this.hud.scene;
    this.clearCards();
    this._currentOffers = offers;
    this._currentChosenCards = chosenCards;

    const stacks = countStacks(chosenCards);
    const hasMajor = offers.some(id => isMajorCard(id));
    this.isMajorPick = hasMajor;

    const layout = this._getPanelLayout();
    const numCards = offers.length;

    const maxW = layout.panelW - layout.pad * 2;
    const availableH = layout.cardsBottomY - layout.cardsTopY;
    const cardGapLocal = availableH * 0.03;
    const maxH = (availableH - cardGapLocal * (numCards - 1)) / numCards;

    let cw: number, ch: number;
    if (maxW * cardAspect <= maxH) {
      cw = maxW;
      ch = cw * cardAspect;
    } else {
      ch = maxH;
      cw = ch / cardAspect;
    }

    const totalH = numCards * ch + (numCards - 1) * cardGapLocal;
    const startY = layout.cardsTopY + (availableH - totalH) / 2;

    for (let i = 0; i < numCards; i++) {
      const cardId = offers[i];
      const y = startY + i * (ch + cardGapLocal);
      const cc = this.createCard(scene, cardId, stacks[cardId] || 0, layout.centerX, y, i, 1, cw, ch);
      (this.container as Phaser.GameObjects.Container).add(cc);
      this.cardContainers.push(cc);
      this.cardIdMap.set(cardId, cc);
    }

    const player = this.game.gameState.self.entity;
    const isTutorial = player && (player as any).isTutorial;
    if (!isTutorial) {
      const rerolls: number = player ? (player as any).rerollsAvailable || 0 : 0;
      this.createActionButton(scene, hasMajor, rerolls, layout);
      this.createCloseButton(scene, layout);
    }
  }

  createCard(scene: Phaser.Scene, cardId: number, currentStacks: number, x: number, y: number, offerIndex: number, baseScale: number, cw: number, ch: number): Phaser.GameObjects.Container {
    const isMajor = isMajorCard(cardId);
    const isStarter = isStarterCard(cardId);
    const accentColor = isStarter ? 0xffd700 : (isMajor ? accentMajor : accentMinor);
    const cardInfo = isStarter ? StarterCardData[cardId] : (isMajor ? MajorCardData[cardId] : MinorCardData[cardId]);
    if (!cardInfo) return scene.add.container(x, y);

    const elements: Phaser.GameObjects.GameObject[] = [];

    const bg = scene.add.graphics();
    bg.fillStyle(bgColor, 1);
    bg.fillRoundedRect(-cw / 2, 0, cw, ch, 10);
    bg.lineStyle(3, borderColor, 1);
    bg.strokeRoundedRect(-cw / 2, 0, cw, ch, 10);
    elements.push(bg);

    const accentLine = scene.add.graphics();
    accentLine.fillStyle(accentColor, 1);
    accentLine.fillRoundedRect(-cw / 2 + 3, 3, cw - 6, 4, 2);
    elements.push(accentLine);

    const padTop = ch * 0.08;
    const padBottom = ch * 0.05;
    const contentTop = padTop;
    const contentH = ch - padTop - padBottom;
    const tScale = cw / 140;

    if (isStarterCard(cardId)) {
      const starterInfo = StarterCardData[cardId];
      const z = contentH / 3;

      const iconSz = Math.min(z * 0.6, cw * 0.28);
      const iconY = contentTop + z * 0.45;
      if (scene.textures.exists(starterInfo.icon)) {
        const img = scene.add.image(0, iconY, starterInfo.icon);
        img.setScale(Math.min(iconSz / img.frame.width, iconSz / img.frame.height));
        elements.push(img);
      } else {
        const fb = scene.add.graphics();
        fb.fillStyle(0xffd700, 0.15);
        fb.fillRoundedRect(-iconSz / 2, iconY - iconSz / 2, iconSz, iconSz, 8);
        elements.push(fb);
      }

      const titleSz = Math.round(Math.max(9, Math.min(18, z * 0.3 * tScale)));
      elements.push(scene.add.text(0, contentTop + z * 1.2, starterInfo.name, {
        fontSize: `${titleSz}px`, fontFamily: 'Ubuntu, sans-serif', fontStyle: 'bold',
        color: '#ffd700', align: 'center', wordWrap: { width: cw - 12 },
      }).setOrigin(0.5));

      const boostSz = Math.round(Math.max(8, Math.min(15, z * 0.28 * tScale)));
      elements.push(scene.add.text(0, contentTop + z * 1.95, starterInfo.boostText, {
        fontSize: `${boostSz}px`, fontFamily: 'Ubuntu, sans-serif', fontStyle: 'bold',
        color: '#66ff66', align: 'center', wordWrap: { width: cw - 12 },
      }).setOrigin(0.5));
    } else if (isMinorCard(cardId)) {
      const minorInfo = MinorCardData[cardId];
      const nextVal = getMinorNextValue(cardId, currentStacks);
      const totalPct = getMinorTotalPercent(cardId, currentStacks);
      const z = contentH / 4;

      const iconSz = Math.min(z * 0.75, cw * 0.32);
      const iconY = contentTop + z * 0.5;
      if (scene.textures.exists(cardInfo.icon)) {
        const img = scene.add.image(0, iconY, cardInfo.icon);
        img.setScale(Math.min(iconSz / img.frame.width, iconSz / img.frame.height));
        elements.push(img);
      } else {
        const fb = scene.add.graphics();
        fb.fillStyle(accentColor, 0.15);
        fb.fillRoundedRect(-iconSz / 2, iconY - iconSz / 2, iconSz, iconSz, 8);
        elements.push(fb);
      }

      const titleSz = Math.round(Math.max(9, Math.min(22, z * 0.4 * tScale)));
      elements.push(scene.add.text(0, contentTop + z * 1.5, minorInfo.description, {
        fontSize: `${titleSz}px`, fontFamily: 'Ubuntu, sans-serif', fontStyle: 'bold',
        color: textColor, align: 'center', wordWrap: { width: cw - 12 },
      }).setOrigin(0.5));

      const boostSz = Math.round(Math.max(9, Math.min(20, z * 0.38 * tScale)));
      const valText = nextVal !== null ? minorInfo.plainBoost : 'MAXED';
      elements.push(scene.add.text(0, contentTop + z * 2.5, valText, {
        fontSize: `${boostSz}px`, fontFamily: 'Ubuntu, sans-serif', fontStyle: 'bold',
        color: nextVal !== null ? '#66ff66' : '#ff6666', align: 'center',
      }).setOrigin(0.5));

      const stackSz = Math.round(Math.max(7, Math.min(16, z * 0.28 * tScale)));
      const stackLine = totalPct > 0 ? `${currentStacks}/${minorInfo.max}  ·  Total: +${totalPct}%` : `${currentStacks}/${minorInfo.max} stacks`;
      elements.push(scene.add.text(0, contentTop + z * 3.2, stackLine, {
        fontSize: `${stackSz}px`, fontFamily: 'Ubuntu, sans-serif', color: '#888888',
      }).setOrigin(0.5));

      const barW = cw * 0.75;
      const barY = contentTop + z * 3.65;
      const barBg = scene.add.graphics();
      barBg.fillStyle(0x2a2a2a, 1);
      barBg.fillRoundedRect(-barW / 2, barY, barW, 6, 3);
      const fillW = barW * (currentStacks / minorInfo.max);
      if (fillW > 0) { barBg.fillStyle(accentColor, 1); barBg.fillRoundedRect(-barW / 2, barY, fillW, 6, 3); }
      elements.push(barBg);
    } else {
      const majorInfo = MajorCardData[cardId];
      const z = contentH / 5;

      const iconSz = Math.min(z * 0.75, cw * 0.22);
      const iconY = contentTop + z * 0.5;
      const iconKey = `card_major${offerIndex + 1}`;
      if (scene.textures.exists(iconKey)) {
        const img = scene.add.image(0, iconY, iconKey);
        img.setScale(Math.min(iconSz / img.frame.width, iconSz / img.frame.height));
        elements.push(img);
      } else {
        const fb = scene.add.graphics();
        fb.fillStyle(accentColor, 0.15);
        fb.fillRoundedRect(-iconSz / 2, iconY - iconSz / 2, iconSz, iconSz, 8);
        elements.push(fb);
      }

      const titleSz = Math.round(Math.max(9, Math.min(20, z * 0.45 * tScale)));
      elements.push(scene.add.text(0, contentTop + z * 1.5, cardInfo.name, {
        fontSize: `${titleSz}px`, fontFamily: 'Ubuntu, sans-serif', fontStyle: 'bold',
        color: textColor, align: 'center', wordWrap: { width: cw - 12 },
      }).setOrigin(0.5));

      const descSz = Math.round(Math.max(7, Math.min(15, z * 0.35 * tScale)));
      elements.push(scene.add.text(0, contentTop + z * 2.5, majorInfo.positiveText, {
        fontSize: `${descSz}px`, fontFamily: 'Ubuntu, sans-serif', color: '#66ff66',
        align: 'center', wordWrap: { width: cw - 12 },
      }).setOrigin(0.5));

      const divY = contentTop + z * 3.3;
      const div = scene.add.graphics();
      div.lineStyle(1, 0x2f2f2f, 1);
      div.lineBetween(-cw / 2 + 12, divY, cw / 2 - 12, divY);
      elements.push(div);

      elements.push(scene.add.text(0, contentTop + z * 4.1, majorInfo.negativeText, {
        fontSize: `${descSz}px`, fontFamily: 'Ubuntu, sans-serif', color: '#ff6666',
        align: 'center', wordWrap: { width: cw - 12 },
      }).setOrigin(0.5));
    }

    const cardContainer = scene.add.container(x, y, elements) as Phaser.GameObjects.Container;

    const hitZone = scene.add.zone(0, ch / 2, cw, ch).setInteractive();
    cardContainer.add(hitZone);

    hitZone.on('pointerover', () => {
      if (this.isSliding) return;
      scene.tweens.add({ targets: cardContainer, scaleX: baseScale * 1.05, scaleY: baseScale * 1.05, duration: 100, ease: 'Power2' });
    });
    hitZone.on('pointerout', () => {
      scene.tweens.add({ targets: cardContainer, scaleX: baseScale, scaleY: baseScale, duration: 100, ease: 'Power2' });
    });
    hitZone.on('pointerdown', () => {
      if (this.isSliding) return;
      const flash = scene.add.graphics();
      flash.fillStyle(0xffffff, 0.3);
      flash.fillRoundedRect(-cw / 2, 0, cw, ch, 10);
      cardContainer.add(flash);
      scene.tweens.add({ targets: flash, alpha: 0, duration: 200, onComplete: () => flash.destroy() });

      this.playerClicked = true;
      this.game.gameState.selectedCard = cardId;
      if (isMajorCard(cardId)) this.game.gameState.majorOfferPositions[cardId] = offerIndex;

      scene.tweens.add({ targets: cardContainer, scaleX: baseScale * 1.1, scaleY: baseScale * 1.1, duration: 100, yoyo: true });
    });

    return cardContainer;
  }

  createActionButton(scene: Phaser.Scene, isMajor: boolean, rerollsAvailable: number, layout: ReturnType<CardSelect['_getPanelLayout']>) {
    if (this.actionButton) { this.actionButton.destroy(); this.actionButton = null; }

    const disabled = !isMajor && (rerollsAvailable <= 0 || this.actionButtonUsed);
    const btnW = layout.panelW - layout.pad * 2;
    const btnH = layout.actionBtnH;
    const btnX = layout.centerX;
    const btnY = layout.actionBtnY;

    const elements: Phaser.GameObjects.GameObject[] = [];

    const bg = scene.add.graphics();
    const btnColor = isMajor ? 0xd4a017 : (disabled ? 0x555555 : 0x4488ff);
    bg.fillStyle(btnColor, disabled ? 0.08 : 0.15);
    bg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 8);
    bg.lineStyle(2, btnColor, disabled ? 0.3 : 0.6);
    bg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 8);
    elements.push(bg);

    const label = isMajor ? 'Skip (3 random)' : (this.actionButtonUsed ? 'Reroll Used' : `Reroll (${rerollsAvailable})`);
    const btnTextColor = disabled ? '#555555' : (isMajor ? '#d4a017' : '#4488ff');
    const text = scene.add.text(0, 0, label, {
      fontSize: `${layout.actionFontSize}px`, fontFamily: 'Ubuntu, sans-serif', fontStyle: 'bold', color: btnTextColor,
    }).setOrigin(0.5);
    elements.push(text);

    const btnContainer = scene.add.container(btnX, btnY, elements);

    if (!disabled) {
      const hitZone = scene.add.zone(0, 0, btnW, btnH).setInteractive();
      btnContainer.add(hitZone);

      hitZone.on('pointerover', () => {
        if (this.actionButtonUsed || this.isSliding) return;
        scene.tweens.add({ targets: btnContainer, scaleX: 1.05, scaleY: 1.05, duration: 80 });
      });
      hitZone.on('pointerout', () => {
        scene.tweens.add({ targets: btnContainer, scaleX: 1, scaleY: 1, duration: 80 });
      });
      hitZone.on('pointerdown', () => {
        if (this.actionButtonUsed || this.isSliding) return;
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
          text.setText('Reroll Used'); text.setColor('#555555');
          hitZone.disableInteractive();
        }
      });
    }

    this.actionButton = btnContainer;
    (this.container as Phaser.GameObjects.Container).add(btnContainer);
  }

  createCloseButton(scene: Phaser.Scene, layout: ReturnType<CardSelect['_getPanelLayout']>) {
    if (this.closeButton) { this.closeButton.destroy(); this.closeButton = null; }

    const radius = layout.portrait ? 20 : 16;
    const btnX = layout.panelW - layout.pad - radius - 4 / this.scale;
    const btnY = layout.closeY;
    const closeFontSize = layout.portrait ? '22px' : '18px';
    const elements: Phaser.GameObjects.GameObject[] = [];

    const bg = scene.add.graphics();
    bg.fillStyle(0x222222, 0.9); bg.fillCircle(0, 0, radius);
    bg.lineStyle(2, 0x555555, 1); bg.strokeCircle(0, 0, radius);
    elements.push(bg);

    const xText = scene.add.text(0, 0, '\u2715', {
      fontSize: closeFontSize, fontFamily: 'Ubuntu, sans-serif', fontStyle: 'bold', color: '#aaaaaa',
    }).setOrigin(0.5);
    elements.push(xText);

    const btnContainer = scene.add.container(btnX, btnY, elements);
    const hitZone = scene.add.zone(0, 0, radius * 2 + 10, radius * 2 + 10).setInteractive({ useHandCursor: true });
    btnContainer.add(hitZone);

    hitZone.on('pointerover', () => {
      bg.clear(); bg.fillStyle(0x333333, 0.9); bg.fillCircle(0, 0, radius);
      bg.lineStyle(2, 0xaa3333, 1); bg.strokeCircle(0, 0, radius); xText.setColor('#ff4444');
    });
    hitZone.on('pointerout', () => {
      bg.clear(); bg.fillStyle(0x222222, 0.9); bg.fillCircle(0, 0, radius);
      bg.lineStyle(2, 0x555555, 1); bg.strokeCircle(0, 0, radius); xText.setColor('#aaaaaa');
    });
    hitZone.on('pointerdown', () => {
      if (this.isSliding) return;
      this.game.gameState.closeCardSelect = true;
      this.hide();
    });

    this.closeButton = btnContainer;
    (this.container as Phaser.GameObjects.Container).add(btnContainer);
  }

  clearCards() {
    for (const card of this.cardContainers) card.destroy();
    this.cardContainers = [];
    this.cardIdMap.clear();
    if (this.actionButton) { this.actionButton.destroy(); this.actionButton = null; }
    if (this.closeButton) { this.closeButton.destroy(); this.closeButton = null; }
  }

  show() {
    if (!this.container) return;
    this.isShowing = true;
    this.container.setVisible(true);
    this.rebuildLayout();
    this.hud.scene?.tweens.killTweensOf(this.container);

    const panelScreenW = this._getPanelScreenWidth();
    this.container.setAlpha(1);
    (this.container as Phaser.GameObjects.Container).x = -panelScreenW;
    this.isSliding = true;
    this.hud.scene?.tweens.add({
      targets: this.container, x: 0, duration: slideDuration, ease: 'Cubic.easeOut',
      onComplete: () => { this.isSliding = false; },
    });
    for (let i = 0; i < this.cardContainers.length; i++) {
      const card = this.cardContainers[i];
      const targetX = card.x;
      card.x = targetX - (40 / this.scale);
      this.hud.scene?.tweens.add({ targets: card, x: targetX, duration: slideDuration + 100, ease: 'Back.easeOut', delay: i * 60 });
    }
  }

  flashCardAndHide(cardId: number) {
    if (this.hiding) return;
    this.hiding = true;
    const cc = this.cardIdMap.get(cardId);
    const scene = this.hud.scene;
    const bs = cc?.scaleX || 1;

    if (cc && scene) {
      scene.tweens.add({ targets: cc, scaleX: bs * 1.1, scaleY: bs * 1.1, duration: 150, yoyo: true });
      scene.time.delayedCall(300, () => { this.hide(); });
    } else {
      this.hide();
    }
  }

  hide() {
    if (!this.container || !this.isShowing) return;
    this.isShowing = false;
    this.hiding = false;
    this.hud.scene?.tweens.killTweensOf(this.container);

    const panelScreenW = this._getPanelScreenWidth();
    this.isSliding = true;
    this.hud.scene?.tweens.add({
      targets: this.container, x: -panelScreenW, duration: slideDuration, ease: 'Cubic.easeIn',
      onComplete: () => { this.container?.setVisible(false); this.clearCards(); this.lastOffersKey = ''; this.isSliding = false; },
    });
    if (this.timerPulse) { this.timerPulse.destroy(); this.timerPulse = null; }
  }

  update(dt: number) {
    const player = this.game.gameState.self.entity;
    if (!player || !this.container) return;



    const choosingCard = (player as any).choosingCard;
    const cardOffers: number[] = (player as any).cardOffers || [];
    const chosenCards: number[] = (player as any).chosenCards || [];

    const pendingPicks: number = (player as any).pendingPicks || 0;

    if (choosingCard && cardOffers.length > 0) {
      const offersKey = cardOffers.join(',');
      if (offersKey !== this.lastOffersKey) {
        if (chosenCards.length > this.lastChosenCards.length) {
          this.actionButtonUsed = false;
        }
        this.lastOffersKey = offersKey;
        this.playerClicked = false;
        this.hiding = false;
        if (this.isShowing) this.clearCards();
        this.showCards(cardOffers, chosenCards);
        if (!this.isShowing) this.show();
      }

      if (this.remainingText) {
        if (pendingPicks > 1) {
          this.remainingText.setText(`${pendingPicks - 1} more upgrade${pendingPicks - 1 > 1 ? 's' : ''} remaining`);
          this.remainingText.setVisible(true);
        } else {
          this.remainingText.setVisible(false);
        }
      }
      if (this.timerText) this.timerText.setText('');
    } else if (this.isShowing && !this.hiding) {
      if (!this.playerClicked && chosenCards.length > this.lastChosenCards.length) {
        this.flashCardAndHide(chosenCards[chosenCards.length - 1]);
      } else {
        this.hide();
      }
    }

    this.wasChoosing = choosingCard;
    this.lastChosenCards = chosenCards;
  }
}

export default CardSelect;
