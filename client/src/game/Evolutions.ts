import { EvolutionTypes } from './Types';

// Type: [name, texture, textureScale, textureOrigin]
export const Evolutions: Record<any, [string, string, number, [number, number]]> = {
  [EvolutionTypes.Tank]: ['Tank', 'tankOverlay', 1, [0.5, 0.55]],
  [EvolutionTypes.Berserker]: ['Berserker', 'berserkerOverlay', 1.18, [0.47, 0.6]],
};
