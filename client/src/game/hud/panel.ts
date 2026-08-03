import { getTheme } from '../../hudTheme';

export interface PanelOpts {
  radius?: number;
  bg?: number;
  bgAlpha?: number;
  borderW?: number;
  outerW?: number;
}

export function drawPanel(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number, w: number, h: number,
  opts: PanelOpts = {},
) {
  const t = getTheme();
  const r = opts.radius ?? t.radius;
  const yw = opts.borderW ?? t.borderW;
  const bw = opts.outerW ?? t.outerW;
  const bg = opts.bg ?? t.bg;
  const bgA = opts.bgAlpha ?? t.bgAlpha;

  g.fillStyle(bg, bgA);
  g.fillRoundedRect(x, y, w, h, r);

  if (yw > 0) {
    g.lineStyle(yw, t.border, t.borderAlpha);
    g.strokeRoundedRect(x - yw / 2, y - yw / 2, w + yw, h + yw, r + yw / 2);
  }
  if (bw > 0) {
    g.lineStyle(bw, t.outer, t.outerAlpha);
    g.strokeRoundedRect(x - yw - bw / 2, y - yw - bw / 2, w + yw * 2 + bw, h + yw * 2 + bw, r + yw + bw / 2);
  }
}
