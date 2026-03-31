import HudComponent from './HudComponent';
import { MinorCardData, MajorCardData, isMinorCard, isMajorCard, getMinorTotalPercent, countStacks } from '../CardData';

class CardSummary extends HudComponent {
  summaryContainer: Phaser.GameObjects.Container | null = null;
  bgGraphics: Phaser.GameObjects.Graphics | null = null;
  lastChosenKey = '';
  items: Phaser.GameObjects.GameObject[] = [];
  wasShowing = false;

  initialize() {
    if (!this.hud.scene) return;
    const scene = this.hud.scene;
    this.bgGraphics = scene.add.graphics();
    this.summaryContainer = scene.add.container(0, 0, [this.bgGraphics]);
    this.container = scene.add.container(0, 0, [this.summaryContainer]);
    this.container.setDepth(102);
    this.summaryContainer.setAlpha(0);
  }

  resize() {
    if (this.wasShowing) this.rebuild();
  }

  rebuild() {
    if (!this.summaryContainer || !this.bgGraphics) return;
    const player = this.game.gameState.self.entity;
    if (!player) return;

    const chosenCards: number[] = (player as any).chosenCards || [];
    if (chosenCards.length === 0) return;

    for (const item of this.items) item.destroy();
    this.items = [];
    this.bgGraphics.clear();

    const scene = this.hud.scene!;
    const { width, height } = this.game.scale;
    const stacks = countStacks(chosenCards);

    const majorEntries: { id: number; stacks: number; offerPos: number }[] = [];
    const minorEntries: { id: number; stacks: number }[] = [];
    const seen = new Set<number>();
    const majorPositions = this.game.gameState.majorOfferPositions;

    for (const id of chosenCards) {
      if (!seen.has(id)) {
        seen.add(id);
        if (isMajorCard(id)) {
          const offerPos = majorPositions[id] ?? 0;
          majorEntries.push({ id, stacks: stacks[id] || 1, offerPos });
        } else {
          minorEntries.push({ id, stacks: stacks[id] || 1 });
        }
      }
    }

    const iconSize = 16;
    const itemGap = 6;
    const separatorWidth = 8;
    const y = height * 0.30 / this.scale;
    const hasMajors = majorEntries.length > 0;
    const hasMinors = minorEntries.length > 0;

    const majorItemWidth = iconSize;
    const majorTotalWidth = majorEntries.length * (majorItemWidth + itemGap) - (majorEntries.length > 0 ? itemGap : 0);

    const minorWidths: number[] = [];
    for (const { id, stacks: stackCount } of minorEntries) {
      const totalPct = getMinorTotalPercent(id, stackCount);
      const label = `+${totalPct}%`;
      const textWidth = label.length * 7;
      minorWidths.push(iconSize + 2 + textWidth);
    }
    const minorTotalWidth = minorWidths.length > 0
      ? minorWidths.reduce((a, b) => a + b, 0) + (minorWidths.length - 1) * itemGap
      : 0;

    const sepSpace = (hasMajors && hasMinors) ? separatorWidth + itemGap * 2 : 0;
    const totalWidth = majorTotalWidth + sepSpace + minorTotalWidth;
    const startX = (width / this.scale - totalWidth) / 2;

    this.bgGraphics.fillStyle(0x000000, 0.5);
    this.bgGraphics.fillRoundedRect(startX - 8, y - 4, totalWidth + 16, iconSize + 8, 10);

    let curX = startX;

    for (let i = 0; i < majorEntries.length; i++) {
      const { offerPos } = majorEntries[i];
      const iconKey = `card_major${offerPos + 1}`;

      if (scene.textures.exists(iconKey)) {
        const icon = scene.add.image(curX + iconSize / 2, y + iconSize / 2, iconKey);
        const frame = icon.frame;
        const s = Math.min(iconSize / frame.width, iconSize / frame.height);
        icon.setScale(s);
        this.summaryContainer.add(icon);
        this.items.push(icon);
      } else {
        const dot = scene.add.graphics();
        dot.fillStyle(0xd4a017, 1);
        dot.fillCircle(curX + iconSize / 2, y + iconSize / 2, iconSize / 3);
        dot.lineStyle(1, 0xffd700, 1);
        dot.strokeCircle(curX + iconSize / 2, y + iconSize / 2, iconSize / 3);
        this.summaryContainer.add(dot);
        this.items.push(dot);
      }

      curX += majorItemWidth + itemGap;
    }

    if (hasMajors && hasMinors) {
      curX -= itemGap;
      curX += itemGap;
      const sep = scene.add.graphics();
      sep.lineStyle(1, 0x666666, 0.8);
      sep.lineBetween(curX + separatorWidth / 2, y, curX + separatorWidth / 2, y + iconSize);
      this.summaryContainer.add(sep);
      this.items.push(sep);
      curX += separatorWidth + itemGap;
    }

    for (let i = 0; i < minorEntries.length; i++) {
      const { id, stacks: stackCount } = minorEntries[i];
      const cardInfo = MinorCardData[id];
      if (!cardInfo) continue;

      const color = cardInfo.color;
      const hexColor = '#' + color.toString(16).padStart(6, '0');
      const iconKey = cardInfo.icon;

      if (scene.textures.exists(iconKey)) {
        const icon = scene.add.image(curX + iconSize / 2, y + iconSize / 2, iconKey);
        const frame = icon.frame;
        const s = Math.min(iconSize / frame.width, iconSize / frame.height);
        icon.setScale(s);
        this.summaryContainer.add(icon);
        this.items.push(icon);
      } else {
        const dot = scene.add.graphics();
        dot.fillStyle(color, 1);
        dot.fillCircle(curX + iconSize / 2, y + iconSize / 2, iconSize / 3);
        this.summaryContainer.add(dot);
        this.items.push(dot);
      }

      const totalPct = getMinorTotalPercent(id, stackCount);
      const text = scene.add.text(curX + iconSize + 2, y, `+${totalPct}%`, {
        fontSize: '11px',
        fontFamily: 'Ubuntu, sans-serif',
        fontStyle: 'bold',
        color: hexColor,
        stroke: '#000000',
        strokeThickness: 2,
      });
      this.summaryContainer.add(text);
      this.items.push(text);

      curX += minorWidths[i] + itemGap;
    }
  }

  update() {
    const player = this.game.gameState.self.entity;
    if (!player || !this.summaryContainer) return;

    const shouldShow = false;
    const chosenCards: number[] = (player as any).chosenCards || [];

    const key = chosenCards.join(',');
    if (key !== this.lastChosenKey) {
      this.lastChosenKey = key;
      if (shouldShow) this.rebuild();
    }

    if (shouldShow && !this.wasShowing) {
      this.rebuild();
      this.hud.scene?.tweens.killTweensOf(this.summaryContainer);
      this.summaryContainer.setAlpha(0);
      this.summaryContainer.y = 10 / this.scale;
      this.hud.scene?.tweens.add({
        targets: this.summaryContainer,
        alpha: 1,
        y: 0,
        duration: 300,
        ease: 'Back.easeOut',
      });
      this.wasShowing = true;
    } else if (!shouldShow && this.wasShowing) {
      this.hud.scene?.tweens.killTweensOf(this.summaryContainer);
      this.hud.scene?.tweens.add({
        targets: this.summaryContainer,
        alpha: 0,
        y: 10 / this.scale,
        duration: 200,
        ease: 'Power2',
        onComplete: () => {
          this.summaryContainer?.setY(0);
        },
      });
      this.wasShowing = false;
    }
  }
}

export default CardSummary;
