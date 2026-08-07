import cosmetics from '../game/cosmetics.json';
import profileThemes from '../game/profileThemes.json';
import bannerManifest from '../game/banners.json';
import fontManifest from '../game/fonts.json';
import { withAssetVersion } from '../assetVersion';

export interface ProfileTheme {
  banner: string;
  scrim: string;
  scrimTop: number;
  scrimBottom: number;
  frame: string;
  outline: string;
  bg: string;
  panel: string;
  panelAlt: string;
  statValue: string;
  head: string;
  showThemeLabel: boolean;
  themeLabel: string;
  text: string;
  muted: string;
  accent: string;
  accentText: string;
  chart: string;
  classicGraph: boolean;
  darkGraphGrid: boolean;
  font: string;
  googleFont: boolean;
  fontWeight: string;
  plainStatColors: boolean;
  textShadows: boolean;
  panelShadows: boolean;
}

export interface ThemeMeta {
  name: string;
  displayName: string;
  id: number;
  buyable?: boolean;
  price?: number;
  description?: string;
}

export const themeSliders: { key: 'scrimTop' | 'scrimBottom'; label: string; help: string; min: number; max: number; step: number }[] = [
  { key: 'scrimTop', label: 'Fade Top', help: 'Fade opacity at the top of the banner', min: 0, max: 1, step: 0.01 },
  { key: 'scrimBottom', label: 'Fade Bottom', help: 'Fade opacity at the bottom of the banner', min: 0, max: 1, step: 0.01 },
];

export const themeFields: { key: keyof ProfileTheme; label: string; help: string }[] = [
  { key: 'frame', label: 'Outline', help: 'Colored border around the whole profile' },
  { key: 'outline', label: 'Inner Outline', help: 'Border on cards, tables and buttons' },
  { key: 'bg', label: 'Background', help: 'Profile background behind everything' },
  { key: 'head', label: 'Banner Background', help: 'Banner area color, and the whole banner when no image is set' },
  { key: 'panel', label: 'Panel', help: 'Stat tiles, bio and table body' },
  { key: 'panelAlt', label: 'Panel Alt', help: 'Alternating table rows and the stat card label strip' },
  { key: 'statValue', label: 'Stat Number BG', help: 'Background behind the big number on stat cards' },
  { key: 'text', label: 'Text', help: 'Main text color' },
  { key: 'muted', label: 'Muted Text', help: 'Labels and secondary text' },
  { key: 'accent', label: 'Accent', help: 'Active buttons and clan tag' },
  { key: 'accentText', label: 'Accent Text', help: 'Text sitting on the accent color' },
];

export const bannerBasePath = 'assets/game/banners/';

export const banners = ((bannerManifest as any).banners || []) as { file: string; displayName: string; hash?: string }[];

export const defaultTheme: ProfileTheme = {
  banner: '',
  scrim: '#141a26',
  scrimTop: 0.22,
  scrimBottom: 0.45,
  frame: '#6dffa0',
  outline: '#000000',
  bg: '#181818',
  panel: '#202024',
  panelAlt: '#1c1c20',
  statValue: '#202024',
  head: '#202024',
  showThemeLabel: true,
  themeLabel: '#cfd3da',
  text: '#e7e7ec',
  muted: '#9a9aa2',
  accent: '#f5c542',
  accentText: '#161616',
  chart: '#5bb8ff',
  classicGraph: false,
  darkGraphGrid: false,
  font: '',
  googleFont: false,
  fontWeight: '700',
  plainStatColors: false,
  textShadows: true,
  panelShadows: false,
};

export const fontBasePath = 'assets/fonts/';

export const customFonts = ((fontManifest as any).fonts || []) as {
  file: string;
  family: string;
  format: string;
  hash: string;
}[];

function injectCustomFontFaces() {
  if (typeof document === 'undefined' || !customFonts.length) return;
  if (document.getElementById('pf-custom-fonts')) return;
  const style = document.createElement('style');
  style.id = 'pf-custom-fonts';
  style.textContent = customFonts
    .map(
      (f) =>
        `@font-face{font-family:'${f.family}';src:url('${fontBasePath}${encodeURIComponent(f.file)}?v=${f.hash}') format('${f.format}');font-weight:100 900;font-style:normal;font-display:swap;}`,
    )
    .join('\n');
  document.head.appendChild(style);
}

injectCustomFontFaces();

export const systemFonts = [
  'Arial',
  'Helvetica',
  'Georgia',
  'Verdana',
  'Tahoma',
  'Trebuchet MS',
  'Times New Roman',
  'Courier New',
  'Impact',
  'Comic Sans MS',
];

export const fontSuggestions = [
  ...customFonts.map((f) => f.family),
  'Saira',
  'Arial',
  'Roboto',
  'Inter',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Poppins',
  'Nunito',
  'Rubik',
  'Oswald',
  'Raleway',
  'Quicksand',
  'Bebas Neue',
  'Press Start 2P',
  'Georgia',
  'Verdana',
  'Courier New',
];

export function isSystemFont(family: string) {
  const f = (family || '').trim().toLowerCase();
  if (!f || f === 'saira') return true;
  if (systemFonts.some((s) => s.toLowerCase() === f)) return true;
  return customFonts.some((c) => c.family.toLowerCase() === f);
}

const requestedFonts = new Set<string>();

export function loadGoogleFont(family: string) {
  const name = (family || '').trim();
  if (!name || requestedFonts.has(name) || typeof document === 'undefined') return;
  requestedFonts.add(name);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href =
    'https://fonts.googleapis.com/css2?family=' +
    encodeURIComponent(name).replace(/%20/g, '+') +
    ':wght@300;400;500;600;700;800&display=swap';
  document.head.appendChild(link);
}

export const themeMetas = Object.values(((cosmetics as any).themes || {}) as Record<string, ThemeMeta>);
const themePresets = profileThemes as Record<string, Partial<ProfileTheme>>;

export function nextThemeId() {
  return themeMetas.reduce((max, t) => Math.max(max, t.id || 0), 0) + 1;
}

export function bannerUrl(file?: string) {
  const name = file || defaultTheme.banner;
  if (!name) return '';
  const url = bannerBasePath + name;
  const hash = banners.find((b) => b.file === name)?.hash;
  return hash ? `${url}?v=${hash}` : withAssetVersion(url);
}

export function bannerDisplayName(file?: string) {
  return banners.find((b) => b.file === file)?.displayName || file || '';
}

export function getThemeMeta(id?: number) {
  return themeMetas.find((t) => t.id === id);
}

export function resolveProfileTheme(id?: number): ProfileTheme {
  const meta = getThemeMeta(id);
  const preset = meta ? themePresets[meta.name] : undefined;
  return { ...defaultTheme, ...(preset || {}) };
}

export function themeCssVars(theme: ProfileTheme): Record<string, string> {
  return {
    '--pf-scrim': `linear-gradient(180deg, ${hexToRgba(theme.scrim, theme.scrimTop)}, ${hexToRgba(theme.scrim, theme.scrimBottom)})`,
    '--pf-font': theme.font ? `'${theme.font}', 'Saira', sans-serif` : `'Saira', sans-serif`,
    '--pf-font-weight': theme.fontWeight || '700',
    '--pf-text-shadow': theme.textShadows ? '0 2px 4px rgba(0, 0, 0, 0.7)' : 'none',
    '--pf-text-shadow-sm': theme.textShadows ? '0 1px 3px rgba(0, 0, 0, 0.6)' : 'none',
    '--pf-panel-shadow': theme.panelShadows
      ? '0 1px 3px rgba(0, 0, 0, 0.09), 0 6px 16px rgba(0, 0, 0, 0.07)'
      : 'none',
    '--pf-frame': theme.frame,
    '--pf-outline': theme.outline,
    '--pf-bg': theme.bg,
    '--pf-panel': theme.panel,
    '--pf-panel-alt': theme.panelAlt,
    '--pf-stat-value': theme.statValue,
    '--pf-head': theme.head,
    '--pf-theme-label': theme.themeLabel,
    '--pf-text': theme.text,
    '--pf-muted': theme.muted,
    '--pf-accent': theme.accent,
    '--pf-accent-text': theme.accentText,
    '--pf-chart': theme.chart,
  };
}

export function hexToRgba(hex: string, alpha: number) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec((hex || '').trim());
  if (!m) return hex;
  return `rgba(${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}, ${alpha})`;
}
