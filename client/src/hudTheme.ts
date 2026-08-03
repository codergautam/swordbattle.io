export interface HudTheme {
  bg: number; bgAlpha: number;
  border: number; borderW: number; borderAlpha: number;
  outer: number; outerW: number; outerAlpha: number;
  radius: number;
  accent: string;
}

export const theme: HudTheme = {
  bg: 0x181818, bgAlpha: 0.7,
  border: 0x53e08a, borderW: 2, borderAlpha: 1,
  outer: 0x000000, outerW: 2, outerAlpha: 1,
  radius: 10,
  accent: '#6dffa0',
};

export function getTheme(): HudTheme { return theme; }

function rgba(n: number, a: number): string {
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return `rgba(${r},${g},${b},${a})`;
}

export function applyHudThemeCss() {
  if (typeof document === 'undefined') return;
  const t = theme;
  const s = document.documentElement.style;
  s.setProperty('--ui-panel-bg', rgba(t.bg, t.bgAlpha));
  s.setProperty('--ui-panel-border', t.borderW > 0 ? rgba(t.border, t.borderAlpha) : 'transparent');
  s.setProperty('--ui-panel-border-w', `${t.borderW}px`);
  s.setProperty('--ui-panel-outer', t.outerW > 0 ? rgba(t.outer, t.outerAlpha) : 'transparent');
  s.setProperty('--ui-panel-outer-w', `${t.outerW}px`);
  s.setProperty('--ui-panel-radius', `${t.radius}px`);
  s.setProperty('--ui-accent', t.accent);
}
