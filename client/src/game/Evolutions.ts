import { EvolutionTypes } from './Types';

// Type: [name, texture, textureScale, textureOrigin, description]
export const Evolutions: Record<any, [string, string, number, [number, number], string]> = {
  [EvolutionTypes.Tank]: ['Tank', 'tankOverlay', 1, [0.5, 0.55], 'Large & defensive'],
  [EvolutionTypes.Berserker]: ['Berserker', 'berserkerOverlay', 1.18, [0.47, 0.6], 'Strong & fast'],
  [EvolutionTypes.Vampire]: ['Vampire', 'vampireOverlay', 1.09, [0.5, 0.53], 'Gains HP from attacks'],
  [EvolutionTypes.Knight]: ['Knight', 'knightOverlay', 1.09, [0.5, 0.53], 'Quick & agile'],
  [EvolutionTypes.Samurai]: ['Samurai', 'samuraiOverlay', 1.09, [0.5, 0.53], 'Swift & powerful'],
  [EvolutionTypes.Rook]: ['Rook', 'rookOverlay', 1.09, [0.5, 0.53], 'Use ability to dash'],
  [EvolutionTypes.Stalker]: ['Stalker', 'stalkerOverlay', 1.09, [0.5, 0.53], 'Can become invisible'],
  [EvolutionTypes.Warrior]: ['Warrior', 'warriorOverlay', 1.09, [0.5, 0.53], 'Large, fast, unstoppable'],
  [EvolutionTypes.Lumberjack]: ['Lumberjack', 'lumberjackOverlay', 1.09, [0.5, 0.53], 'Breaks chests with ease'],
  [EvolutionTypes.Defender]: ['Defender', 'defenderOverlay', 1.4535, [0.5, 0.53], 'Near-unkillable defense'],
  [EvolutionTypes.Fighter]: ['Fighter', 'fighterOverlay', 1.2717, [0.5, 0.53], 'Great for fast-paced combat'],
  [EvolutionTypes.Fisherman]: ['Fisherman', 'fishermanOverlay', 1.09, [0.5, 0.53], 'Swordthrows pull in enemies'],
  [EvolutionTypes.Archer]: ['Archer', 'archerOverlay', 1.09, [0.49, 0.5], 'Swordthrows have more power'],
  [EvolutionTypes.Sniper]: ['Sniper', 'sniperOverlay', 1.4535, [0.5, 0.53], 'Sees & throws farther'],
  [EvolutionTypes.SuperArcher]: ['Super Archer', 'superArcherOverlay', 1.09, [0.49, 0.5], 'Farther swordthrows = more damage'],
  [EvolutionTypes.Rammer]: ['Rammer', 'rammerOverlay', 1.09, [0.5, 0.53], 'Swordthrows bring you along'],
  [EvolutionTypes.Juggernaut]: ['Juggernaut', 'juggernautOverlay', 1.09, [0.5, 0.53], 'Very powerful but no ability'],
};
