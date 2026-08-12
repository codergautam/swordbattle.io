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

export const clanColor = '#ffe000';
export const clanTagColors: Record<string, string> = {
  APC: '#ff0000',
};

export function resolveClanColor(tag?: string): string {
  if (!tag) return clanColor;
  const normalized = String(tag || '').toUpperCase().trim();
  return clanTagColors[normalized] || clanColor;
}

export const clanStyleGame: NameStyle = { fill: clanColor, outline: '#000000' };
export const adSupporterStyleGame: NameStyle = { fill: clanColor, outline: '#000000' };
export const adSupporterStyleLeaderboard: NameStyle = { fill: clanColor };

export const presetLoggedOut: { leaderboard: NameStyle; game: NameStyle } = {
  leaderboard: { fill: '#6800c2', outline: '#000000', shadow: '#9f00ff' },
  game: { fill: { type: 'linear', angle: 180, stops: [{ color: '#9f00e4', pos: 0 }, { color: '#310064', pos: 1 }] }, outline: '#000000', shadow: '#ff00ff' },
};
export const presetLoggedIn: { leaderboard: NameStyle; game: NameStyle } = {
  leaderboard: { fill: '#0088ff' },
  game: { fill: '#5b8cff', outline: '#000000' },
};

export type NameContext = 'game' | 'leaderboard';

export interface RegistryEntry {
  leaderboard?: NameStyle;
  game?: NameStyle;
}

export const nameRegistry: Record<string, RegistryEntry> = {
  'amethyst nightveil': {
    leaderboard: { fill: '#6800c2', outline: '#000000', shadow: '#9f00ff' },
    game: { fill: { type: 'linear', angle: 180, stops: [{ color: '#9f00e4', pos: 0 }, { color: '#310064', pos: 1 }] }, outline: '#000000', shadow: '#ff00ff' },
  },
  'skillz': {
    leaderboard: { fill: { type: 'linear', angle: 180, stops: [{ color: '#000000', pos: 0 }, { color: '#0000ff', pos: 1 }] }, shadow: { type: 'linear', angle: 180, stops: [{ color: '#000000', pos: 0 }, { color: '#0000ff', pos: 1 }] } },
    game: { fill: '#000000', outline: { type: 'linear', angle: 180, stops: [{ color: '#000000', pos: 0 }, { color: '#0000ff', pos: 1 }] }, shadow: { type: 'linear', angle: 180, stops: [{ color: '#000000', pos: 0 }, { color: '#0000ff', pos: 1 }] } },
  },
  'wasdblade': {
    leaderboard: { fill: { type: 'linear', angle: 90, stops: [{ color: '#ff0000', pos: 0 }, { color: '#ff8002', pos: 1 }] }, outline: { type: 'linear', angle: 180, stops: [{ color: '#6e0009', pos: 0 }, { color: '#ee3700', pos: 1 }] }, outlineWidth: 'medium', shadow: { type: 'linear', angle: 180, stops: [{ color: '#ff6a00', pos: 0 }, { color: '#ffab00', pos: 1 }] } },
    game: { fill: { type: 'linear', angle: 90, stops: [{ color: '#ff0000', pos: 0 }, { color: '#ff8c00', pos: 1 }] }, outline: '#00090c', outlineWidth: 'medium', shadow: { type: 'linear', angle: 180, stops: [{ color: '#ffa500', pos: 0 }, { color: '#ff0000', pos: 1 }] } },
  },
  'angel': {
    leaderboard: { fill: { type: 'linear', angle: 135, stops: [{ color: '#03ecfc', pos: 0 }, { color: '#005157', pos: 1 }] }, outline: { type: 'linear', angle: 135, stops: [{ color: '#0033ff', pos: 0 }, { color: '#001361', pos: 1 }] }, shadow: { type: 'linear', angle: 135, stops: [{ color: '#000000', pos: 0 }, { color: '#000000', pos: 1 }] } },
    game: { fill: { type: 'linear', angle: 135, stops: [{ color: '#03ecfc', pos: 0 }, { color: '#005157', pos: 1 }] }, outline: { type: 'linear', angle: 180, stops: [{ color: '#0033ff', pos: 0 }, { color: '#001361', pos: 1 }] }, shadow: { type: 'linear', angle: 135, stops: [{ color: '#000000', pos: 0 }, { color: '#000000', pos: 1 }] } },
  },
  'cool guy 53': {
    leaderboard: { fill: '#00d2ff', outline: { type: 'linear', angle: 180, stops: [{ color: '#000000', pos: 0 }, { color: '#574ddd', pos: 1 }] }, outlineWidth: 'medium' },
    game: { fill: '#5b8cff', outline: { type: 'linear', angle: 180, stops: [{ color: '#000000', pos: 0 }, { color: '#574ddd', pos: 1 }] } },
  },
  'codergautam': {
    leaderboard: { fill: '#ff0000', outline: { type: 'linear', angle: 180, stops: [{ color: '#000000', pos: 0 }, { color: '#ee0000', pos: 1 }] }, outlineWidth: 'medium' },
    game: { fill: '#ff0000', outline: { type: 'linear', angle: 180, stops: [{ color: '#000000', pos: 0 }, { color: '#ee0000', pos: 1 }] }, outlineWidth: 'medium' },
  },
  'update testing accou': {
    leaderboard: { fill: '#00ff00', outline: { type: 'linear', angle: 180, stops: [{ color: '#000000', pos: 0 }, { color: '#00bd00', pos: 1 }] }, outlineWidth: 'medium' },
    game: { fill: '#00ff00', outline: { type: 'linear', angle: 180, stops: [{ color: '#000000', pos: 0 }, { color: '#00bd00', pos: 1 }] }, outlineWidth: 'medium' },
  },
  'awes0me': {
    leaderboard: { fill: '#ffff00', outline: { type: 'linear', angle: 180, stops: [{ color: '#000000', pos: 0 }, { color: '#acac00', pos: 1 }] }, outlineWidth: 'medium' },
    game: { fill: '#ffff00', outline: { type: 'linear', angle: 180, stops: [{ color: '#000000', pos: 0 }, { color: '#acac00', pos: 1 }] }, outlineWidth: 'medium' },
  },
};

export function resolveNameStyle(
  name: string,
  hasAccount: boolean,
  context: NameContext,
  adSupporter?: boolean,
): NameStyle | null {
  const lower = (name || '').toLowerCase();
  const special = nameRegistry[lower];
  if (special) return special[context] || special.leaderboard || special.game || null;
  if (adSupporter && hasAccount) {
    return context === 'leaderboard' ? adSupporterStyleLeaderboard : adSupporterStyleGame;
  }
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
