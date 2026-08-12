
import { Container, Text, TextStyle, Sprite, Texture, BlurFilter } from 'pixi.js-legacy';
import { getGameRuntime } from './gameRuntime';
import {
  NameStyle,
  GradientSpec,
  isGradient,
  applyCanvasFill,
  firstColor,
  outlineWidthPx,
  gradientCoordsPx,
} from './nameStyles';

const baseStyle = (fontSize: number): any => ({
  fontFamily: "'Saira', sans-serif",
  fontWeight: '700',
  fontSize,
  lineJoin: 'round',
});

function gradientTexture(g: GradientSpec, w: number, h: number): Texture {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.ceil(w));
  canvas.height = Math.max(1, Math.ceil(h));
  const ctx = canvas.getContext('2d')!;
  const { x1, y1, x2, y2 } = gradientCoordsPx(g.angle, canvas.width, canvas.height);
  const grad = ctx.createLinearGradient(x1, y1, x2, y2);
  for (const s of [...g.stops].sort((a, b) => a.pos - b.pos)) {
    grad.addColorStop(Math.max(0, Math.min(1, s.pos)), s.color);
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return Texture.from(canvas);
}

export function buildNameTag(text: string, style: NameStyle, fontSize: number): Container {
  const container = new Container();
  const t = text || ' ';
  const w = style.outline ? outlineWidthPx(style.outlineWidth, fontSize) : 0;
  const canvasMode = !!getGameRuntime()?.isCanvasMode;
  const gradientOutline = !!style.outline && isGradient(style.outline) && !canvasMode;

  if (style.shadow) {
    const shStyle = new TextStyle(baseStyle(fontSize));
    applyCanvasFill(shStyle as any, style.shadow);
    if (w > 0) {
      shStyle.stroke = firstColor(style.shadow);
      shStyle.strokeThickness = w;
    }
    const shText = new Text(t, shStyle);
    shText.anchor.set(0.5, 1);
    shText.filters = [new BlurFilter(Math.max(2, fontSize * 0.14))];
    try { shText.cacheAsBitmap = true; } catch (e) {}
    container.addChild(shText);
  }

  if (gradientOutline) {
    const fatMask = new Text(t, new TextStyle({ ...baseStyle(fontSize), fill: '#ffffff', stroke: '#ffffff', strokeThickness: w }));
    fatMask.anchor.set(0.5, 1);
    fatMask.renderable = false;
    fatMask.visible = false;
    try { fatMask.cacheAsBitmap = true; } catch (e) {}
    const gw = Math.ceil(fatMask.width + 4);
    const gh = Math.ceil(fatMask.height + 4);
    const grad = new Sprite(gradientTexture(style.outline as GradientSpec, gw, gh));
    grad.anchor.set(0.5, 1);
    grad.width = gw;
    grad.height = gh;
    grad.mask = fatMask;
    container.addChild(grad, fatMask);
  }

  const fillStyle = new TextStyle(baseStyle(fontSize));
  applyCanvasFill(fillStyle as any, style.fill);
  if (style.outline && !gradientOutline) {
    fillStyle.stroke = isGradient(style.outline) ? firstColor(style.outline) : style.outline as string;
    fillStyle.strokeThickness = w;
  }
  const fillText = new Text(t, fillStyle);
  fillText.anchor.set(0.5, 1);
  container.addChild(fillText);

  (container as any).textWidth = fillText.width;
  return container;
}
