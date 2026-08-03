import * as phaserlite from './phaserlite';
import { BLEND_MODES } from 'pixi.js';

export const Math = phaserlite.Math;
export const Geom = phaserlite.Geom;
export const Display = phaserlite.Display;
export const Utils = phaserlite.Utils;
export const Curves = phaserlite.Curves;
export const BlendModes = phaserlite.BlendModes;

export const BLEND_MAP: Record<number, number> = {
  [BlendModes.NORMAL]: BLEND_MODES.NORMAL,
  [BlendModes.ADD]: BLEND_MODES.ADD,
  [BlendModes.MULTIPLY]: BLEND_MODES.MULTIPLY,
  [BlendModes.SCREEN]: BLEND_MODES.SCREEN,
  [BlendModes.ERASE]: BLEND_MODES.ERASE,
};

export function toPixiBlend(phaserBlend: number | undefined | null): number {
  if (phaserBlend == null) return BLEND_MODES.NORMAL;
  const mapped = BLEND_MAP[phaserBlend];
  return mapped === undefined ? BLEND_MODES.NORMAL : mapped;
}
