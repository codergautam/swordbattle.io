import * as phaserlite from './phaserlite';
import { BLEND_MODES } from 'pixi.js-legacy';

export const Math = phaserlite.Math;
export const Geom = phaserlite.Geom;
export const Display = phaserlite.Display;
export const Utils = phaserlite.Utils;
export const Curves = phaserlite.Curves;
export const BlendModes = phaserlite.BlendModes;

export const blendMap: Record<number, number> = {
  [BlendModes.NORMAL]: BLEND_MODES.NORMAL,
  [BlendModes.ADD]: BLEND_MODES.ADD,
  [BlendModes.MULTIPLY]: BLEND_MODES.MULTIPLY,
  [BlendModes.SCREEN]: BLEND_MODES.SCREEN,
  [BlendModes.ERASE]: BLEND_MODES.ERASE,
};

export function toPixiBlend(phaserBlend: number | undefined | null): number {
  if (phaserBlend == null) return BLEND_MODES.NORMAL;
  const mapped = blendMap[phaserBlend];
  return mapped === undefined ? BLEND_MODES.NORMAL : mapped;
}
