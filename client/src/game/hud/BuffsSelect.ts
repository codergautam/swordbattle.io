import { BuffTypes } from '../Types';
import Game from '../scenes/Game';
import HUD from './HUD';

const buffsData: Record<any, [string, number]> = {
  [BuffTypes.Speed]: ['Speed', 0x6d92ec],
  [BuffTypes.Size]: ['Size', 0x99ec68],
  [BuffTypes.Health]: ['Health', 0xed68ec],
  [BuffTypes.Regeneration]: ['Regeneration', 0xefb28c],
  [BuffTypes.Damage]: ['Damage', 0xf16868],
};

class BuffsSelect {
  hud: HUD;
  game: Game;
  container: Phaser.GameObjects.Container | null = null;
  buffsContainer: Phaser.GameObjects.Container | null = null;
  hideButton: Phaser.GameObjects.Text | null = null;
  hidden = false;
  width = 250;
  lineHeight = 20;

  buffs: Record<any, any> = {};
  buffsProgress: Record<any, any> = {};

  constructor(hud: HUD) {
    this.hud = hud;
    this.game = hud.game;
  }

  initialize() {
    if (!this.hud.scene) return;

    this.hideButton = this.hud.scene.add.text(10, 10, '', {
      fontSize: 22,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0)
      .setInteractive()
      .on('pointerover', () => this.game.input.setDefaultCursor('pointer'))
      .on('pointerout', () => this.game.input.setDefaultCursor('default'))
      .on('pointerdown', () => this.toggle());

    this.buffsContainer = this.hud.scene.add.container(0, 40);
    this.container = this.hud.scene.add.container(10, 10, [this.buffsContainer, this.hideButton]);
  }

  toggle() {
    this.hidden = !this.hidden;

    this.hud.scene!.tweens.add({
      targets: this.buffsContainer,
      alpha: this.hidden ? 0 : 1,
      duration: 250,
    });
  }

  resize() {
  }

  selectBuff(type: any) {
    this.game.gameState.selectedBuff = type;
  }

  update() {
    const player = this.game.gameState.self.entity;
    const scene = this.hud.scene!;
    if (!this.container || !this.buffsContainer || !player) return;

    this.hideButton!.text = `Upgrade points: ${player.upgradePoints}`;

    let i = 0;
    for (const [type, buff] of Object.entries(player.buffs) as any) {
      const step = this.width / buff.max;
      if (!this.buffs[type]) {
        const config = buffsData[type];
        const buffContainer = scene.add.container(0, i * (this.lineHeight + 10))
          .setInteractive(new Phaser.Geom.Rectangle(0, 0, this.width, this.lineHeight), Phaser.Geom.Rectangle.Contains)
          .on('pointerover', () => this.game.input.setDefaultCursor('pointer'))
          .on('pointerout', () => this.game.input.setDefaultCursor('default'))
          .on('pointerdown', () => this.selectBuff(type));
        
        // background
        const background = scene.add.graphics();
        background.fillStyle(0x111111, 0.5);
        background.fillRoundedRect(0, 0, this.width, this.lineHeight, this.lineHeight / 2);

        // progress bar
        const progress = scene.add.graphics();
        progress.fillStyle(config[1], 1);
        progress.fillRoundedRect(2, 2, this.width - 4, this.lineHeight - 4, this.lineHeight / 3);
        this.buffsProgress[type] = progress;

        // steps
        const steps = scene.add.graphics();
        steps.lineStyle(2, 0x111111);
        steps.strokeRoundedRect(0, 0, this.width, this.lineHeight, this.lineHeight / 2);
        for (let j = 1; j < buff.max; j++) {
          steps.lineBetween(step * j, 0, step * j, this.lineHeight);
        }

        // text
        const text = scene.add.text(20, 0, config[0], {
          fontFamily: 'Ubuntu, sans-serif',
          fontStyle: 'bold',
          stroke: '#000000',
          strokeThickness: 4,
          fontSize: 14,
        });

        buffContainer.add([background, progress, steps, text]);
        this.buffsContainer.add(buffContainer);
        this.buffs[type] = buffContainer;
      }

      const buffProgress = this.buffsProgress[type];
      buffProgress.scaleX = buff.level / buff.max;
      i++;
    }
  }
}

export default BuffsSelect;
