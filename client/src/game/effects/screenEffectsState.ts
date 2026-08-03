export interface ScreenEffectsState {
  enabled: boolean;

  tintColor: string;
  tintAmount: number;

  vignetteColor: string;
  vignette: number;
  vignetteSize: number;

  heat: number;
  snow: number;
  rain: number;
  wind: number;
  water: number;
  darkness: number;
}

export const defaultEffects: ScreenEffectsState = {
  enabled: true,
  tintColor: '#ff7a3c',
  tintAmount: 0,
  vignetteColor: '#000000',
  vignette: 0,
  vignetteSize: 0.5,
  heat: 0,
  snow: 0,
  rain: 0,
  wind: 0,
  water: 0,
  darkness: 0,
};

export const screenEffectsState: ScreenEffectsState = { ...defaultEffects };

export const screenEffectsRuntime = { scrollX: 0, scrollY: 0, blind: 0 };

type Listener = (s: ScreenEffectsState) => void;
const listeners = new Set<Listener>();

export function updateEffects(patch: Partial<ScreenEffectsState>) {
  Object.assign(screenEffectsState, patch);
  for (const l of listeners) l(screenEffectsState);
}

export function resetEffects() {
  updateEffects({ ...defaultEffects });
}

export function onEffectsChange(l: Listener): () => void {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

export function hexToRgb01(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [0, 0, 0];
  const n = parseInt(m[1], 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
