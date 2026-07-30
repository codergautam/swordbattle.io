import { BiomeTypes } from '../Types';
import { hexToRgb01 } from './screenEffectsState';

export interface BiomeFx {
  snow: number;
  rain: number;
  wind: number;
  heat: number;
  water: number;
  tint: [number, number, number];
  tintAmount: number;
  vignette: [number, number, number];
  vignetteStrength: number;
  vignetteSize: number;
}

interface Spec {
  snow?: number; rain?: number; heat?: number; water?: number;
  tint?: string; tintAmount?: number;
  vignetteColor?: string; vignette?: number; vignetteSize?: number;
}

function build(s: Spec): BiomeFx {
  return {
    snow: s.snow || 0,
    rain: s.rain || 0,
    wind: 0,
    heat: s.heat || 0,
    water: s.water || 0,
    tint: s.tint ? hexToRgb01(s.tint) : [0, 0, 0],
    tintAmount: s.tintAmount || 0,
    vignette: s.vignetteColor ? hexToRgb01(s.vignetteColor) : [0, 0, 0],
    vignetteStrength: s.vignette || 0,
    vignetteSize: s.vignetteSize ?? 0.5,
  };
}

const zero = build({});

const biomeFx: Partial<Record<number, BiomeFx>> = {
  [BiomeTypes.Ice]: build({ snow: 0.7, tint: '#bfe2ff', tintAmount: 0.12, vignetteColor: '#16263a', vignette: 0.30 }),
  [BiomeTypes.Fire]: build({ heat: 0.45, tint: '#ff5a2c', tintAmount: 0.12, vignetteColor: '#2a0000', vignette: 0.50 }),
  [BiomeTypes.Desert]: build({ heat: 0.55, tint: '#ffb46b', tintAmount: 0.16, vignetteColor: '#3a1e00', vignette: 0.26 }),
  [BiomeTypes.Oasis]: build({ heat: 0.28, tint: '#ffd9a0', tintAmount: 0.12, vignetteColor: '#243018', vignette: 0.22 }),
  [BiomeTypes.Dirt]: build({ tint: '#5a4a32', tintAmount: 0.13, vignetteColor: '#160f06', vignette: 0.40 }),
  [BiomeTypes.Earth]: build({ tint: '#aef0a0', tintAmount: 0.07, vignetteColor: '#102a0e', vignette: 0.22 }),
  [BiomeTypes.Meadow]: build({ tint: '#c8f0b0', tintAmount: 0.08, vignetteColor: '#163516', vignette: 0.22 }),
  [BiomeTypes.Savanna]: build({ heat: 0.14, tint: '#ffd27a', tintAmount: 0.11, vignetteColor: '#2a2008', vignette: 0.24 }),
  [BiomeTypes.Alpine]: build({ tint: '#cfe2f0', tintAmount: 0.09, vignetteColor: '#1a2630', vignette: 0.26 }),
  [BiomeTypes.Rocks]: build({ tint: '#aab0b8', tintAmount: 0.09, vignetteColor: '#14181c', vignette: 0.32 }),
};

export function biomeTarget(biome: number | undefined): BiomeFx {
  return (biome !== undefined && biomeFx[biome]) || zero;
}

export const biomeFxRuntime: BiomeFx = build({});

const enterDelay = 1000;
const fadeMs = 1700;

function hasEffect(biome: number | undefined): boolean {
  return biome !== undefined && !!biomeFx[biome];
}

let displayBiome: number | undefined = undefined;
let intensity = 0;
let dwell = 0;
let lastBiome: number | undefined = -1;

export function resetBiomeEffects() {
  dwell = 0; lastBiome = undefined; displayBiome = undefined; intensity = 0;
  const r = biomeFxRuntime;
  r.snow = 0; r.rain = 0; r.heat = 0; r.water = 0; r.wind = 0;
  r.tintAmount = 0; r.vignetteStrength = 0;
  r.tint[0] = 0; r.tint[1] = 0; r.tint[2] = 0;
  r.vignette[0] = 0; r.vignette[1] = 0; r.vignette[2] = 0;
}

export function updateBiomeEffects(biome: number | undefined, dt: number) {
  if (biome !== lastBiome) { dwell = 0; lastBiome = biome; }
  else dwell += dt;

  const want = (dwell >= enterDelay && hasEffect(biome)) ? biome : undefined;

  if (want !== undefined && want === displayBiome) {
    intensity = Math.min(1, intensity + dt / fadeMs);
  } else {
    intensity = Math.max(0, intensity - dt / fadeMs);
    if (intensity <= 0.0001) displayBiome = want;
  }

  const fx = biomeTarget(displayBiome);
  const r = biomeFxRuntime;
  r.snow = fx.snow * intensity;
  r.rain = fx.rain * intensity;
  r.heat = fx.heat * intensity;
  r.water = fx.water * intensity;
  r.tintAmount = fx.tintAmount * intensity;
  r.vignetteStrength = fx.vignetteStrength * intensity;
  r.vignetteSize = fx.vignetteSize;
  r.tint[0] = fx.tint[0]; r.tint[1] = fx.tint[1]; r.tint[2] = fx.tint[2];
  r.vignette[0] = fx.vignette[0]; r.vignette[1] = fx.vignette[1]; r.vignette[2] = fx.vignette[2];
}

export function isBiomeFxActive(): boolean {
  const r = biomeFxRuntime;
  return r.snow > 0.001 || r.rain > 0.001 || r.heat > 0.001 || r.water > 0.001
    || r.tintAmount > 0.001 || r.vignetteStrength > 0.001;
}
