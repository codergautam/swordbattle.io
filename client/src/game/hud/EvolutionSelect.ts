import HudComponent from './HudComponent';
import { Evolutions } from '../Evolutions';
import { config } from '../../config';
import { threadId } from 'worker_threads';

const discoveredKey = 'swordbattle:discoveredEvolutions';

function getDiscoveredEvolutions(): Set<string> {
  try {
    const raw = localStorage.getItem(discoveredKey);
    if (raw) return new Set(JSON.parse(raw));
  } catch (e) {}
  return new Set();
}

function markEvolutionDiscovered(evolId: string): void {
  const discovered = getDiscoveredEvolutions();
  discovered.add(evolId);
  try {
    localStorage.setItem(discoveredKey, JSON.stringify([...discovered]));
  } catch (e) {}
}

class EvolutionSelect extends HudComponent {
  spritesContainer: Phaser.GameObjects.Container | null = null;
  hideButton: Phaser.GameObjects.Text | null = null;
  leftArrow: Phaser.GameObjects.Text | null = null;
  rightArrow: Phaser.GameObjects.Text | null = null;
  backdrop: Phaser.GameObjects.Graphics | null = null;
  spriteSize = 80;
  indent = 50;
  minimized = false;
  updateList = false;

  initialize() {
    if (!this.hud.scene) return;

    const arrowStyle = { fontSize: 16, fontStyle: 'bold', stroke: '#000000', strokeThickness: 4 };
    this.leftArrow = this.hud.scene.add.text(0, -170, '\u25BC', arrowStyle).setOrigin(0.5).setVisible(false);
    this.rightArrow = this.hud.scene.add.text(0, -170, '\u25BC', arrowStyle).setOrigin(0.5).setVisible(false);

    this.hideButton = this.hud.scene.add.text(0, -170, 'Evolutions', {
      fontSize: 22,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 5,
    }).setOrigin(0.5).setVisible(false)
      .setInteractive()
      .on('pointerover', () => {
        const shift = this.minimized ? -3 : 3;
        if (this.leftArrow) this.game.add.tween({ targets: this.leftArrow, y: this.leftArrow.y + shift, duration: 100 });
        if (this.rightArrow) this.game.add.tween({ targets: this.rightArrow, y: this.rightArrow.y + shift, duration: 100 });
      })
      .on('pointerout', () => {
        this.updateArrows();
      })
      .on('pointerdown', () => this.toggleMinimize());

    this.updateArrows();

    this.spritesContainer = this.hud.scene.add.container(0, -85);

    if (this.game.isMobile) {
      this.backdrop = this.hud.scene.add.graphics();
      this.backdrop.setVisible(false);
    }

    const children: Phaser.GameObjects.GameObject[] = [];
    if (this.backdrop) children.push(this.backdrop);
    children.push(this.spritesContainer, this.leftArrow!, this.rightArrow!, this.hideButton!);
    this.container = this.hud.scene.add.container(0, 0, children);
    this.container.setDepth(50);
    this.hud.add(this.container);
  }

  updateArrows() {
    if (!this.hideButton || !this.leftArrow || !this.rightArrow) return;
    const arrow = this.minimized ? '\u25B2' : '\u25BC';
    this.leftArrow.setText(arrow);
    this.rightArrow.setText(arrow);
    const btnY = this.hideButton.y;
    const halfW = this.hideButton.width / 2;
    this.leftArrow.setPosition(-halfW - 14, btnY);
    this.rightArrow.setPosition(halfW + 14, btnY);
  }

  resize() {
    if (!this.container) return;
    this.container.x = this.game.scale.width / 2;
    this.container.y = 200 * this.scale;

    if (this.backdrop) {
      const w = this.game.scale.width;
      const padY = 30;
      const bw = Math.min(w * 0.9, 800);
      const bh = 230;
      this.backdrop.clear();
      this.backdrop.fillStyle(0x000000, 0.5);
      this.backdrop.fillRoundedRect(-bw / 2, -200 - padY, bw, bh + padY, 16);
      this.backdrop.setInteractive(
        new Phaser.Geom.Rectangle(-bw / 2, -200 - padY, bw, bh + padY),
        Phaser.Geom.Rectangle.Contains,
      );
    }
  }

  toggleMinimize() {
    this.minimized = !this.minimized;
    this.updateArrows();

    this.hud.scene!.tweens.add({
      targets: this.spritesContainer,
      alpha: this.minimized ? 0 : 1,
      y: this.minimized ? -140 : -85,
      duration: 250,
    });

    // Fade backdrop with the collapse/expand
    if (this.backdrop) {
      this.hud.scene!.tweens.add({
        targets: this.backdrop,
        alpha: this.minimized ? 0 : 1,
        duration: 250,
      });
    }
  }

  selectEvolution(type: any) {
    markEvolutionDiscovered(String(type));
    this.game.gameState.selectedEvolution = type;
    this.game.gameState.self.entity!.possibleEvolutions = {};
    this.updateList = true;
    // this.game.input.setDefaultCursor(config.cursorUrl || 'default');
  }

  update() {
    const player = this.game.gameState.self.entity;
    if (!this.container || !this.spritesContainer || !player) return;

  if (player.coins === 0) {
    this.container.setVisible(false);
    this.hideButton?.setVisible(false);
    this.leftArrow?.setVisible(false);
    this.rightArrow?.setVisible(false);
    this.minimized = false;
    return;
  }

  if (!this.container.visible) {
    this.minimized = false;
    this.spritesContainer.alpha = 1;
    this.spritesContainer.y = -85;
  }

    if (this.updateList) {
      this.spritesContainer?.removeAll(true);

      const alpha = 0.8;
      if(!player.possibleEvolutions) return;
      const count = Object.keys(player.possibleEvolutions).length;
      // this.container.setVisible(count !== 0);
      // this.hideButton?.setVisible(count !== 0);
      // Smooth visibility
      if(!this.container || !this.hideButton) return;
      if(count === 0 && this.container.visible) {
        this.hud.scene!.tweens.add({
          targets: this.container,
          alpha: 0,
          duration: 1000,
          onComplete: () => this.container?.setVisible(false),
        });
      } else if(count !== 0 && this.container && (!this.container.visible || this.container.alpha < 1)) {
        this.container?.setVisible(true);
        this.container?.setAlpha(0);
        this.hud.scene!.tweens.add({
          targets: this.container,
          alpha: 1,
          duration: 1000,
          onComplete: () => {
            this.container?.setAlpha(1);
            this.container?.setVisible(true);
          }
        });
      }

      if (this.backdrop) {
        this.backdrop.setVisible(count !== 0);
        this.backdrop.setAlpha(this.minimized ? 0 : 1);
      }
      if (this.game.isMobile) {
        this.game.events.emit('evolutionsVisible', count !== 0);
      }

      const labelTargets = [this.hideButton, this.leftArrow, this.rightArrow].filter(Boolean);
      if(count === 0 && this.hideButton?.visible) {
        this.hud.scene!.tweens.add({
          targets: labelTargets,
          alpha: 0,
          duration: 1000,
          onComplete: () => labelTargets.forEach(t => t?.setVisible(false)),
        });
      } else if(count !== 0 && this.hideButton && (!this.hideButton.visible || this.hideButton.alpha < 1)) {
        labelTargets.forEach(t => { t?.setVisible(true); t?.setAlpha(0); });
        this.hud.scene!.tweens.add({
          targets: labelTargets,
          alpha: 1,
          duration: 1000,
          onComplete: () => {
            labelTargets.forEach(t => { t?.setAlpha(1); t?.setVisible(true); });
            this.updateArrows();
          }
        });
      }

      const discovered = getDiscoveredEvolutions();
      let i = 0;
      for (const evol in player.possibleEvolutions) {
        i += 1;
        const evolution = Evolutions[evol];
        const body = this.hud.scene.add.sprite(0, 0, this.game.gameState.self.entity!.skinName+'Body').setOrigin(0.5, 0.5);
        if (this.game.gameState.self.entity!.skin === 459) {
          body.setScale(1.25);
        }
        const overlay = this.hud.scene.add.sprite(0, 0, evolution[1]).setOrigin(evolution[3][0], evolution[3][1]);
        overlay.setScale(body.width / overlay.width * evolution[2])

        const container = this.hud.scene.add.container((this.spriteSize + 110) * (i - (count + 1) / 2), -25, [body, overlay]);
        container.setScale(this.spriteSize / body.height).setAlpha(alpha);

        if (!discovered.has(String(evol))) {
          const newBadge = this.hud.scene!.add.text(100, -body.height / 2 - 10, 'NEW', {
            fontSize: 48,
            fontStyle: 'bold',
            color: '#f7d060',
            stroke: '#000000',
            strokeThickness: 6,
          }).setOrigin(0.5);
          container.add(newBadge);
          this.hud.scene!.tweens.add({
            targets: newBadge,
            scaleX: 1.15,
            scaleY: 1.15,
            duration: 600,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
          });
        }

        const text = this.hud.scene!.add.text(0, 0, evolution[0], {
          fontSize: 45,
          fontStyle: 'bold',
          stroke: '#000000',
          strokeThickness: 6,
        }).setAlpha(alpha);

        const desc = this.hud.scene!.add.text(0, 0, evolution[4], {
          fontSize: 37,
          fontStyle: 'bold',
          stroke: '#000000',
          strokeThickness: 5,
        }).setAlpha(alpha);
        
        const abil = this.hud.scene!.add.text(0, 0, `Ability: ${evolution[5]}`, {
          fontSize: 37,
          fontStyle: 'bold',
          stroke: '#000000',
          strokeThickness: 5,
        }).setAlpha(alpha);

        body.setInteractive()
          .on('pointerover', () => {
            // this.game.input.setDefaultCursor('pointer');
            container.setAlpha(1);
            text.setAlpha(1);
            desc.setAlpha(1);
            abil.setAlpha(1);
          })
          .on('pointerout', () => {
            // this.game.input.setDefaultCursor(config.cursorUrl || 'default');
            container.setAlpha(alpha);
            text.setAlpha(alpha);
            desc.setAlpha(alpha);
            abil.setAlpha(alpha);
          })
          .on('pointerdown', () => this.selectEvolution(evol));

        container.add(text);
        container.add(desc);
        container.add(abil);
        Phaser.Display.Align.In.BottomCenter(text, body, 0, 60);
        Phaser.Display.Align.In.Center(desc, body, 0, 220);
        Phaser.Display.Align.In.BottomCenter(abil, body, 0, 145);
        this.spritesContainer.add(container);
      }
      this.updateList = false;
    }
  }
}

export default EvolutionSelect;
