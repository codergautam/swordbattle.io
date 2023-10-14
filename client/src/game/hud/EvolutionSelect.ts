import { Evolutions } from '../Evolutions';
import Game from '../scenes/Game';
import HUD from './HUD';

class EvolutionSelect {
  hud: HUD;
  game: Game;
  container: Phaser.GameObjects.Container | null = null;
  spritesContainer: Phaser.GameObjects.Container | null = null;
  hideButton: Phaser.GameObjects.Text | null = null;
  spriteSize = 150;
  indent = 50;
  hidden = false;
  updateList = false;

  constructor(hud: HUD) {
    this.hud = hud;
    this.game = hud.game;
  }

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
      .on('pointerdown', () => this.toggle());

    this.spritesContainer = this.hud.scene.add.container(0, 0);
    this.container = this.hud.scene.add.container(0, 0, [this.spritesContainer, this.hideButton]);
    this.hud.add(this.container);
  }

  resize() {
    if (!this.container) return;
    this.container.x = this.game.scale.width / 2;
    this.container.y = 200;
  }

  toggle() {
    this.hidden = !this.hidden;

    this.hud.scene!.tweens.add({
      targets: this.spritesContainer,
      alpha: this.hidden ? 0 : 1,
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

      const alpha = 0.7;
      const count = Object.keys(player.possibleEvolutions).length;
      this.container.setVisible(count !== 0);

      let i = 0;
      for (const evol in player.possibleEvolutions) {
        i += 1;
        const evolution = Evolutions[evol];
        const sprite = this.hud.scene!.add.sprite((this.spriteSize + 50) * (i - (count + 1) / 2), 0, evolution[1])
          .setOrigin(0.5, 0.75);

        const text = this.hud.scene!.add.text(0, 0, evolution[0], {
          fontSize: 30,
          fontStyle: 'bold',
          stroke: '#000000',
          strokeThickness: 6,
        }).setAlpha(alpha);

        sprite.setScale(this.spriteSize / sprite.height)
          .setAlpha(alpha)
          .setInteractive()
          .on('pointerover', () => {
            this.game.input.setDefaultCursor('pointer');
            sprite.setAlpha(1);
            text.setAlpha(1);
          })
          .on('pointerout', () => {
            this.game.input.setDefaultCursor('default');
            sprite.setAlpha(alpha);
            text.setAlpha(alpha);
          })
          .on('pointerdown', () => this.selectEvolution(evol));

        Phaser.Display.Align.In.Center(text, sprite, 0, -70);
        this.spritesContainer.add([sprite, text]);
      }
      this.updateList = false;
    }
  }
}

export default EvolutionSelect;
