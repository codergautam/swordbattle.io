import { EvolutionTypes } from './Types';

export const Evolutions: Record<any, [string, string]> = {
  [EvolutionTypes.Tank]: ['Tank', 'tankSkin'],
  [EvolutionTypes.Berserker]: ['Berserker', 'berserkerSkin'],
};
