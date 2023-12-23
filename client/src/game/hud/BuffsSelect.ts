import HudComponent from './HudComponent';
import { BuffTypes } from '../Types';
const buffsData: Record<any, [string, number]> = {
  [BuffTypes.Speed]: ['Speed', 0x6d92ec],
  [BuffTypes.Health]: ['Health', 0xed68ec],
  [BuffTypes.Regeneration]: ['Regeneration', 0xefb28c],
  [BuffTypes.Damage]: ['Damage', 0xf16868],
};

class BuffsSelect extends HudComponent {
  buffsContainer: Phaser.GameObjects.Container | null = null;
  hideButton: Phaser.GameObjects.Text | null = null;
  minimized = true;
  width = 250;
  lineHeight = 20;

  buffs: Record<any, any> = {};
  buffsProgress: Record<any, any> = {};

  constructor(hud: any) {
    super(hud);
    this.minimized = true;
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
      .on('pointerover', () => {
        this.game.add.tween({
          targets: this.hideButton,
          scaleX: 1.1,
          scaleY: 1.1,
          duration: 100,
        });
      })
      .on('pointerout', () => {
        this.game.add.tween({
          targets: this.hideButton,
          scaleX: 1,
          scaleY: 1,
          duration: 100,
        });
      })
      .on('pointerdown', () => this.toggleMinimize());

    this.buffsContainer = this.hud.scene.add.container(-this.width, 40).setAlpha(0);
    this.container = this.hud.scene.add.container(10, 10, [this.buffsContainer, this.hideButton]);
  }

  get height() {
    // Calculate height of the buffs and everything else
    let height = 0;
    if(!this.minimized) {
    height = (this.lineHeight+5) * Object.keys(this.game.gameState.self.entity!.buffs).length * this.scale;
  }
    return height + 10 + this.hideButton!.displayHeight;
  }

  toggleMinimize() {
    this.minimized = !this.minimized;

    this.hud.scene!.tweens.add({
      targets: this.buffsContainer,
      alpha: this.minimized ? 0 : 1,
      x: this.minimized ? -this.width : 0,
      duration: 250,
    });
  }

  resize() {
  }

  selectBuff(type: any) {
    this.game.gameState.selectedBuff = type;
    if(this.game.gameState?.self?.entity?.upgradePoints === 1 && !this.minimized) {
      setTimeout(() => {
      this.toggleMinimize();
      }, 500);
    }
  }

  update() {
    const player = this.game.gameState.self.entity;
    const scene = this.hud.scene!;
    if (!this.container || !this.buffsContainer || !player) return;

    this.hideButton!.text = `Upgrades ${player.upgradePoints > 0 ? `(x${player.upgradePoints})` : ''}`;

    let i = 0;
    for (const [type, buff] of Object.entries(player.buffs) as any) {
      const step = this.width / buff.max;
      if (!this.buffs[type]) {
        const config = buffsData[type];
        if (!config) continue;
        const buffContainer = scene.add.container(0, i * (this.lineHeight + 10))
          .setInteractive(new Phaser.Geom.Rectangle(0, 0, this.width, this.lineHeight), Phaser.Geom.Rectangle.Contains)
          .on('pointerover', () => {
            this.game.add.tween({
              targets: buffContainer,
              scaleX: 1.1,
              scaleY: 1.1,
              duration: 100,
            });
          })
          .on('pointerout', () => {
            this.game.add.tween({
              targets: buffContainer,
              scaleX: 1,
              scaleY: 1,
              duration: 100,
            });
          })
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
