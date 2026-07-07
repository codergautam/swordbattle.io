import { Text as PixiText } from 'pixi.js';
import { applyPhaserGO } from './mixin';

const PhaserTextBase = applyPhaserGO(PixiText);

function buildStyle(s: any): any {
  s = s || {};
  const out: any = {};
  out.fontFamily = s.fontFamily || "'Saira', sans-serif";
  const fs = s.fontStyle;
  if (fs === 'italic') { out.fontStyle = 'italic'; out.fontWeight = '700'; }
  else if (fs == null || fs === 'bold' || fs === '700' || fs === 'normal') { out.fontWeight = '700'; }
  else { out.fontWeight = fs; }
  if (s.fontSize != null) out.fontSize = s.fontSize;
  out.fill = s.color != null ? s.color : (s.fill != null ? s.fill : '#ffffff');
  if (s.stroke != null) out.stroke = s.stroke;
  if (s.strokeThickness != null) out.strokeThickness = s.strokeThickness;
  if (s.align != null) out.align = s.align;
  out.lineJoin = 'miter';
  if (s.lineSpacing != null) out.leading = s.lineSpacing;
  if (s.padding != null) out.padding = typeof s.padding === 'number' ? s.padding : (s.padding.x || s.padding.y || 0);
  if (s.wordWrap && s.wordWrap.width != null) {
    out.wordWrap = true;
    out.wordWrapWidth = s.wordWrap.width;
    if (s.wordWrap.useAdvancedWrap || s.wordWrap.breakWords) out.breakWords = true;
  }
  const sh = s.shadow;
  if (sh && (sh.stroke || sh.fill)) {
    out.dropShadow = true;
    out.dropShadowColor = sh.color != null ? sh.color : '#000000';
    out.dropShadowBlur = sh.blur != null ? sh.blur : 0;
    const ox = sh.offsetX || 0, oy = sh.offsetY || 0;
    out.dropShadowDistance = Math.hypot(ox, oy);
    out.dropShadowAngle = Math.atan2(oy, ox);
  }
  return out;
}

export class Text extends PhaserTextBase {
  constructor(x = 0, y = 0, text: string | string[] = '', style?: any) {
    super(Array.isArray(text) ? text.join('\n') : (text == null ? '' : String(text)), buildStyle(style));
    this.transform.position.set(x, y);
    this.anchor.set(0, 0);
    this.resolution = 1;
  }

  setOrigin(ox = 0, oy = ox): this { this.anchor.set(ox, oy); return this; }
  get originX(): number { return this.anchor.x; }
  set originX(v: number) { this.anchor.x = v; }
  get originY(): number { return this.anchor.y; }
  set originY(v: number) { this.anchor.y = v; }

  setText(t: string | number | string[]): this {
    this.text = Array.isArray(t) ? t.join('\n') : (t == null ? '' : String(t));
    return this;
  }
  setFontSize(size: number | string): this { this.style.fontSize = size as any; return this; }
  setFontFamily(family: string): this { this.style.fontFamily = family; return this; }
  setFontStyle(fontStyle: string): this {
    if (fontStyle === 'italic') this.style.fontStyle = 'italic';
    else this.style.fontWeight = fontStyle as any;
    return this;
  }
  setColor(color: string): this { this.style.fill = color; return this; }
  setFill(color: string): this { this.style.fill = color; return this; }
  setStroke(color: string, thickness: number): this {
    this.style.stroke = color; this.style.strokeThickness = thickness; return this;
  }
  setShadow(x = 0, y = 0, color = '#000000', blur = 0, _shadowStroke = false, _shadowFill = true): this {
    this.style.dropShadow = true;
    this.style.dropShadowColor = color;
    this.style.dropShadowBlur = blur;
    this.style.dropShadowDistance = Math.hypot(x, y);
    this.style.dropShadowAngle = Math.atan2(y, x);
    return this;
  }
}

function textFrameW(t: any): number { t.updateText(true); const x = t._texture; return x ? x.orig.width : 0; }
function textFrameH(t: any): number { t.updateText(true); const x = t._texture; return x ? x.orig.height : 0; }
Object.defineProperty(Text.prototype, 'width', {
  configurable: true,
  get(this: any): number { return textFrameW(this); },
  set(this: any, v: number) { const w = textFrameW(this); this.transform.scale.x = w ? v / w : 1; },
});
Object.defineProperty(Text.prototype, 'height', {
  configurable: true,
  get(this: any): number { return textFrameH(this); },
  set(this: any, v: number) { const h = textFrameH(this); this.transform.scale.y = h ? v / h : 1; },
});
