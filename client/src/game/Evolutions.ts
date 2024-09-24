import { EvolutionTypes } from "./Types";

// Type: [name, texture, textureScale, textureOrigin]
export const Evolutions: Record<
  any,
  [string, string, number, [number, number]]
> = {
  [EvolutionTypes.Tank]: ["Tank", "tankOverlay", 1, [0.5, 0.55]],
  [EvolutionTypes.Berserker]: [
    "Berserker",
    "berserkerOverlay",
    1.18,
    [0.47, 0.6],
  ],
  [EvolutionTypes.Vampire]: ["Vampire", "vampireOverlay", 1.09, [0.5, 0.53]],
  [EvolutionTypes.Knight]: ["Knight", "knightOverlay", 1.09, [0.5, 0.53]],
  [EvolutionTypes.Samurai]: ["Samurai", "samuraiOverlay", 1.09, [0.5, 0.53]],
  [EvolutionTypes.Rook]: ["Rook", "rookOverlay", 1.09, [0.5, 0.53]],
  [EvolutionTypes.Stalker]: ["Stalker", "stalkerOverlay", 1.09, [0.5, 0.53]],
  [EvolutionTypes.Warrior]: ["Warrior", "warriorOverlay", 1.09, [0.5, 0.53]],
  [EvolutionTypes.Fisherman]: ["Fisherman", "fishermanOverlay", 1, [0.5, 0.53]],
};
