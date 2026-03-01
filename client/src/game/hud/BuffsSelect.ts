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
  leftArrow: Phaser.GameObjects.Text | null = null;
  rightArrow: Phaser.GameObjects.Text | null = null;
  lastButtonText = '';
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

    const arrowStyle = { fontSize: 16, fontStyle: 'bold', stroke: '#000000', strokeThickness: 4 };
    this.leftArrow = this.hud.scene.add.text(0, 10, '\u25BC', arrowStyle).setOrigin(0.5, 0);
    this.rightArrow = this.hud.scene.add.text(0, 10, '\u25BC', arrowStyle).setOrigin(0.5, 0);

    this.hideButton = this.hud.scene.add.text(20, 10, '', {
      fontSize: 22,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0)
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

    this.buffsContainer = this.hud.scene.add.container(-this.width, 40).setAlpha(0);
    this.container = this.hud.scene.add.container(10, 10, [this.buffsContainer, this.leftArrow, this.rightArrow, this.hideButton]);
  }

  updateArrows() {
    if (!this.hideButton || !this.leftArrow || !this.rightArrow) return;
    const arrow = this.minimized ? '\u25B2' : '\u25BC';
    this.leftArrow.setText(arrow);
    this.rightArrow.setText(arrow);
    const btnX = this.hideButton.x;
    const btnY = this.hideButton.y + 3;
    const btnW = this.hideButton.width;
    this.leftArrow.setPosition(btnX - 10, btnY);
    this.rightArrow.setPosition(btnX + btnW + 10, btnY);
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
    this.updateArrows();

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

    const buttonText = `Upgrades ${player.upgradePoints > 0 ? `(x${player.upgradePoints})` : ''}`;
    if (this.hideButton!.text !== buttonText) {
      this.hideButton!.text = buttonText;
      this.lastButtonText = buttonText;
      this.updateArrows();
    }

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
