import HudComponent from './HudComponent';
import { BiomeTypes } from '../Types';

interface TextSegment { text: string; color: string; }

function parseColoredText(input: string): TextSegment[] {
  const segments: TextSegment[] = [];
  const regex = /\{(y|c)\}(.*?)\{\/\1\}/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(input)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: input.slice(lastIndex, match.index), color: '#ffffff' });
    }
    const color = match[1] === 'y' ? '#ffdd44' : '#44ffff';
    segments.push({ text: match[2], color });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < input.length) {
    segments.push({ text: input.slice(lastIndex), color: '#ffffff' });
  }
  return segments;
}

class TutorialOverlay extends HudComponent {
  panel = -1;
  active = false;
  panelContainer: Phaser.GameObjects.Container | null = null;
  bgGraphics: Phaser.GameObjects.Graphics | null = null;
  headerText: Phaser.GameObjects.Text | null = null;
  // Hidden text used only for height measurement
  bodyText: Phaser.GameObjects.Text | null = null;
  bodySegments: Phaser.GameObjects.Text[] = [];
  progressText: Phaser.GameObjects.Text | null = null;
  nextButton: Phaser.GameObjects.Container | null = null;
  nextButtonBg: Phaser.GameObjects.Graphics | null = null;
  nextButtonText: Phaser.GameObjects.Text | null = null;
  hasSwung = false;
  isDead = false;
  isMobile = false;
  pulseTimer = 0;
  lastCardPickNumber = 0;
  shownUpgradePanel = false;
  gameIsPlaying = false;

  initialize() {
    if (!this.hud.scene) return;
    const scene = this.hud.scene;
    this.isMobile = this.game.isMobile;

    this.bgGraphics = scene.add.graphics();
    this.headerText = scene.add.text(0, 12, 'Tutorial', {
      fontSize: '18px', fontFamily: 'Ubuntu, sans-serif', fontStyle: 'bold',
      color: '#ffd700', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5, 0);

    // Hidden text for height measurement
    this.bodyText = scene.add.text(0, 38, '', {
      fontSize: '13px', fontFamily: 'Ubuntu, sans-serif',
      color: '#ffffff', stroke: '#000000', strokeThickness: 2,
      wordWrap: { width: 420 }, lineSpacing: 6,
    }).setOrigin(0.5, 0).setAlpha(0);

    this.progressText = scene.add.text(0, 0, '', {
      fontSize: '14px', fontFamily: 'Ubuntu, sans-serif', fontStyle: 'bold',
      color: '#ffdd44', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5, 0);

    this.nextButtonBg = scene.add.graphics();
    this.nextButtonText = scene.add.text(0, 0, 'Next \u2192', {
      fontSize: '14px', fontFamily: 'Ubuntu, sans-serif', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5);
    const nextHit = scene.add.zone(0, 0, 120, 32).setInteractive({ useHandCursor: true });
    nextHit.on('pointerdown', () => this.advancePanel());
    nextHit.on('pointerover', () => this._drawNextButton(true));
    nextHit.on('pointerout', () => this._drawNextButton(false));
    this.nextButton = scene.add.container(0, 0, [this.nextButtonBg, this.nextButtonText, nextHit]);

    this.panelContainer = scene.add.container(0, 0, [
      this.bgGraphics, this.headerText, this.bodyText, this.progressText, this.nextButton,
    ]);

    this.container = scene.add.container(0, 0, [this.panelContainer]);
    this.container.setDepth(105);
    this.container.setVisible(false);
  }

  _clearBodySegments() {
    for (const seg of this.bodySegments) seg.destroy();
    this.bodySegments = [];
  }

  _renderColoredBody(markup: string) {
    this._clearBodySegments();
    if (!this.panelContainer || !this.hud.scene) return;

    const scene = this.hud.scene;
    const segments = parseColoredText(markup);
    // Strip markup for plain text (used for height measurement)
    const plain = markup.replace(/\{\/?(y|c)\}/g, '');
    this.bodyText!.setText(plain);
    this.bodyText!.setPosition(0, 38);

    // Render each segment as an overlay text with the same word-wrap
    // We build the full text but color each segment by overlaying
    // Strategy: render one text per segment, using spaces for non-segment parts
    // Simpler approach: render full white text hidden, overlay colored segments
    // Simplest correct approach: build array of {text, color} and render as
    // a single pass using multiple overlapping text objects where non-matching
    // parts are transparent.

    // Build per-segment overlays: each segment gets a text object that has the
    // full string but with non-segment characters replaced by spaces — BUT
    // this doesn't work well with word-wrap because space widths differ.

    // Best approach: render each segment as its own text object that blanks
    // out everything except its portion. We'll use the Phaser text's built-in
    // word wrapping by giving each overlay the full string but making only
    // its portion visible (by coloring the rest transparent).

    // Actually the simplest reliable approach: build the full text, render it
    // multiple times — once per unique color — with characters outside each
    // color's range replaced by zero-width or transparent chars.

    // Even simpler: use one base white text (visible) and overlay colored texts
    // that mask their portions with the correct color and make the rest
    // fully transparent by using alpha tricks — but Phaser Text doesn't support
    // per-character alpha.

    // Most practical: render the plain text as white (visible), then for each
    // colored segment, create a copy of the full text but with everything
    // EXCEPT that segment replaced by spaces of the same width. This won't
    // align perfectly.

    // FINAL practical approach: Just render the full text in white as the base,
    // then overlay each highlighted phrase at the exact pixel position using
    // Phaser's getWrappedText + manual measurement.

    // Let's use a different tactic: render the whole body as white (visible),
    // then for each colored phrase, find its position in the wrapped text and
    // overlay a colored text at that position.

    const baseStyle = {
      fontSize: '13px', fontFamily: 'Ubuntu, sans-serif',
      color: '#ffffff', stroke: '#000000', strokeThickness: 2,
      wordWrap: { width: 420 }, lineSpacing: 6,
    };

    // Make the hidden text visible as the white base
    const baseText = scene.add.text(0, 38, plain, baseStyle).setOrigin(0.5, 0);
    this.panelContainer.add(baseText);
    this.bodySegments.push(baseText);

    // Now overlay colored words on top
    // Get the wrapped lines and find character positions
    const wrappedLines: string[] = baseText.getWrappedText(plain);
    const lineHeight = 13 + 6; // fontSize + lineSpacing

    // Build a char-to-position map
    // For each colored segment, find where it appears in the wrapped text
    // and place a colored text object on top

    let charIndex = 0;
    const lineStarts: number[] = [];
    for (const line of wrappedLines) {
      lineStarts.push(charIndex);
      charIndex += line.length + 1; // +1 for the newline that was consumed
    }

    // For each colored segment in the original markup
    let plainOffset = 0;
    for (const seg of segments) {
      if (seg.color !== '#ffffff') {
        // Find this text in the plain string starting from plainOffset
        const idx = plain.indexOf(seg.text, plainOffset);
        if (idx === -1) { plainOffset += seg.text.length; continue; }

        // Find which line(s) this segment falls on
        for (let li = 0; li < wrappedLines.length; li++) {
          const lineStart = lineStarts[li];
          const lineEnd = lineStart + wrappedLines[li].length;
          const segStart = idx;
          const segEnd = idx + seg.text.length;

          // Check overlap
          const overlapStart = Math.max(segStart, lineStart);
          const overlapEnd = Math.min(segEnd, lineEnd);
          if (overlapStart >= overlapEnd) continue;

          const lineText = wrappedLines[li];
          const localStart = overlapStart - lineStart;
          const localEnd = overlapEnd - lineStart;
          const before = lineText.substring(0, localStart);
          const colored = lineText.substring(localStart, localEnd);

          // Measure x offset of 'before' text
          const measureText = scene.add.text(0, 0, before, {
            fontSize: '13px', fontFamily: 'Ubuntu, sans-serif',
            stroke: '#000000', strokeThickness: 2,
          });
          const xOffset = measureText.width;
          measureText.destroy();

          // The base text is centered (origin 0.5, 0)
          // Each line starts at x = -lineWidth/2 relative to origin
          const lineMeasure = scene.add.text(0, 0, lineText, {
            fontSize: '13px', fontFamily: 'Ubuntu, sans-serif',
            stroke: '#000000', strokeThickness: 2,
          });
          const lineWidth = lineMeasure.width;
          lineMeasure.destroy();

          const baseX = -lineWidth / 2;
          const yPos = 38 + li * lineHeight;

          const coloredText = scene.add.text(baseX + xOffset, yPos, colored, {
            fontSize: '13px', fontFamily: 'Ubuntu, sans-serif',
            color: seg.color, stroke: '#000000', strokeThickness: 2,
          }).setOrigin(0, 0);

          this.panelContainer.add(coloredText);
          this.bodySegments.push(coloredText);
        }
      }
      plainOffset += seg.text.length;
    }
  }

  _drawBg(w: number, h: number) {
    if (!this.bgGraphics) return;
    this.bgGraphics.clear();
    this.bgGraphics.fillStyle(0x000000, 0.8);
    this.bgGraphics.fillRoundedRect(-w / 2, 0, w, h, 12);
    this.bgGraphics.lineStyle(2, 0xffd700, 0.6);
    this.bgGraphics.strokeRoundedRect(-w / 2, 0, w, h, 12);
  }

  _drawNextButton(hover = false, isEnd = false) {
    if (!this.nextButtonBg) return;
    this.nextButtonBg.clear();
    const color = isEnd ? (hover ? 0x33aa33 : 0x228822) : (hover ? 0x3366bb : 0x224488);
    this.nextButtonBg.fillStyle(color, 0.9);
    this.nextButtonBg.fillRoundedRect(-60, -16, 120, 32, 8);
    const borderColor = isEnd ? 0x44ff44 : 0x4488ff;
    const pulse = 0.8 + Math.sin(this.pulseTimer * 3) * 0.2;
    this.nextButtonBg.lineStyle(2, borderColor, pulse);
    this.nextButtonBg.strokeRoundedRect(-60, -16, 120, 32, 8);
  }

  start() {
    if (this.active) return;
    this.active = true;
    this.gameIsPlaying = true;
    this.panel = 0;
    this.hasSwung = false;
    this.isDead = false;
    this.lastCardPickNumber = 0;
    this.shownUpgradePanel = false;
    if (this.container) {
      this.container.setVisible(true);
      this.container.setAlpha(1);
    }
    console.log('[Tutorial] Started, panel 0');
    this.showPanel(0);
    try { sessionStorage.setItem('swordbattle:tutorialSession', JSON.stringify({ panel: 0, active: true })); } catch (e) {}
  }

  showPanel(panelId: number) {
    this.panel = panelId;
    if (!this.bodyText || !this.progressText || !this.nextButton || !this.nextButtonText) return;

    const { width } = this.game.scale;
    const panelW = 460;
    const centerX = width / (2 * this.scale);

    const targetY = (panelId === 3) ? 180 : 10;
    if (this.panelContainer) {
      const currentY = this.panelContainer.y;
      this.panelContainer.x = centerX;
      if (currentY !== targetY && this.hud.scene) {
        this.hud.scene.tweens.add({
          targets: this.panelContainer,
          y: targetY,
          duration: 400,
          ease: 'Power2',
        });
      } else {
        this.panelContainer.y = targetY;
      }
    }

    this.progressText.setText('');
    this.nextButton.setVisible(false);

    if (this.isDead) {
      this._renderColoredBody('You were destroyed. Respawn to try again!');
      this._drawBg(panelW, 75);
      return;
    }

    let body = '';
    let showNext = false;
    let isEnd = false;

    switch (panelId) {
      case 0: {
        if (this.isMobile) {
          body = 'Welcome to Swordbattle.io! This guide will show you the basics.\n\nUse the {y}joystick{/y} to move. {y}Tap{/y} anywhere to swing your sword. Press the {y}Throw{/y} button for a ranged attack!\n\nTry swinging your sword now!';
        } else {
          body = 'Welcome to Swordbattle.io! This guide will show you the basics.\n\nUse {y}WASD{/y} to move. Swing your sword with {y}Left Click{/y} or {y}Spacebar{/y}, and aim with your mouse. Press {y}Right Click{/y}, {y}C{/y} or {y}E{/y} to throw your sword!\n\nTry swinging your sword now!';
        }
        showNext = this.hasSwung;
        break;
      }
      case 1: {
        if (!this.shownUpgradePanel) {
          body = 'You\'ve spawned in the Safezone. {y}Move left{/y}, past the water, to reach the {y}Grass{/y} biome!\n\nCollect coins to get stronger! Coins spawn on the ground, but you can {y}break nearby chests{/y} or {y}hunt down mobs{/y} for WAY more!';
        } else {
          body = 'Keep collecting coins! Remember: bigger chests drop more coins, but take longer to break. Also be careful when fighting mobs, some fight back!';
        }
        break;
      }
      case 2: {
        body = 'You\'ve unlocked your first {y}upgrade{/y}! Select 1 of the 3 cards to improve a stat and specialize your build.\n\nEvery 5th upgrade, you\'ll get a {y}Major upgrade{/y} that gives you unique powers!';
        this.progressText.setText('Choose an upgrade to proceed');
        break;
      }
      case 3: {
        body = 'You\'ve unlocked {y}Evolutions{/y}! Choose one above to change your build, each has unique stats!\n\nEvolutions come with an activated ability for a powerful boost!';
        showNext = true;
        break;
      }
      case 4: {
        body = 'Your shield is now fading! Other players can now duel you. Keep picking upgrades and creating a strong build!\n\nWhen fighting, make sure to time your hits and use your throw when far away, but you can always {y}stay back{/y} if you don\'t want to fight! The choice is yours!';
        showNext = true;
        break;
      }
      case 5: {
        body = 'Tutorial complete! {y}Collect upgrades{/y} and {y}try new evolutions{/y} to become the strongest. Survive as long as you can!\n\n{c}Happy Battling!{/c}';
        isEnd = true;
        break;
      }
    }

    this._renderColoredBody(body);
    const textHeight = this.bodyText!.height;
    let panelH = 48 + textHeight + 10;

    if (panelId === 1 || panelId === 2) {
      panelH += 22;
      this.progressText.setPosition(0, 42 + textHeight);
    }

    if (showNext || isEnd) {
      panelH += 38;
      this.nextButton.setVisible(true);
      this.nextButton.setPosition(panelW / 2 - 70, 63 + textHeight + (panelId === 1 || panelId === 2 ? 28 : 8));
      this.nextButtonText.setText(isEnd ? 'Start Playing!' : 'Next \u2192');
      this._drawNextButton(false, isEnd);
    }

    this._drawBg(panelW, panelH);
    try { sessionStorage.setItem('swordbattle:tutorialSession', JSON.stringify({ panel: panelId, active: true })); } catch (e) {}
  }

  advancePanel() {
    if (this.panel >= 5) {
      this.endTutorial();
      return;
    }

    if (this.panel === 3) {
      this.game.gameState.tutorialPanel = 4;
    }

    this.panel++;
    this.showPanel(this.panel);
  }

  endTutorial() {
    this.active = false;
    this.panel = -1;
    this._clearBodySegments();
    this.container?.setVisible(false);
    this.game.gameState.tutorialComplete = true;
    try {
      localStorage.setItem('swordbattle:tutorialComplete', 'true');
      sessionStorage.removeItem('swordbattle:tutorialSession');
    } catch (e) {}
  }

  onDeath() {
    this.isDead = true;
    if (this.active) this.showPanel(this.panel);
  }

  onRespawn() {
    this.isDead = false;
    if (this.active) {
      this.panel = 0;
      this.hasSwung = false;
      this.shownUpgradePanel = false;
      this.lastCardPickNumber = 0;
      this.showPanel(0);
    }
  }

  setShow(show: boolean, force?: boolean) {
    if (this.active) {
      if (this.container) { this.container.setAlpha(1); this.container.setVisible(true); }
      return;
    }
    super.setShow(show, force);
  }

  resize() {
    if (this.active) this.showPanel(this.panel);
  }

  update(dt: number) {
    if (!this.active && this.container) {
      const player = this.game.gameState.self.entity;
      const isReady = this.game.gameState.isReady;
      if (player && isReady && (player as any).following && (player as any).isTutorial) {
        let tutorialDone = false;
        try { tutorialDone = localStorage.getItem('swordbattle:tutorialComplete') === 'true'; } catch (e) {}
        if (!tutorialDone) {
          this.start();
        }
      }
    }

    if (!this.active || !this.container) return;
    this.pulseTimer += dt / 1000;

    const player = this.game.gameState.self.entity;
    if (!player) return;

    if (this.nextButton?.visible) {
      this._drawNextButton(false, this.panel === 5);
    }

    if (this.isDead) return;

    if (this.panel === 0) {
      if (!this.hasSwung && player.swordSwingProgress > 0) {
        this.hasSwung = true;
        this.showPanel(0);
      }
      const biome = (player as any).biome;
      if (biome !== undefined && biome !== BiomeTypes.Safezone && biome !== 0) {
        this.advancePanel();
      }
    }

    if (this.panel === 1 && this.progressText) {
      const coins = player.coins || 0;
      const remaining = Math.max(0, 1000 - coins);
      if (remaining > 0) {
        this.progressText.setText(`Collect ${remaining} more coins to proceed`);
      } else {
        this.panel = 2;
        this.showPanel(2);
      }

      const choosingCard = (player as any).choosingCard;
      if (choosingCard && !this.shownUpgradePanel) {
        this.shownUpgradePanel = true;
        this.panel = 2;
        this.showPanel(2);
      }
    }

    if (this.panel === 2) {
      const pickNum = (player as any).cardPickNumber || 0;
      if (pickNum > this.lastCardPickNumber) {
        this.lastCardPickNumber = pickNum;
        this.shownUpgradePanel = true;
        const possEvols = (player as any).possibleEvolutions;
        if (possEvols && Object.keys(possEvols).length > 0) {
          this.panel = 3;
          this.showPanel(3);
        } else {
          this.panel = 1;
          this.showPanel(1);
        }
      }
    }

    if (this.panel === 1 && this.shownUpgradePanel) {
      const possEvols = (player as any).possibleEvolutions;
      if (possEvols && Object.keys(possEvols).length > 0) {
        this.panel = 3;
        this.showPanel(3);
      }
    }

    if (this.panel === 3) {
      const evolution = player.evolution;
      if (evolution && evolution !== 0) {
        this.advancePanel();
      }
    }
  }
}

export default TutorialOverlay;
