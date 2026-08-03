export interface GradientStop {
  color: string;
  pos: number;
}

export interface GradientSpec {
  type: 'linear';
  angle: number;
  stops: GradientStop[];
}

export type ColorValue = string | GradientSpec;

export type OutlineWidth = 'thin' | 'medium' | 'thick';

export interface NameStyle {
  fill: ColorValue;
  outline?: ColorValue | null;
  outlineWidth?: OutlineWidth;
  shadow?: ColorValue | null;
}

const outlineFrac: Record<OutlineWidth, number> = { thin: 0.12, medium: 0.2, thick: 0.3 };
export function outlineWidthPx(tier: OutlineWidth | undefined, fontSize: number): number {
  return outlineFrac[tier || 'thin'] * fontSize;
}

export function isGradient(c: ColorValue | null | undefined): c is GradientSpec {
  return !!c && typeof c === 'object' && (c as GradientSpec).type === 'linear';
}

export function gradientUnitVector(angle: number): { x1: number; y1: number; x2: number; y2: number } {
  const rad = (angle * Math.PI) / 180;
  const dx = Math.sin(rad);
  const dy = -Math.cos(rad);
  return { x1: 0.5 - dx / 2, y1: 0.5 - dy / 2, x2: 0.5 + dx / 2, y2: 0.5 + dy / 2 };
}

export function gradientCoordsPx(angle: number, w: number, h: number): { x1: number; y1: number; x2: number; y2: number } {
  const v = gradientUnitVector(angle);
  return { x1: v.x1 * w, y1: v.y1 * h, x2: v.x2 * w, y2: v.y2 * h };
}

export function firstColor(c: ColorValue | null | undefined, fallback = '#ffffff'): string {
  if (!c) return fallback;
  if (typeof c === 'string') return c;
  const sorted = [...c.stops].sort((a, b) => a.pos - b.pos);
  return sorted.length ? sorted[0].color : fallback;
}

export function gradientToCss(g: GradientSpec): string {
  const stops = [...g.stops]
    .sort((a, b) => a.pos - b.pos)
    .map((s) => `${s.color} ${Math.round(s.pos * 1000) / 10}%`)
    .join(', ');
  return `linear-gradient(${g.angle}deg, ${stops})`;
}

export function colorToCssBackground(c: ColorValue): string {
  if (isGradient(c)) return gradientToCss(c);
  return `linear-gradient(0deg, ${c}, ${c})`;
}

const pixiGradientVertical = 0;
const pixiGradientHorizontal = 1;

export function applyCanvasFill(style: any, fill: ColorValue): void {
  if (!isGradient(fill)) {
    style.fill = fill;
    style.fillGradientStops = undefined;
    return;
  }
  const sorted = [...fill.stops].sort((a, b) => a.pos - b.pos);
  let colors = sorted.map((s) => s.color);
  let positions = sorted.map((s) => s.pos);

  const a = ((fill.angle % 360) + 360) % 360;
  const horizontal = (a > 45 && a < 135) || (a > 225 && a < 315);
  const reverse = horizontal ? a > 180 : (a < 90 || a > 270);
  if (reverse) {
    colors = colors.reverse();
    positions = positions.map((p) => 1 - p).reverse();
  }

  style.fill = colors;
  style.fillGradientStops = positions;
  style.fillGradientType = horizontal ? pixiGradientHorizontal : pixiGradientVertical;
}

export const defaultNameStyle: NameStyle = { fill: '#ffffff', outline: '#000000' };
export const accountNameStyle: NameStyle = { fill: '#5b8cff', outline: '#000000' };
export const leaderboardAccountStyle: NameStyle = { fill: '#0088ff' };

export const CLAN_COLOR = '#ffe000';
export const clanStyleGame: NameStyle = { fill: CLAN_COLOR, outline: '#000000' };

export const PRESET_LOGGED_OUT = {
  leaderboard: { fill: '#ffffff' } as NameStyle,
  game: { fill: '#ffffff', outline: '#000000' } as NameStyle,
};
export const PRESET_LOGGED_IN = {
  leaderboard: { fill: '#0088ff' } as NameStyle,
  game: { fill: '#5b8cff', outline: '#000000' } as NameStyle,
};

export type NameContext = 'game' | 'leaderboard';

export interface RegistryEntry {
  leaderboard?: NameStyle;
  game?: NameStyle;
}

export const NAME_REGISTRY: Record<string, RegistryEntry> = {
  // codergautam: { leaderboard: { fill: '#ff0000', shadow: '#ff000077' }, game: { fill: '#ff0000' } },
  // angel: { leaderboard: { fill: '#acfffc', shadow: '#00ccffaa' }, game: { fill: '#acfffc' } },
  // 'cool guy 53': { leaderboard: { fill: '#00bbff', shadow: '#0088ff77' }, game: { fill: '#00bbff' } },
  // 'update testing account': { leaderboard: { fill: '#00ff00', shadow: '#00ff0077' }, game: { fill: '#00ff00' } },
  // 'amethyst nightveil': { leaderboard: { fill: '#b066ff' }, game: { fill: '#7802ab' } },
  // oy: { leaderboard: { fill: '#000000', shadow: '#ffffff' }, game: { fill: '#000000', shadow: '#ffffff' } },
  // bobz: { leaderboard: { fill: '#000000', shadow: '#ffffff' }, game: { fill: '#000000', shadow: '#ffffff', outline: '#ff0000' } },
};

export function resolveNameStyle(
  name: string,
  hasAccount: boolean,
  context: NameContext,
): NameStyle | null {
  const lower = (name || '').toLowerCase();
  const special = NAME_REGISTRY[lower];
  if (special) return special[context] || special.leaderboard || special.game || null;
  if (context === 'leaderboard') return hasAccount ? leaderboardAccountStyle : null;
  return hasAccount ? accountNameStyle : defaultNameStyle;
}

function colorToCode(c: ColorValue): string {
  if (typeof c === 'string') return `'${c}'`;
  const stops = c.stops.map((s) => `{ color: '${s.color}', pos: ${s.pos} }`).join(', ');
  return `{ type: 'linear', angle: ${c.angle}, stops: [${stops}] }`;
}

export function nameStyleToCode(ns: NameStyle): string {
  const parts = [`fill: ${colorToCode(ns.fill)}`];
  if (ns.outline) {
    parts.push(`outline: ${colorToCode(ns.outline)}`);
    if (ns.outlineWidth && ns.outlineWidth !== 'thin') parts.push(`outlineWidth: '${ns.outlineWidth}'`);
  }
  if (ns.shadow) parts.push(`shadow: ${colorToCode(ns.shadow)}`);
  return `{ ${parts.join(', ')} }`;
}

export function registryEntryToCode(name: string, leaderboard: NameStyle, game: NameStyle): string {
  const key = (name || 'name').toLowerCase().replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  return `'${key}': {\n  leaderboard: ${nameStyleToCode(leaderboard)},\n  game: ${nameStyleToCode(game)},\n},`;
}
