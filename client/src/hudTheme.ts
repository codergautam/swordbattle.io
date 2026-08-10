import cosmetics from './game/cosmetics.json';
import hudThemes from './game/hudThemes.json';

export interface HudThemePreset {
  bg: string;
  bgAlpha: number;
  headerBg: string;
  headerAlpha: number;
  borderEnabled: boolean;
  border: string;
  borderW: number;
  borderAlpha: number;
  outerEnabled: boolean;
  outer: string;
  outerW: number;
  outerAlpha: number;
  radius: number;
  accent: string;
  text: string;
  muted: string;
  textOutline: string;
  textOutlineW: number;
  backdropBlur: number;
}

export interface HudTheme {
  bg: number;
  bgAlpha: number;
  headerBg: string;
  headerAlpha: number;
  borderEnabled: boolean;
  border: number;
  borderW: number;
  borderAlpha: number;
  outerEnabled: boolean;
  outer: number;
  outerW: number;
  outerAlpha: number;
  radius: number;
  accent: string;
  text: string;
  muted: string;
  textOutline: string;
  textOutlineW: number;
  backdropBlur: number;
}

export interface HudThemeMeta {
  name: string;
  displayName: string;
  id: number;
  buyable?: boolean;
  price?: number;
  description?: string;
}

export const defaultHudThemePreset: HudThemePreset = {
  bg: '#181818',
  bgAlpha: 0.7,
  headerBg: '#000000',
  headerAlpha: 0.25,
  borderEnabled: true,
  border: '#53e08a',
  borderW: 2,
  borderAlpha: 1,
  outerEnabled: true,
  outer: '#000000',
  outerW: 2,
  outerAlpha: 1,
  radius: 10,
  accent: '#6dffa0',
  text: '#ffffff',
  muted: '#c9c9cf',
  textOutline: '#000000',
  textOutlineW: 3,
  backdropBlur: 0,
};

const presetMap = hudThemes as Record<string, Partial<HudThemePreset>>;
const configuredMetas = Object.values(((cosmetics as any).hudThemes || {}) as Record<string, HudThemeMeta>);
const fallbackMeta: HudThemeMeta = {
  name: 'default',
  displayName: 'Default',
  id: 1,
  buyable: false,
  price: 0,
  description: 'The default HUD theme',
};

export const hudThemeMetas = configuredMetas.length ? configuredMetas : [fallbackMeta];

function clamp(value: unknown, min: number, max: number, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

function normalizeHex(value: unknown, fallback: string) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `#${Math.max(0, Math.min(0xffffff, Math.round(value))).toString(16).padStart(6, '0')}`;
  }
  const raw = String(value || '').trim().toLowerCase();
  const short = /^#([0-9a-f]{3})$/.exec(raw);
  if (short) return `#${short[1].split('').map((c) => c + c).join('')}`;
  return /^#[0-9a-f]{6}$/.test(raw) ? raw : fallback;
}

export function normalizeHudThemePreset(value: Partial<HudThemePreset> | Record<string, unknown> = {}): HudThemePreset {
  const source = value as Record<string, unknown>;
  return {
    bg: normalizeHex(source.bg, defaultHudThemePreset.bg),
    bgAlpha: clamp(source.bgAlpha, 0, 1, defaultHudThemePreset.bgAlpha),
    headerBg: normalizeHex(source.headerBg, defaultHudThemePreset.headerBg),
    headerAlpha: clamp(source.headerAlpha, 0, 1, defaultHudThemePreset.headerAlpha),
    borderEnabled: source.borderEnabled === undefined ? defaultHudThemePreset.borderEnabled : !!source.borderEnabled,
    border: normalizeHex(source.border, defaultHudThemePreset.border),
    borderW: clamp(source.borderW, 0, 12, defaultHudThemePreset.borderW),
    borderAlpha: clamp(source.borderAlpha, 0, 1, defaultHudThemePreset.borderAlpha),
    outerEnabled: source.outerEnabled === undefined ? defaultHudThemePreset.outerEnabled : !!source.outerEnabled,
    outer: normalizeHex(source.outer, defaultHudThemePreset.outer),
    outerW: clamp(source.outerW, 0, 12, defaultHudThemePreset.outerW),
    outerAlpha: clamp(source.outerAlpha, 0, 1, defaultHudThemePreset.outerAlpha),
    radius: clamp(source.radius, 0, 40, defaultHudThemePreset.radius),
    accent: normalizeHex(source.accent, defaultHudThemePreset.accent),
    text: normalizeHex(source.text, defaultHudThemePreset.text),
    muted: normalizeHex(source.muted, defaultHudThemePreset.muted),
    textOutline: normalizeHex(source.textOutline, defaultHudThemePreset.textOutline),
    textOutlineW: clamp(source.textOutlineW, 0, 12, defaultHudThemePreset.textOutlineW),
    backdropBlur: clamp(source.backdropBlur, 0, 30, defaultHudThemePreset.backdropBlur),
  };
}

function hexToNumber(hex: string) {
  return parseInt(hex.slice(1), 16);
}

function toRuntimeTheme(preset: HudThemePreset): HudTheme {
  return {
    bg: hexToNumber(preset.bg),
    bgAlpha: preset.bgAlpha,
    headerBg: preset.headerBg,
    headerAlpha: preset.headerAlpha,
    borderEnabled: preset.borderEnabled,
    border: hexToNumber(preset.border),
    borderW: preset.borderEnabled ? preset.borderW : 0,
    borderAlpha: preset.borderAlpha,
    outerEnabled: preset.outerEnabled,
    outer: hexToNumber(preset.outer),
    outerW: preset.outerEnabled ? preset.outerW : 0,
    outerAlpha: preset.outerAlpha,
    radius: preset.radius,
    accent: preset.accent,
    text: preset.text,
    muted: preset.muted,
    textOutline: preset.textOutline,
    textOutlineW: preset.textOutlineW,
    backdropBlur: preset.backdropBlur,
  };
}

export function getHudThemeMeta(id?: number) {
  return hudThemeMetas.find((meta) => meta.id === id);
}

export function nextHudThemeId() {
  return hudThemeMetas.reduce((max, meta) => Math.max(max, meta.id || 0), 0) + 1;
}

export function resolveHudThemePreset(id?: number): HudThemePreset {
  const meta = getHudThemeMeta(id) || fallbackMeta;
  return normalizeHudThemePreset({ ...defaultHudThemePreset, ...(presetMap[meta.name] || presetMap.default || {}) });
}

export function resolveHudTheme(id?: number): HudTheme {
  return toRuntimeTheme(resolveHudThemePreset(id));
}

let activePreset = resolveHudThemePreset(1);

export const theme: HudTheme = toRuntimeTheme(activePreset);

export function getTheme(): HudTheme {
  return theme;
}

export function getHudThemePreset(): HudThemePreset {
  return { ...activePreset };
}

function rgba(value: number, alpha: number) {
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

function hexRgba(hex: string, alpha: number) {
  return rgba(hexToNumber(hex), alpha);
}

export function applyHudThemeCss(runtimeTheme: HudTheme = theme) {
  if (typeof document === 'undefined') return;
  const style = document.documentElement.style;
  style.setProperty('--ui-panel-bg', rgba(runtimeTheme.bg, runtimeTheme.bgAlpha));
  style.setProperty('--ui-header-bg', hexRgba(runtimeTheme.headerBg, runtimeTheme.headerAlpha));
  style.setProperty('--ui-panel-border', runtimeTheme.borderW > 0 ? rgba(runtimeTheme.border, runtimeTheme.borderAlpha) : 'transparent');
  style.setProperty('--ui-panel-border-w', `${runtimeTheme.borderW}px`);
  style.setProperty('--ui-panel-outer', runtimeTheme.outerW > 0 ? rgba(runtimeTheme.outer, runtimeTheme.outerAlpha) : 'transparent');
  style.setProperty('--ui-panel-outer-w', `${runtimeTheme.outerW}px`);
  style.setProperty('--ui-panel-radius', `${runtimeTheme.radius}px`);
  style.setProperty('--ui-accent', runtimeTheme.accent);
  style.setProperty('--ui-text', runtimeTheme.text);
  style.setProperty('--ui-muted', runtimeTheme.muted);
  style.setProperty('--ui-text-outline', runtimeTheme.textOutline);
  style.setProperty('--ui-text-outline-w', `${runtimeTheme.textOutlineW}px`);
  style.setProperty('--ui-backdrop-filter', runtimeTheme.backdropBlur > 0 ? `blur(${runtimeTheme.backdropBlur}px)` : 'none');
}

let eventFrame: number | null = null;

function emitThemeChanged() {
  if (typeof window === 'undefined') return;
  if (eventFrame !== null) return;
  const emit = () => {
    eventFrame = null;
    window.dispatchEvent(new CustomEvent('hudThemeChanged', {
      detail: { theme: getTheme(), preset: getHudThemePreset() },
    }));
  };
  if (typeof window.requestAnimationFrame === 'function') {
    eventFrame = window.requestAnimationFrame(emit);
  } else {
    eventFrame = window.setTimeout(emit, 0);
  }
}

export function setHudTheme(value: Partial<HudThemePreset> | Record<string, unknown>) {
  activePreset = normalizeHudThemePreset({ ...defaultHudThemePreset, ...value });
  Object.assign(theme, toRuntimeTheme(activePreset));
  applyHudThemeCss();
  emitThemeChanged();
  return getTheme();
}

export function setHudThemeById(id?: number) {
  return setHudTheme(resolveHudThemePreset(id));
}
