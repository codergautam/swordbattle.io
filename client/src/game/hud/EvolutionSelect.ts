import HudComponent from './HudComponent';
import { Evolutions } from '../Evolutions';

class EvolutionSelect extends HudComponent {
  spritesContainer: Phaser.GameObjects.Container | null = null;
  hideButton: Phaser.GameObjects.Text | null = null;
  spriteSize = 125;
  indent = 50;
  minimized = false;
  updateList = false;

  initialize() {
    if (!this.hud.scene) return;

    this.hideButton = this.hud.scene.add.text(0, -170, 'Evolutions', {
      fontSize: 22,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 5,
    }).setOrigin(0.5)
      .setInteractive()
      .on('pointerover', () => this.game.input.setDefaultCursor('pointer'))
      .on('pointerout', () => this.game.input.setDefaultCursor('default'))
      .on('pointerdown', () => this.toggleMinimize());

    this.spritesContainer = this.hud.scene.add.container(0, -70);
    this.container = this.hud.scene.add.container(0, 0, [this.spritesContainer, this.hideButton]);
    this.hud.add(this.container);
  }

  resize() {
    if (!this.container) return;
    this.container.x = this.game.scale.width / 2;
    this.container.y = 200 * this.scale;
  }

  toggleMinimize() {
    this.minimized = !this.minimized;

    this.hud.scene!.tweens.add({
      targets: this.spritesContainer,
      alpha: this.minimized ? 0 : 1,
      duration: 250,
    });
  }

  selectEvolution(type: any) {
    this.game.gameState.selectedEvolution = type;
    this.game.gameState.self.entity!.possibleEvolutions = {};
    this.updateList = true;
    this.game.input.setDefaultCursor('default');
  }

  update() {
    const player = this.game.gameState.self.entity;
    if (!this.container || !this.spritesContainer || !player) return;

    if (this.updateList) {
      this.spritesContainer?.removeAll(true);

      const alpha = 0.8;
      const count = Object.keys(player.possibleEvolutions).length;
      this.container.setVisible(count !== 0);

      let i = 0;
      for (const evol in player.possibleEvolutions) {
        i += 1;
        const evolution = Evolutions[evol];
        const body = this.hud.scene.add.sprite(0, 0, 'player');
        const overlay = this.hud.scene.add.sprite(0, 0, evolution[1]).setOrigin(evolution[3][0], evolution[3][1]);
        overlay.setScale(body.width / overlay.width * evolution[2])

        const container = this.hud.scene.add.container((this.spriteSize + 50) * (i - (count + 1) / 2), 0, [body, overlay]);
        container.setScale(this.spriteSize / body.height).setAlpha(alpha);

        const text = this.hud.scene!.add.text(0, 0, evolution[0], {
          fontSize: 40,
          fontStyle: 'bold',
          stroke: '#000000',
          strokeThickness: 6,
        }).setAlpha(alpha);

        body.setInteractive()
          .on('pointerover', () => {
            this.game.input.setDefaultCursor('pointer');
            container.setAlpha(1);
            text.setAlpha(1);
          })
          .on('pointerout', () => {
            this.game.input.setDefaultCursor('default');
            container.setAlpha(alpha);
            text.setAlpha(alpha);
          })
          .on('pointerdown', () => this.selectEvolution(evol));

        container.add(text);
        Phaser.Display.Align.In.BottomCenter(text, body, 0, 40);
        this.spritesContainer.add(container);
      }
      this.updateList = false;
    }
  }
}

export default EvolutionSelect;
